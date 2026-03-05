const mqtt = require("mqtt")

let mqttClient = null
let telemetryMessageHandler = null
let activeConfig = null
let dedupeCleanupTimer = null

const dedupeMap = new Map()

const mqttState = {
  enabled: false,
  connected: false,
  subscribed: false,
  topicTelemetry: null,
  brokerUrl: null,
  lastError: null,
}

const DEFAULT_DEDUPE_TTL_MS = 600000
const DEFAULT_DEDUPE_CLEANUP_INTERVAL_MS = 60000
const DEFAULT_MAX_PAYLOAD_BYTES = 262144

// HÃ m ghi log JSON line thá»‘ng nháº¥t cho toÃ n bá»™ lifecycle MQTT.
const logMqttEvent = (event, payload = {}) => {
  const record = {
    event: String(event || "MQTT_EVENT"),
    timestamp: new Date().toISOString(),
    source: "mqttTelemetryService",
    ...payload,
  }
  console.log(JSON.stringify(record))
}

// HÃ m chuyá»ƒn chuá»—i env vá» boolean vá»›i default an toÃ n.

// Hàm cắt ngắn payload text để log debug mà không làm phình log.
const toPayloadPreview = (payloadText, maxLen = 220) => {
  const text = String(payloadText || "")
  if (text.length <= maxLen) return text
  return `${text.slice(0, maxLen)}...`
}
const parseBooleanEnv = (value, defaultValue = false) => {
  if (typeof value === "boolean") return value
  const normalized = String(value || "").trim().toLowerCase()
  if (!normalized) return defaultValue
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on"
}

// HÃ m chuyá»ƒn chuá»—i env vá» sá»‘ nguyÃªn vá»›i fallback máº·c Ä‘á»‹nh.
const parseIntEnv = (value, fallback) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) ? parsed : fallback
}

// HÃ m chuáº©n hÃ³a broker URL Ä‘á»ƒ cháº¥p nháº­n cáº£ dáº¡ng hostname thuáº§n vÃ  mqtts://.
const normalizeBrokerUrl = (rawValue) => {
  const value = String(rawValue || "").trim()
  if (!value) return ""
  if (/^mqtts?:\/\//i.test(value)) return value
  return `mqtts://${value}`
}

// HÃ m Ä‘á»c cáº¥u hÃ¬nh MQTT tá»« env cho backend.
const resolveMqttConfig = () => {
  const enabled = parseBooleanEnv(process.env.MQTT_ENABLE, false)
  const qos = Math.min(Math.max(parseIntEnv(process.env.MQTT_QOS, 1), 0), 2)
  const keepalive = parseIntEnv(process.env.MQTT_KEEPALIVE, 60)
  const connectTimeout = parseIntEnv(process.env.MQTT_CONNECT_TIMEOUT_MS, 10000)
  const reconnectPeriod = parseIntEnv(process.env.MQTT_RECONNECT_PERIOD_MS, 3000)
  const maxInflight = parseIntEnv(process.env.MQTT_MAX_INFLIGHT, 50)

  return {
    enabled,
    brokerUrl: normalizeBrokerUrl(process.env.MQTT_BROKER_URL),
    username: String(process.env.MQTT_USERNAME || "").trim(),
    password: String(process.env.MQTT_PASSWORD || "").trim(),
    clientId: String(process.env.MQTT_CLIENT_ID || "ironman-server-dev").trim(),
    topicTelemetry: String(process.env.MQTT_TOPIC_TELEMETRY || "devices/+/telemetry").trim(),
    topicAckTemplate: String(process.env.MQTT_TOPIC_ACK_TEMPLATE || "devices/{serial}/ack").trim(),
    qos,
    ackEnabled: parseBooleanEnv(process.env.MQTT_ACK_ENABLE, true),
    keepalive,
    connectTimeout,
    reconnectPeriod,
    maxInflight,
    dedupeTtlMs: parseIntEnv(process.env.MQTT_DEDUPE_TTL_MS, DEFAULT_DEDUPE_TTL_MS),
    dedupeCleanupIntervalMs: parseIntEnv(
      process.env.MQTT_DEDUPE_CLEANUP_INTERVAL_MS,
      DEFAULT_DEDUPE_CLEANUP_INTERVAL_MS
    ),
    maxPayloadBytes: parseIntEnv(process.env.MQTT_MAX_PAYLOAD_BYTES, DEFAULT_MAX_PAYLOAD_BYTES),
  }
}

// HÃ m trÃ­ch xuáº¥t serial tá»« topic dáº¡ng devices/{serial}/telemetry.
const extractSerialFromTopic = (topic) => {
  const value = String(topic || "").trim()
  const match = value.match(/^devices\/([^/]+)\/telemetry$/i)
  if (!match?.[1]) return null
  try {
    return decodeURIComponent(match[1])
  } catch (error) {
    return match[1]
  }
}

// HÃ m táº¡o topic ACK tá»« template theo serial thiáº¿t bá»‹.
const buildAckTopic = (serial) => {
  const serialValue = encodeURIComponent(String(serial || "").trim())
  const template = activeConfig?.topicAckTemplate || "devices/{serial}/ack"
  return template.replace("{serial}", serialValue)
}

// HÃ m táº¡o payload ACK chuáº©n hÃ³a cho cáº£ success/error/duplicate.
const buildAckPayload = ({
  messageId,
  status,
  readingId = null,
  duplicate = false,
  errorCode = null,
  message = null,
}) => {
  const payload = {
    message_id: messageId == null ? null : String(messageId),
    status: String(status || "error"),
    server_time: new Date().toISOString(),
  }

  if (payload.status === "ok") {
    payload.duplicate = Boolean(duplicate)
    if (Number.isInteger(Number(readingId))) {
      payload.reading_id = Number(readingId)
    }
    return payload
  }

  payload.error_code = String(errorCode || "INGEST_FAILED")
  payload.message = String(message || "MQTT ingest failed")
  return payload
}

// HÃ m táº¡o key dedupe theo serial vÃ  message_id.
const buildDedupeKey = (serial, messageId) => {
  const serialText = String(serial || "").trim()
  const messageText = String(messageId || "").trim()
  return `${serialText}:${messageText}`
}

// HÃ m dá»n cÃ¡c key dedupe Ä‘Ã£ háº¿t háº¡n Ä‘á»ƒ trÃ¡nh phÃ¬nh bá»™ nhá»›.
const pruneExpiredDedupeKeys = () => {
  const now = Date.now()
  let removed = 0
  for (const [key, expiresAt] of dedupeMap.entries()) {
    if (!Number.isFinite(expiresAt) || expiresAt <= now) {
      dedupeMap.delete(key)
      removed += 1
    }
  }
  if (removed > 0) {
    logMqttEvent("MQTT_DEDUPE_PRUNED", { removed, remaining: dedupeMap.size })
  }
}

// HÃ m kiá»ƒm tra message cÃ³ bá»‹ trÃ¹ng trong TTL dedupe hay khÃ´ng.
const isDuplicateMessage = (serial, messageId) => {
  pruneExpiredDedupeKeys()
  const key = buildDedupeKey(serial, messageId)
  const expiresAt = dedupeMap.get(key)
  if (!Number.isFinite(expiresAt)) return false
  return expiresAt > Date.now()
}

// HÃ m Ä‘Ã¡nh dáº¥u message Ä‘Ã£ xá»­ lÃ½ thÃ nh cÃ´ng Ä‘á»ƒ chá»‘ng láº·p dá»¯ liá»‡u QoS1.
const markMessageSeen = (serial, messageId) => {
  const ttlMs = Number(activeConfig?.dedupeTtlMs || DEFAULT_DEDUPE_TTL_MS)
  const key = buildDedupeKey(serial, messageId)
  dedupeMap.set(key, Date.now() + Math.max(1, ttlMs))
}

// HÃ m khá»Ÿi Ä‘á»™ng timer dá»n rÃ¡c dedupe Ä‘á»‹nh ká»³.
const startDedupeCleanupTimer = () => {
  if (dedupeCleanupTimer) return
  const intervalMs = Number(activeConfig?.dedupeCleanupIntervalMs || DEFAULT_DEDUPE_CLEANUP_INTERVAL_MS)
  dedupeCleanupTimer = setInterval(pruneExpiredDedupeKeys, Math.max(1000, intervalMs))
  dedupeCleanupTimer.unref()
}

// HÃ m dá»«ng timer dá»n rÃ¡c dedupe khi shutdown.
const stopDedupeCleanupTimer = () => {
  if (!dedupeCleanupTimer) return
  clearInterval(dedupeCleanupTimer)
  dedupeCleanupTimer = null
}

// HÃ m tráº£ giá»›i háº¡n kÃ­ch thÆ°á»›c payload MQTT Ä‘á»ƒ layer server guard trÆ°á»›c khi parse.
const getMaxPayloadBytes = () => {
  const configured = Number(activeConfig?.maxPayloadBytes)
  if (Number.isFinite(configured) && configured > 0) return configured
  return DEFAULT_MAX_PAYLOAD_BYTES
}

// HÃ m tráº£ snapshot tráº¡ng thÃ¡i MQTT hiá»‡n táº¡i Ä‘á»ƒ service/controller quan sÃ¡t.
const getMqttState = () => ({
  ...mqttState,
})

// HÃ m Ä‘Äƒng kÃ½ callback xá»­ lÃ½ message telemetry khi nháº­n tá»« broker.
const setTelemetryMessageHandler = (handler) => {
  telemetryMessageHandler = typeof handler === "function" ? handler : null
}

// HÃ m khá»Ÿi táº¡o káº¿t ná»‘i MQTT, subscribe topic telemetry vÃ  báº­t reconnect tá»± Ä‘á»™ng.
const initMqttTelemetry = async (options = {}) => {
  if (options && typeof options.onTelemetryMessage === "function") {
    setTelemetryMessageHandler(options.onTelemetryMessage)
  }

  activeConfig = resolveMqttConfig()
  mqttState.enabled = activeConfig.enabled
  mqttState.topicTelemetry = activeConfig.topicTelemetry
  mqttState.brokerUrl = activeConfig.brokerUrl

  if (!activeConfig.enabled) {
    logMqttEvent("MQTT_DISABLED", { reason: "MQTT_ENABLE=false" })
    return getMqttState()
  }

  if (!activeConfig.brokerUrl) {
    mqttState.lastError = "MISSING_BROKER_URL"
    logMqttEvent("MQTT_INIT_ERROR", { reason: mqttState.lastError })
    return getMqttState()
  }

  if (mqttClient) {
    logMqttEvent("MQTT_ALREADY_INITIALIZED", {
      connected: mqttState.connected,
      subscribed: mqttState.subscribed,
    })
    return getMqttState()
  }

  startDedupeCleanupTimer()

  try {
    mqttClient = mqtt.connect(activeConfig.brokerUrl, {
      clientId: activeConfig.clientId,
      username: activeConfig.username || undefined,
      password: activeConfig.password || undefined,
      clean: true,
      reconnectPeriod: activeConfig.reconnectPeriod,
      connectTimeout: activeConfig.connectTimeout,
      keepalive: activeConfig.keepalive,
      queueQoSZero: true,
      resubscribe: true,
      protocolVersion: 4,
      properties: {
        maximumPacketSize: 1024 * 1024,
      },
      incomingStore: undefined,
      outgoingStore: undefined,
      maxInflightMessages: activeConfig.maxInflight,
    })

    mqttClient.on("connect", () => {
      mqttState.connected = true
      mqttState.lastError = null
      logMqttEvent("MQTT_CONNECT_OK", {
        broker_url: activeConfig.brokerUrl,
        client_id: activeConfig.clientId,
      })

      mqttClient.subscribe(activeConfig.topicTelemetry, { qos: activeConfig.qos }, (error) => {
        if (error) {
          mqttState.subscribed = false
          mqttState.lastError = error.message
          logMqttEvent("MQTT_SUBSCRIBE_ERROR", {
            topic: activeConfig.topicTelemetry,
            reason: error.message,
          })
          return
        }

        mqttState.subscribed = true
        logMqttEvent("MQTT_SUBSCRIBE_OK", {
          topic: activeConfig.topicTelemetry,
          qos: activeConfig.qos,
        })
      })
    })

    mqttClient.on("reconnect", () => {
      logMqttEvent("MQTT_RECONNECTING", {
        broker_url: activeConfig.brokerUrl,
      })
    })

    mqttClient.on("offline", () => {
      mqttState.connected = false
      mqttState.subscribed = false
      logMqttEvent("MQTT_OFFLINE")
    })

    mqttClient.on("close", () => {
      mqttState.connected = false
      mqttState.subscribed = false
      logMqttEvent("MQTT_CLOSED")
    })

    mqttClient.on("error", (error) => {
      mqttState.lastError = error?.message || "UNKNOWN_ERROR"
      logMqttEvent("MQTT_ERROR", {
        reason: mqttState.lastError,
      })
    })

    mqttClient.on("message", (topic, payloadBuffer) => {
      const payloadText = payloadBuffer?.toString("utf8") || ""
      logMqttEvent("MQTT_MESSAGE_RECEIVED", {
        topic,
        payload_size: payloadBuffer?.length || 0,
        payload_preview: toPayloadPreview(payloadText),
      })
      if (typeof telemetryMessageHandler !== "function") {
        logMqttEvent("MQTT_MESSAGE_SKIPPED", {
          topic,
          reason: "NO_HANDLER",
          payload_size: payloadBuffer?.length || 0,
        })
        return
      }

      Promise.resolve(
        telemetryMessageHandler({
          topic,
          payloadBuffer,
          payloadText,
        })
      ).catch((error) => {
        logMqttEvent("MQTT_HANDLER_ERROR", {
          topic,
          reason: error?.message || "UNKNOWN",
        })
      })
    })

    logMqttEvent("MQTT_INIT_STARTED", {
      broker_url: activeConfig.brokerUrl,
      topic: activeConfig.topicTelemetry,
      qos: activeConfig.qos,
    })
  } catch (error) {
    mqttState.lastError = error?.message || "INIT_FAILED"
    logMqttEvent("MQTT_INIT_ERROR", {
      reason: mqttState.lastError,
    })
  }

  return getMqttState()
}

// HÃ m publish ACK lÃªn topic thiáº¿t bá»‹ Ä‘á»ƒ pháº£n há»“i tráº¡ng thÃ¡i ingest.
const publishAck = async (serialNumber, ackPayload = {}) => {
  if (!mqttClient || !mqttState.connected || !activeConfig?.ackEnabled) {
    logMqttEvent("MQTT_ACK_SKIPPED", {
      reason: "MQTT_NOT_READY_OR_ACK_DISABLED",
      serial_number: serialNumber,
    })
    return false
  }

  const topic = buildAckTopic(serialNumber)
  const message = JSON.stringify(ackPayload || {})
  logMqttEvent("MQTT_ACK_PUBLISHING", {
    topic,
    serial_number: serialNumber,
    message_id: ackPayload?.message_id || null,
    status: ackPayload?.status || null,
    payload_size: Buffer.byteLength(message, "utf8"),
  })

  return new Promise((resolve) => {
    mqttClient.publish(topic, message, { qos: activeConfig.qos, retain: false }, (error) => {
      if (error) {
        logMqttEvent("MQTT_ACK_ERROR", {
          topic,
          serial_number: serialNumber,
          reason: error.message,
        })
        resolve(false)
        return
      }

      logMqttEvent("MQTT_ACK_OK", {
        topic,
        serial_number: serialNumber,
        message_id: ackPayload?.message_id || null,
        status: ackPayload?.status || null,
      })
      resolve(true)
    })
  })
}

// HÃ m Ä‘Ã³ng káº¿t ná»‘i MQTT an toÃ n khi server shutdown.
const shutdownMqttTelemetry = async () => {
  stopDedupeCleanupTimer()
  dedupeMap.clear()

  if (!mqttClient) {
    return
  }

  const closingClient = mqttClient
  mqttClient = null
  mqttState.connected = false
  mqttState.subscribed = false

  await new Promise((resolve) => {
    closingClient.end(true, {}, () => {
      logMqttEvent("MQTT_SHUTDOWN_OK")
      resolve()
    })
  })
}

module.exports = {
  initMqttTelemetry,
  shutdownMqttTelemetry,
  publishAck,
  getMqttState,
  setTelemetryMessageHandler,
  extractSerialFromTopic,
  buildAckPayload,
  isDuplicateMessage,
  markMessageSeen,
  pruneExpiredDedupeKeys,
  getMaxPayloadBytes,
  logMqttEvent,
}



