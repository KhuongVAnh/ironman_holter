// Controller xu ly telemetry, du lieu ECG va lich su chi so tim mach.
const prisma = require("../prismaClient")
const { AccessRole, AccessStatus, NotificationType } = require("@prisma/client")
const { emitToUsers } = require("../services/socketEmitService")
const { createNotification } = require("../services/notificationService")
const { predictFromReading, filterReadingSignal } = require("../services/ecgCnnService")
const {
  generateFakeECGData,
  generateFallbackECGSignal,
} = require("../services/fakeReadingDataService")
const {
  normalizeEcgSignal,
  toHeartRate,
  deriveHeartRateFromBeatCount,
} = require("../services/telemetrySignalService")
const { resolveAiCodeFromLabel, getAiLabelFromCode } = require("../strings/ecgAiStrings")

const FALLBACK_AI_RESULT = "Bình thường"

// Hàm ghi log JSON line cho luồng AI ở controller để dễ truy vết theo ngữ cảnh nghiệp vụ.
const logAiControllerEvent = (event, payload = {}) => {
  const normalizedEvent = String(event || "AI_INFER_EVENT").trim() || "AI_INFER_EVENT"
  console.log(
    JSON.stringify({
      event: normalizedEvent,
      timestamp: new Date().toISOString(),
      source: "readingController",
      ...payload,
    })
  )
}

// Hàm xử lý chuẩn hóa chuỗi tóm tắt kết quả AI để lưu trong reading.ai_result.
const toAiResultSummary = (aiResult) => {
  const summary = String(aiResult?.ai_result_summary || "").trim()
  return summary || FALLBACK_AI_RESULT
}

// Hàm xử lý gọi service AI và trả về kết quả segment-level an toàn cho controller.
const inferReadingWithAI = async (ecgSignal, context) => {
  try {
    const aiResult = await predictFromReading(ecgSignal, { context })
    if (!aiResult || aiResult.skipped) {
      logAiControllerEvent("AI_INFER_SKIP", {
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
        segmentPredictions: [],
        aiMeta: aiResult || null,
      }
    }

    const aiResultSummary = toAiResultSummary(aiResult)
    const abnormalGroups = Array.isArray(aiResult.abnormal_groups) ? aiResult.abnormal_groups : []
    const segmentPredictions = Array.isArray(aiResult.segment_predictions)
      ? aiResult.segment_predictions
      : []
    const abnormalDetected = abnormalGroups.length > 0

    logAiControllerEvent("AI_INFER_OK", {
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
      segmentPredictions,
      aiMeta: aiResult,
    }
  } catch (error) {
    logAiControllerEvent("AI_INFER_ERROR", {
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
      segmentPredictions: [],
      aiMeta: null,
    }
  }
}

// Hàm lọc tín hiệu để lưu DB; nếu lọc lỗi thì fallback về tín hiệu gốc nhưng không làm fail nghiệp vụ.
const filterSignalForStorage = (ecgSignal, context) => {
  const filteredResult = filterReadingSignal(ecgSignal, { context })
  if (filteredResult?.skipped) {
    logAiControllerEvent("AI_FILTER_SKIP", {
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

// Hàm xử lý lấy nhãn cảnh báo để lưu alert_type từ dữ liệu nhóm segment bất thường.
const getAlertTypeFromGroup = (group) => {
  const labelText = String(group?.label_text || "").trim()
  const labelCode = String(group?.label_code || "").trim()
  return labelText || labelCode || "Bat thuong"
}

// Hàm xử lý tạo nội dung message cảnh báo từ một nhóm segment bất thường.
const buildAlertMessageFromGroup = (group, heartRate) => {
  const alertType = getAlertTypeFromGroup(group)
  const startSample = Number(group?.start_sample)
  const endSample = Number(group?.end_sample)
  const segmentCount = Number(group?.segment_count || 1)
  return `Phát hiện ${alertType} tại đoạn mẫu ${startSample}-${endSample} (${segmentCount} segment). Nhịp tim ${heartRate} bpm`
}

// Hàm xử lý tạo nhiều alert từ danh sách nhóm segment bất thường của một reading.
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

// Hàm xử lý emit một event alert dạng gộp cho toàn bộ alert của cùng một reading.
const emitAggregatedAlertEvent = (io, recipients, payload) => {
  emitToUsers(io, recipients, "alert", payload)
}

// Hàm xử lý tạo notification cảnh báo dạng gộp cho một reading có nhiều alert con.
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

// Ham xu ly chuan hoa device_id ve so nguyen hop le.
const toDeviceId = (value) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) ? parsed : null
}

const toReadingId = (value) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) ? parsed : null
}

// Ham xu ly tim cac tai khoan can nhan du lieu real-time cua benh nhan.
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

// Ham xu ly tao du lieu ECG gia lap de test.
const createFakeReading = async (req, res) => {
  try {
    const deviceId = toDeviceId(req.body?.device_id)
    if (deviceId === null) {
      return res.status(400).json({ message: "device_id khong hop le" })
    }

    const device = await prisma.device.findUnique({ where: { device_id: deviceId } })
    if (!device) {
      return res.status(404).json({ message: "Không tìm thấy thiết bị" })
    }

    const heart_rate = 60
    const raw_ecg_signal = generateFakeECGData()
    const ecg_signal = filterSignalForStorage(raw_ecg_signal, "createFakeReading:store")

    const { aiResultSummary, abnormalDetected, abnormalGroups, aiMeta } = await inferReadingWithAI(
      raw_ecg_signal,
      "createFakeReading"
    )
    void aiMeta
    const abnormal_detected = abnormalDetected

    const reading = await prisma.reading.create({
      data: {
        device_id: deviceId,
        heart_rate,
        ecg_signal: JSON.stringify(ecg_signal),
        abnormal_detected,
        ai_result: aiResultSummary,
        timestamp: new Date(),
      },
    })

    const io = req.app.get("io")
    const recipients = await getPatientRecipientIds(device.user_id)

    emitToUsers(io, recipients, "fake-reading", {
      device_id: deviceId,
      user_id: device.user_id,
      heart_rate,
      ecg_signal,
      abnormal_detected,
      ai_result: aiResultSummary,
      timestamp: reading.timestamp,
    })

    if (abnormal_detected) {
      const createdAlerts = await createGroupedAlerts(
        device.user_id,
        reading.reading_id,
        heart_rate,
        abnormalGroups
      )

      const message = `Phát hiện ${createdAlerts.length} cảnh báo bất thường (${aiResultSummary})`
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
        actorId: req.user?.user_id,
        recipients,
        io,
        userId: device.user_id,
        readingId: reading.reading_id,
        serialNumber: null,
        aiResultSummary,
        createdAlerts,
      })
    }

    res.status(201).json({
      message: "Tạo dữ liệu đọc thành công",
      reading,
    })
  } catch (error) {
    console.error("Lỗi tạo dữ liệu đọc:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

// Ham xu ly lay du lieu doc theo thiet bi.
const getDeviceReadings = async (req, res) => {
  try {
    const deviceId = toDeviceId(req.params.device_id)
    const { limit = 50, offset = 0 } = req.query

    if (deviceId === null) {
      return res.status(400).json({ message: "device_id khong hop le" })
    }

    const readings = await prisma.reading.findMany({
      where: { device_id: deviceId },
      orderBy: { timestamp: "desc" },
      take: Number.parseInt(limit, 10),
      skip: Number.parseInt(offset, 10),
    })

    res.json({ readings })
  } catch (error) {
    console.error("Lỗi lấy dữ liệu đọc:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

// Ham xu ly lay lich su du lieu tim mach theo nguoi dung.
const getUserReadingHistory = async (req, res) => {
  try {
    const { user_id } = req.params
    const { limit = 100, offset = 0 } = req.query
    const userId = Number.parseInt(user_id, 10)

    const readings = await prisma.reading.findMany({
      where: {
        device: { user_id: userId },
      },
      include: {
        device: {
          select: { device_id: true, serial_number: true },
        },
      },
      orderBy: { timestamp: "desc" },
      take: Number.parseInt(limit, 10),
      skip: Number.parseInt(offset, 10),
    })

    res.json({ readings })
  } catch (error) {
    console.error("Lỗi lấy lịch sử đọc:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

// Ham xu ly nhan telemetry tu thiet bi qua serial.
const receiveTelemetry = async (req, res) => {
  try {
    const { heart_rate, ecg_signal } = req.body
    const serialNumber = String(req.body?.serial_number ?? req.body?.serial ?? "").trim()
    const io = req.app.get("io")
    if (!serialNumber) {
      return res.status(400).json({ message: "serial_number la bat buoc" })
    }

    const device = await prisma.device.findUnique({
      where: { serial_number: serialNumber },
      select: { device_id: true, user_id: true, serial_number: true },
    })

    if (!device) {
      return res.status(404).json({ message: "Khong tim thay thiet bi" })
    }

    const normalizedEcg = normalizeEcgSignal(ecg_signal)
    const rawEcg = normalizedEcg.length > 0 ? normalizedEcg : generateFallbackECGSignal()
    const ecg = filterSignalForStorage(rawEcg, "receiveTelemetry:store")
    const { aiResultSummary, abnormalDetected, abnormalGroups, aiMeta } = await inferReadingWithAI(
      rawEcg,
      "receiveTelemetry"
    )
    void aiMeta
    const abnormal_detected = abnormalDetected
    const providedHeartRate = toHeartRate(heart_rate)
    const derivedHeartRate = deriveHeartRateFromBeatCount(aiMeta?.beat_count, rawEcg.length)
    const resolvedHeartRate = providedHeartRate ?? derivedHeartRate ?? 0

    const reading = await prisma.reading.create({
      data: {
        device_id: device.device_id,
        heart_rate: resolvedHeartRate,
        ecg_signal: JSON.stringify(ecg),
        abnormal_detected,
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

    let mergedECG = ecg
    if (previousReading) {
      let prevEcg = previousReading.ecg_signal || []
      if (typeof prevEcg === "string") {
        try {
          prevEcg = JSON.parse(prevEcg)
        } catch (error) {
          prevEcg = []
        }
      }
      if (!Array.isArray(prevEcg)) {
        prevEcg = []
      }
      mergedECG = [...prevEcg, ...ecg]
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

    if (abnormal_detected) {
      const createdAlerts = await createGroupedAlerts(
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
        actorId: null,
        recipients,
        io,
        userId: device.user_id,
        readingId: reading.reading_id,
        serialNumber: device.serial_number,
        aiResultSummary,
        createdAlerts,
      })
    }

    return res.status(201).json({
      message: "Telemetry data received",
      data: reading,
    })
  } catch (error) {
    console.error("Error receiving telemetry:", error)
    return res.status(500).json({ error: "Failed to receive telemetry" })
  }
}

// Ham xu ly lay chi tiet reading de hien thi do thi ECG.
const getReadingDetail = async (req, res) => {
  try {
    const readingId = toReadingId(req.params.reading_id)
    const requesterId = Number.parseInt(req.user.user_id, 10)

    if (readingId === null) {
      return res.status(400).json({ message: "reading_id khong hop le" })
    }

    const reading = await prisma.reading.findUnique({
      where: { reading_id: readingId },
      include: {
        device: {
          select: {
            device_id: true,
            serial_number: true,
            user_id: true,
            user: {
              select: { user_id: true, name: true, email: true },
            },
          },
        },
        alerts: {
          where: {
            segment_start_sample: { not: null },
            segment_end_sample: { not: null },
          },
          orderBy: [
            { segment_start_sample: "asc" },
            { timestamp: "asc" },
          ],
          select: {
            alert_id: true,
            alert_type: true,
            segment_start_sample: true,
            segment_end_sample: true,
            timestamp: true,
            resolved: true,
          },
        },
      },
    })

    if (!reading) {
      return res.status(404).json({ message: "Khong tim thay reading" })
    }

    const patientId = reading.device.user_id
    if (requesterId !== patientId) {
      const viewerAccess = await prisma.accessPermission.findFirst({
        where: {
          patient_id: patientId,
          viewer_id: requesterId,
          role: { in: [AccessRole.BAC_SI, AccessRole.GIA_DINH] },
          status: AccessStatus.accepted,
        },
        select: { permission_id: true },
      })

      if (!viewerAccess) {
        return res.status(403).json({ message: "Ban khong co quyen xem reading nay" })
      }
    }

    const mappedAlerts = reading.alerts
      .map((alert) => {
        const labelCode = resolveAiCodeFromLabel(alert.alert_type)
        const labelText = getAiLabelFromCode(labelCode || alert.alert_type)
        return {
          alert_id: alert.alert_id,
          alert_type: alert.alert_type,
          label_code: labelCode,
          label_text: labelText,
          segment_start_sample: alert.segment_start_sample,
          segment_end_sample: alert.segment_end_sample,
          timestamp: alert.timestamp,
          resolved: alert.resolved,
        }
      })
      .filter((alert) =>
        Number.isInteger(Number(alert.segment_start_sample)) &&
        Number.isInteger(Number(alert.segment_end_sample))
      )

    return res.json({
      reading: {
        reading_id: reading.reading_id,
        timestamp: reading.timestamp,
        heart_rate: reading.heart_rate,
        ecg_signal: reading.ecg_signal,
        abnormal_detected: reading.abnormal_detected,
        ai_result: reading.ai_result,
        device: {
          device_id: reading.device.device_id,
          serial_number: reading.device.serial_number,
        },
        patient: reading.device.user,
        alerts: mappedAlerts,
      },
    })
  } catch (error) {
    console.error("Loi lay chi tiet reading:", error)
    return res.status(500).json({ message: "Loi server noi bo" })
  }
}

module.exports = {
  createFakeReading,
  getDeviceReadings,
  getUserReadingHistory,
  receiveTelemetry,
  getReadingDetail,
}
