const path = require("path")
const dotenv = require("dotenv")

// Quy táº¯c Æ°u tiÃªn env:
// 1) server/.env lÃ  nguá»“n chÃ­nh.
// 2) root .env chá»‰ bá»• sung key cÃ²n thiáº¿u (khÃ´ng override key Ä‘Ã£ cÃ³).
dotenv.config({ path: path.resolve(__dirname, ".env") })
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: false })

const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const http = require("http")
const socketIo = require("socket.io")

const prisma = require("./prismaClient")
const socketService = require("./services/socketService")
const {
  initMqttTelemetry,
  shutdownMqttTelemetry,
  publishAck,
  extractSerialFromTopic,
  buildAckPayload,
  isDuplicateMessage,
  markMessageSeen,
  getMaxPayloadBytes,
} = require("./services/mqttTelemetryService")
const { ingestTelemetry } = require("./services/telemetryIngestService")

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
  },
})

// View engine
app.set("views", path.join(__dirname, "views"))
app.set("view engine", "ejs")

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))


// Endpoint wake-up để đánh thức app và database khi platform ngủ.
app.get("/api/hello", async (_req, res) => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1")
    return res.status(200).json({
      ok: true,
      message: "hello",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logServerEvent("HELLO_DB_WAKE_FAILED", {
      reason: error?.message || "UNKNOWN",
    })
    return res.status(503).json({
      ok: false,
      message: "database wake failed",
    })
  }
})
// Routes
app.use("/api/auth", require("./routes/auth"))
app.use("/api/users", require("./routes/users"))
app.use("/api/devices", require("./routes/devices"))
app.use("/api/readings", require("./routes/readings"))
app.use("/api/alerts", require("./routes/alerts"))
app.use("/api/notifications", require("./routes/notifications"))
app.use("/api/reports", require("./routes/reports"))
app.use("/api/chat", require("./routes/chat"))
app.use("/test", require("./routes/routesServer"))
app.use("/api/access", require("./routes/access"))
app.use("/api/history", require("./routes/medicalHistory"))
app.use("/api/doctor", require("./routes/doctorRoutes"))
app.use("/api/family", require("./routes/familyRoutes"))

socketService.init(io)
app.set("io", io)
app.set("socketService", socketService)

const PORT = process.env.PORT || 4000
let isShuttingDown = false

// HÃ m ghi log JSON line Ä‘á»ƒ chuáº©n hÃ³a lifecycle cá»§a server process.
const logServerEvent = (event, payload = {}) => {
  console.log(
    JSON.stringify({
      event,
      source: "server",
      timestamp: new Date().toISOString(),
      ...payload,
    })
  )
}

// HÃ m chuáº©n hÃ³a mÃ£ lá»—i ingest ná»™i bá»™ sang error_code ACK Ä‘Ã£ khÃ³a trong P3.
const toAckErrorCode = (ingestCode) => {
  const code = String(ingestCode || "").trim().toUpperCase()
  switch (code) {
    case "MISSING_SERIAL":
      return "MISSING_SERIAL"
    default:
      return "INGEST_FAILED"
  }
}

// HÃ m gá»­i ACK error náº¿u xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c serial tá»« topic theo quy táº¯c P3.
const ackErrorIfPossible = async ({ topicSerial, messageId, errorCode, message, topic }) => {
  if (!topicSerial) {
    logServerEvent("MQTT_ACK_ERROR_SKIPPED_NO_SERIAL", {
      topic,
      error_code: errorCode,
      message_id: messageId || null,
    })
    return
  }

  await publishAck(
    topicSerial,
    buildAckPayload({
      messageId,
      status: "error",
      errorCode,
      message,
    })
  )
}

// HÃ m Ä‘Ã³ng tÃ i nguyÃªn an toÃ n khi server nháº­n tÃ­n hiá»‡u thoÃ¡t.
const shutdownGracefully = async (signal) => {
  if (isShuttingDown) return
  isShuttingDown = true

  logServerEvent("SERVER_SHUTDOWN_START", { signal })

  try {
    await shutdownMqttTelemetry()
  } catch (error) {
    logServerEvent("MQTT_SHUTDOWN_ERROR", {
      reason: error?.message || "UNKNOWN",
    })
  }

  server.close(async () => {
    try {
      await prisma.$disconnect()
      logServerEvent("SERVER_SHUTDOWN_OK", { signal })
      process.exit(0)
    } catch (error) {
      logServerEvent("SERVER_SHUTDOWN_DB_ERROR", {
        reason: error?.message || "UNKNOWN",
      })
      process.exit(1)
    }
  })

  setTimeout(() => {
    logServerEvent("SERVER_SHUTDOWN_FORCE_EXIT", { signal })
    process.exit(1)
  }, 10000).unref()
}

// HÃ m xá»­ lÃ½ payload MQTT vÃ  chuyá»ƒn vÃ o ingest service dÃ¹ng chung vá»›i HTTP.
const handleMqttTelemetryMessage = async ({ topic, payloadText, payloadBuffer }) => {
  const topicSerial = extractSerialFromTopic(topic)
  const payloadSize = Number(payloadBuffer?.length || 0)
  const maxPayloadBytes = getMaxPayloadBytes()

  if (payloadSize > maxPayloadBytes) {
    logServerEvent("MQTT_PAYLOAD_TOO_LARGE", {
      topic,
      payload_size: payloadSize,
      max_payload_bytes: maxPayloadBytes,
    })
    await ackErrorIfPossible({
      topicSerial,
      messageId: null,
      errorCode: "PAYLOAD_TOO_LARGE",
      message: "Payload vuot qua gioi han cho phep",
      topic,
    })
    return
  }

  let payload
  try {
    payload = JSON.parse(payloadText || "{}")
  } catch (error) {
    logServerEvent("MQTT_MESSAGE_INVALID_JSON", {
      topic,
      reason: error?.message || "INVALID_JSON",
    })
    await ackErrorIfPossible({
      topicSerial,
      messageId: null,
      errorCode: "INVALID_JSON",
      message: "Payload JSON khong hop le",
      topic,
    })
    return
  }

  const messageId = String(payload?.message_id ?? "").trim()
  const payloadSerial = String(payload?.serial_number ?? payload?.serial ?? "").trim()

  if (!messageId) {
    logServerEvent("MQTT_MISSING_MESSAGE_ID", { topic, topic_serial: topicSerial || null })
    await ackErrorIfPossible({
      topicSerial,
      messageId: null,
      errorCode: "MISSING_MESSAGE_ID",
      message: "message_id la bat buoc",
      topic,
    })
    return
  }

  if (!payloadSerial) {
    logServerEvent("MQTT_MISSING_SERIAL", {
      topic,
      topic_serial: topicSerial || null,
      message_id: messageId,
    })
    await ackErrorIfPossible({
      topicSerial,
      messageId,
      errorCode: "MISSING_SERIAL",
      message: "serial_number la bat buoc",
      topic,
    })
    return
  }

  if (topicSerial && payloadSerial !== topicSerial) {
    logServerEvent("MQTT_SERIAL_MISMATCH", {
      topic,
      topic_serial: topicSerial,
      payload_serial: payloadSerial,
      message_id: messageId,
    })
    await ackErrorIfPossible({
      topicSerial,
      messageId,
      errorCode: "SERIAL_MISMATCH",
      message: "serial trong topic khong khop payload",
      topic,
    })
    return
  }

  if (payload.ecg_signal !== undefined) {
    const signalTypeValid =
      Array.isArray(payload.ecg_signal) || typeof payload.ecg_signal === "string"
    if (!signalTypeValid) {
      logServerEvent("MQTT_INVALID_ECG_SIGNAL_TYPE", {
        topic,
        message_id: messageId,
        serial_number: payloadSerial,
        signal_type: typeof payload.ecg_signal,
      })
      await ackErrorIfPossible({
        topicSerial: topicSerial || payloadSerial,
        messageId,
        errorCode: "INGEST_FAILED",
        message: "ecg_signal phai la array hoac JSON string",
        topic,
      })
      return
    }
  }

  const dedupeSerial = topicSerial || payloadSerial
  if (isDuplicateMessage(dedupeSerial, messageId)) {
    logServerEvent("MQTT_DUPLICATE_MESSAGE", {
      topic,
      serial_number: dedupeSerial,
      message_id: messageId,
    })
    await publishAck(
      dedupeSerial,
      buildAckPayload({
        messageId,
        status: "ok",
        duplicate: true,
      })
    )
    return
  }

  const ingestResult = await ingestTelemetry(payload, {
    source: "mqtt",
    io,
    actorId: null,
    topic,
  })

  if (ingestResult.ok) {
    markMessageSeen(dedupeSerial, messageId)
    await publishAck(
      dedupeSerial,
      buildAckPayload({
        messageId,
        status: "ok",
        readingId: ingestResult.data.reading_id,
        duplicate: false,
      })
    )

    logServerEvent("MQTT_INGEST_OK", {
      topic,
      code: ingestResult.code,
      serial_number: ingestResult.data.serial_number,
      reading_id: ingestResult.data.reading_id,
      message_id: messageId,
      alert_count: ingestResult.data.alert_count,
    })
    return
  }

  await ackErrorIfPossible({
    topicSerial: dedupeSerial,
    messageId,
    errorCode: toAckErrorCode(ingestResult.code),
    message: ingestResult.message,
    topic,
  })

  logServerEvent("MQTT_INGEST_ERROR", {
    topic,
    code: ingestResult.code,
    message: ingestResult.message,
    serial_number: ingestResult.data.serial_number,
    message_id: messageId,
  })
}

// HÃ m khá»Ÿi Ä‘á»™ng backend: DB, MQTT foundation vÃ  HTTP server.
const startServer = async () => {
  try {
    await prisma.$connect()
    logServerEvent("DB_CONNECT_OK")

    const mqttState = await initMqttTelemetry({
      onTelemetryMessage: handleMqttTelemetryMessage,
    })
    logServerEvent("MQTT_INIT_RESULT", mqttState)

    server.listen(PORT, () => {
      logServerEvent("SERVER_LISTENING", {
        port: PORT,
        client_url: process.env.CLIENT_URL || null,
      })
    })
  } catch (error) {
    logServerEvent("SERVER_START_FAILED", {
      reason: error?.message || "UNKNOWN",
    })
    process.exit(1)
  }
}

process.on("SIGINT", () => shutdownGracefully("SIGINT"))
process.on("SIGTERM", () => shutdownGracefully("SIGTERM"))

startServer()

