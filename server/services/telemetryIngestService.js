const prisma = require("../prismaClient")
const { AccessStatus, NotificationType } = require("@prisma/client")
const { emitToUsers } = require("./socketEmitService")
const { createNotification } = require("./notificationService")
const { predictFromReading, filterReadingSignal } = require("./ecgCnnService")
const { generateFallbackECGSignal } = require("./fakeReadingDataService")
const {
  normalizeEcgSignal,
  toHeartRate,
  deriveHeartRateFromBeatCount,
} = require("./telemetrySignalService")

const FALLBACK_AI_RESULT = "Bình thường"

// Hàm ghi log JSON line cho luồng ingest telemetry để dễ truy vết theo từng source.
const logTelemetryIngestEvent = (event, payload = {}) => {
  const normalizedEvent = String(event || "TELEMETRY_INGEST_EVENT").trim() || "TELEMETRY_INGEST_EVENT"
  console.log(
    JSON.stringify({
      event: normalizedEvent,
      timestamp: new Date().toISOString(),
      source: "telemetryIngestService",
      ...payload,
    })
  )
}

// Hàm tạo object kết quả ingest chuẩn hóa để HTTP và MQTT dùng cùng một contract nội bộ.
const buildIngestResult = (overrides = {}) => {
  return {
    ok: false,
    statusCode: 500,
    code: "INGEST_FAILED",
    message: "Lỗi server nội bộ",
    reading: null,
    data: {
      reading_id: null,
      device_id: null,
      user_id: null,
      serial_number: null,
      heart_rate: null,
      abnormal_detected: false,
      ai_result: null,
      alert_count: 0,
    },
    alerts: [],
    recipients: [],
    error: null,
    ...overrides,
  }
}

// Hàm chuẩn hóa chuỗi tóm tắt kết quả AI để lưu trong reading.ai_result.
const toAiResultSummary = (aiResult) => {
  const summary = String(aiResult?.ai_result_summary || "").trim()
  return summary || FALLBACK_AI_RESULT
}

// Hàm gọi service AI và luôn trả về kết quả an toàn cho luồng ingest.
const inferReadingWithAI = async (ecgSignal, context) => {
  try {
    const aiResult = await predictFromReading(ecgSignal, { context })
    if (!aiResult || aiResult.skipped) {
      logTelemetryIngestEvent("AI_INFER_SKIP", {
        context,
        reason: aiResult?.reason || "UNKNOWN",
        infer_ms: aiResult?.infer_ms ?? null,
        input_len: aiResult?.input_len ?? 0,
        beat_count: aiResult?.beat_count ?? 0,
        abnormal_group_count: 0,
        ai_result_summary: FALLBACK_AI_RESULT,
        fallback_applied: true,
      })
      return {
        aiResultSummary: FALLBACK_AI_RESULT,
        abnormalDetected: false,
        abnormalGroups: [],
        aiMeta: aiResult || null,
      }
    }

    const aiResultSummary = toAiResultSummary(aiResult)
    const abnormalGroups = Array.isArray(aiResult.abnormal_groups) ? aiResult.abnormal_groups : []
    const abnormalDetected = abnormalGroups.length > 0

    logTelemetryIngestEvent("AI_INFER_OK", {
      context,
      reason: null,
      ai_result_summary: aiResultSummary,
      infer_ms: aiResult.infer_ms ?? null,
      input_len: aiResult.input_len ?? 0,
      beat_count: aiResult.beat_count ?? null,
      abnormal_group_count: abnormalGroups.length,
      fallback_applied: false,
      abnormal_detected: abnormalDetected,
    })

    return {
      aiResultSummary,
      abnormalDetected,
      abnormalGroups,
      aiMeta: aiResult,
    }
  } catch (error) {
    logTelemetryIngestEvent("AI_INFER_ERROR", {
      context,
      reason: "INFER_ERROR",
      infer_ms: null,
      input_len: 0,
      beat_count: 0,
      abnormal_group_count: 0,
      ai_result_summary: FALLBACK_AI_RESULT,
      fallback_applied: true,
      message: error?.message || "UNKNOWN",
    })
    return {
      aiResultSummary: FALLBACK_AI_RESULT,
      abnormalDetected: false,
      abnormalGroups: [],
      aiMeta: null,
    }
  }
}

// Hàm lọc tín hiệu để lưu DB; nếu lọc lỗi thì fallback về tín hiệu gốc nhưng không fail nghiệp vụ.
const filterSignalForStorage = (ecgSignal, context) => {
  const filteredResult = filterReadingSignal(ecgSignal, { context })
  if (filteredResult?.skipped) {
    logTelemetryIngestEvent("AI_FILTER_SKIP", {
      context,
      reason: filteredResult.reason || "UNKNOWN",
      input_len: filteredResult.input_len ?? 0,
      fallback_applied: true,
    })
  }

  const filteredSignal = Array.isArray(filteredResult?.filtered_signal)
    ? filteredResult.filtered_signal
    : []
  if (filteredSignal.length > 0) {
    return filteredSignal
  }

  return Array.isArray(ecgSignal) ? ecgSignal : []
}

// Hàm lấy nhãn cảnh báo để lưu alert_type từ dữ liệu nhóm segment bất thường.
const getAlertTypeFromGroup = (group) => {
  const labelText = String(group?.label_text || "").trim()
  const labelCode = String(group?.label_code || "").trim()
  return labelText || labelCode || "Bat thuong"
}

// Hàm tạo nội dung message cảnh báo từ một nhóm segment bất thường.
const buildAlertMessageFromGroup = (group, heartRate) => {
  const alertType = getAlertTypeFromGroup(group)
  const startSample = Number(group?.start_sample)
  const endSample = Number(group?.end_sample)
  const segmentCount = Number(group?.segment_count || 1)
  return `Phát hiện ${alertType} tại đoạn mẫu ${startSample}-${endSample} (${segmentCount} segment). Nhịp tim ${heartRate} bpm`
}

// Hàm tạo nhiều alert từ danh sách nhóm segment bất thường của một reading.
const createGroupedAlerts = async (userId, readingId, heartRate, abnormalGroups) => {
  const createOps = abnormalGroups.map((group) =>
    prisma.alert.create({
      data: {
        user_id: userId,
        reading_id: readingId,
        alert_type: getAlertTypeFromGroup(group),
        message: buildAlertMessageFromGroup(group, heartRate),
        segment_start_sample: Number.isInteger(Number(group.start_sample))
          ? Number(group.start_sample)
          : null,
        segment_end_sample: Number.isInteger(Number(group.end_sample))
          ? Number(group.end_sample)
          : null,
      },
    })
  )
  return prisma.$transaction(createOps)
}

// Hàm emit một event alert dạng gộp cho toàn bộ alert của cùng một reading.
const emitAggregatedAlertEvent = (io, recipients, payload) => {
  emitToUsers(io, recipients, "alert", payload)
}

// Hàm tạo notification cảnh báo dạng gộp cho một reading có nhiều alert con.
const createAggregatedAlertNotification = async ({
  actorId,
  recipients,
  io,
  userId,
  readingId,
  serialNumber,
  aiResultSummary,
  createdAlerts,
}) => {
  if (!Array.isArray(createdAlerts) || createdAlerts.length === 0) return

  const summaryMessage = `Phát hiện ${createdAlerts.length} cảnh báo bất thường (${aiResultSummary})`
  await createNotification({
    type: NotificationType.ALERT,
    title: "Canh bao suc khoe",
    message: summaryMessage,
    actorId,
    entityType: "alert",
    entityId: createdAlerts[0].alert_id,
    payload: {
      user_id: userId,
      reading_id: readingId,
      serial_number: serialNumber || null,
      abnormal_count: createdAlerts.length,
      ai_result_summary: aiResultSummary,
      alerts: createdAlerts.map((alert) => ({
        alert_id: alert.alert_id,
        alert_type: alert.alert_type,
        message: alert.message,
        segment_start_sample: alert.segment_start_sample,
        segment_end_sample: alert.segment_end_sample,
        timestamp: alert.timestamp,
      })),
    },
    recipientUserIds: recipients,
    io,
  })
}

// Hàm lấy danh sách tài khoản cần nhận dữ liệu realtime của bệnh nhân.
const getPatientRecipientIds = async (patientId) => {
  const viewers = await prisma.accessPermission.findMany({
    where: {
      patient_id: patientId,
      status: AccessStatus.accepted,
    },
    select: { viewer_id: true },
  })

  return [patientId, ...viewers.map((item) => item.viewer_id)]
}

// Hàm parse tín hiệu ECG đã lưu để phục vụ ghép chart realtime liên tục.
const parseStoredEcgSignal = (storedValue) => {
  let parsed = storedValue
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed)
    } catch (error) {
      parsed = []
    }
  }
  return Array.isArray(parsed) ? parsed : []
}

// Hàm xử lý nghiệp vụ ingest telemetry dùng chung cho cả HTTP route và MQTT consumer.
const ingestTelemetry = async (payload, context = {}) => {
  const source = String(context?.source || "unknown")
  const io = context?.io || null
  const actorId = context?.actorId ?? null

  try {
    const serialNumber = String(payload?.serial_number ?? payload?.serial ?? "").trim()
    if (!serialNumber) {
      return buildIngestResult({
        statusCode: 400,
        code: "MISSING_SERIAL",
        message: "serial_number la bat buoc",
        data: { ...buildIngestResult().data, serial_number: null },
        error: { reason: "MISSING_SERIAL" },
      })
    }

    const device = await prisma.device.findUnique({
      where: { serial_number: serialNumber },
      select: { device_id: true, user_id: true, serial_number: true },
    })

    if (!device) {
      return buildIngestResult({
        statusCode: 404,
        code: "DEVICE_NOT_FOUND",
        message: "Khong tim thay thiet bi",
        data: { ...buildIngestResult().data, serial_number: serialNumber },
        error: { reason: "DEVICE_NOT_FOUND" },
      })
    }

    const normalizedEcg = normalizeEcgSignal(payload?.ecg_signal)
    const rawEcg = normalizedEcg.length > 0 ? normalizedEcg : generateFallbackECGSignal()
    if (!Array.isArray(rawEcg) || rawEcg.length === 0) {
      if (source === "mqtt") {
        logTelemetryIngestEvent("MQTT_INVALID_PAYLOAD", {
          reason: "INVALID_PAYLOAD",
          serial_number: serialNumber,
        })
      }
      return buildIngestResult({
        statusCode: 400,
        code: "INVALID_PAYLOAD",
        message: "ecg_signal khong hop le",
        data: {
          ...buildIngestResult().data,
          serial_number: serialNumber,
          device_id: device.device_id,
          user_id: device.user_id,
        },
        error: { reason: "INVALID_PAYLOAD" },
      })
    }

    const ecgToStore = filterSignalForStorage(rawEcg, `${source}:store`)
    const { aiResultSummary, abnormalDetected, abnormalGroups, aiMeta } = await inferReadingWithAI(
      rawEcg,
      source
    )
    const providedHeartRate = toHeartRate(payload?.heart_rate)
    const derivedHeartRate = deriveHeartRateFromBeatCount(aiMeta?.beat_count, rawEcg.length)
    const resolvedHeartRate = providedHeartRate ?? derivedHeartRate ?? 0

    const reading = await prisma.reading.create({
      data: {
        device_id: device.device_id,
        heart_rate: resolvedHeartRate,
        ecg_signal: JSON.stringify(ecgToStore),
        abnormal_detected: abnormalDetected,
        ai_result: aiResultSummary,
        timestamp: new Date(),
      },
    })

    const previousReadings = await prisma.reading.findMany({
      where: { device_id: reading.device_id },
      orderBy: { timestamp: "desc" },
      skip: 1,
      take: 1,
    })
    const previousReading = previousReadings[0]

    // merge để gửi cho client, thuận tiện cho việc hiển thị chart
    let mergedECG = ecgToStore
    if (previousReading) {
      const previousEcg = parseStoredEcgSignal(previousReading.ecg_signal)
      mergedECG = [...previousEcg, ...ecgToStore]
      if (mergedECG.length > 2500) mergedECG = mergedECG.slice(-2500)
    }

    const recipients = await getPatientRecipientIds(device.user_id)
    emitToUsers(io, recipients, "reading-update", {
      reading_id: reading.reading_id,
      device_id: reading.device_id,
      user_id: device.user_id,
      serial_number: device.serial_number,
      heart_rate: reading.heart_rate,
      ecg_signal: mergedECG,
      abnormal_detected: reading.abnormal_detected,
      ai_result: reading.ai_result,
      timestamp: reading.timestamp,
    })

    let createdAlerts = []
    if (abnormalDetected) {
      createdAlerts = await createGroupedAlerts(
        device.user_id,
        reading.reading_id,
        reading.heart_rate,
        abnormalGroups
      )

      const message = `Phat hien ${createdAlerts.length} canh bao bat thuong (${aiResultSummary})`
      emitAggregatedAlertEvent(io, recipients, {
        reading_id: reading.reading_id,
        user_id: device.user_id,
        abnormal_count: createdAlerts.length,
        ai_result_summary: aiResultSummary,
        alert_type: createdAlerts[0]?.alert_type || null,
        message,
        timestamp: reading.timestamp,
        alerts: createdAlerts.map((alert) => ({
          alert_id: alert.alert_id,
          user_id: alert.user_id,
          reading_id: alert.reading_id,
          alert_type: alert.alert_type,
          message: alert.message,
          segment_start_sample: alert.segment_start_sample,
          segment_end_sample: alert.segment_end_sample,
          timestamp: alert.timestamp,
        })),
      })

      await createAggregatedAlertNotification({
        actorId,
        recipients,
        io,
        userId: device.user_id,
        readingId: reading.reading_id,
        serialNumber: device.serial_number,
        aiResultSummary,
        createdAlerts,
      })
    }

    return buildIngestResult({
      ok: true,
      statusCode: 201,
      code: "INGEST_OK",
      message: "Telemetry data received",
      reading,
      data: {
        reading_id: reading.reading_id,
        device_id: reading.device_id,
        user_id: device.user_id,
        serial_number: device.serial_number,
        heart_rate: reading.heart_rate,
        abnormal_detected: reading.abnormal_detected,
        ai_result: reading.ai_result,
        alert_count: createdAlerts.length,
      },
      alerts: createdAlerts,
      recipients,
      error: null,
    })
  } catch (error) {
    logTelemetryIngestEvent("INGEST_FAILED", {
      source,
      reason: "INGEST_FAILED",
      message: error?.message || "UNKNOWN",
    })
    return buildIngestResult({
      statusCode: 500,
      code: "INGEST_FAILED",
      message: "Failed to receive telemetry",
      error: {
        reason: "INGEST_FAILED",
        detail: error?.message || "UNKNOWN",
      },
    })
  }
}

module.exports = {
  ingestTelemetry,
}
