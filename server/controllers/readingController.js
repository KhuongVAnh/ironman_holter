// Controller xu ly telemetry, du lieu ECG va lich su chi so tim mach.
const prisma = require("../prismaClient")
const { AccessRole, AccessStatus, NotificationType } = require("@prisma/client")
const { emitToUsers } = require("../services/socketEmitService")
const { createNotification } = require("../services/notificationService")

// Ham xu ly tao du lieu ECG gia lap theo nhip tim va tan so lay mau.
const generateFakeECGData = (duration = 10, sampleRate = 250, heartRate = 75) => {
  const data = []
  const samples = sampleRate * duration
  const beatInterval = 60 / heartRate

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate
    const beatPhase = (t % beatInterval) / beatInterval

    let signal = 0

    if (beatPhase >= 0.05 && beatPhase < 0.20) {
      const pPhase = (beatPhase - 0.05) / 0.15
      signal += 0.15 * Math.sin(pPhase * Math.PI)
    } else if (beatPhase >= 0.25 && beatPhase < 0.35) {
      const qrsPhase = (beatPhase - 0.25) / 0.10
      if (qrsPhase < 0.2) signal -= 0.25 * Math.sin(qrsPhase * 5 * Math.PI)
      else if (qrsPhase < 0.6) signal += 1.2 * Math.sin((qrsPhase - 0.2) * 5 * Math.PI)
      else signal -= 0.35 * Math.sin((qrsPhase - 0.6) * 5 * Math.PI)
    } else if (beatPhase >= 0.45 && beatPhase < 0.70) {
      const tPhase = (beatPhase - 0.45) / 0.25
      signal += 0.35 * Math.sin(tPhase * Math.PI)
    }

    signal += 0.05 * Math.sin(2 * Math.PI * 0.5 * t)
    signal += (Math.random() - 0.5) * 0.03

    data.push(Math.round(signal * 1000) / 1000)
  }

  return data
}

// Ham xu ly mo phong phan loai AI tren tin hieu ECG.
function mockAIClassifier(ecgSignal) {
  const results = ["Normal", "AFIB", "Ngoại tâm thu", "Nhịp nhanh", "Nhịp chậm"]
  return results[Math.floor(Math.random() * results.length)]
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

    const heart_rate = Math.floor(Math.random() * (120 - 60 + 1)) + 60
    const ecg_signal = generateFakeECGData()

    const aiResult = mockAIClassifier(ecg_signal)
    const abnormal_detected = aiResult !== "Normal"

    const reading = await prisma.reading.create({
      data: {
        device_id: deviceId,
        heart_rate,
        ecg_signal: JSON.stringify(ecg_signal),
        abnormal_detected,
        ai_result: aiResult,
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
      ai_result: aiResult,
      timestamp: reading.timestamp,
    })

    if (abnormal_detected) {
      const alertType = aiResult
      const message = `Phát hiện dấu hiệu của ${alertType}: Nhịp tim ${heart_rate} bpm`

      const createdAlert = await prisma.alert.create({
        data: {
          user_id: device.user_id,
          reading_id: reading.reading_id,
          alert_type: alertType,
          message,
        },
      })

      emitToUsers(io, recipients, "alert", {
        alert_id: createdAlert.alert_id,
        user_id: device.user_id,
        reading_id: reading.reading_id,
        alert_type: alertType,
        message,
        timestamp: createdAlert.timestamp,
      })

      await createNotification({
        type: NotificationType.ALERT,
        title: "Canh bao suc khoe",
        message,
        actorId: req.user?.user_id,
        entityType: "alert",
        entityId: createdAlert.alert_id,
        payload: {
          user_id: device.user_id,
          alert_type: alertType,
          reading_id: createdAlert.reading_id,
        },
        recipientUserIds: recipients,
        io,
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

// Ham xu ly tao mang ECG gia lap khi thiet bi khong gui du lieu.
function fakeECGSignal(length = 100) {
  const arr = []
  for (let i = 0; i < length; i++) {
    const t = i / 10
    const noise = (Math.random() - 0.5) * 0.2
    arr.push(Math.sin(t) + noise)
  }
  return arr
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

    const ecg = ecg_signal || fakeECGSignal()
    const aiResult = mockAIClassifier(ecg)
    const abnormal_detected = aiResult !== "Normal"

    const reading = await prisma.reading.create({
      data: {
        device_id: device.device_id,
        heart_rate: heart_rate || Math.floor(Math.random() * 60) + 60,
        ecg_signal: JSON.stringify(ecg),
        abnormal_detected,
        ai_result: aiResult,
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
      ai_result: reading.ai_result,
      timestamp: reading.timestamp,
    })

    if (abnormal_detected) {
      const alertType = aiResult
      const message = `Phat hien dau hieu cua ${alertType}: Nhip tim ${reading.heart_rate} bpm`

      const createdAlert = await prisma.alert.create({
        data: {
          user_id: device.user_id,
          reading_id: reading.reading_id,
          alert_type: alertType,
          message,
        },
      })

      emitToUsers(io, recipients, "alert", {
        alert_id: createdAlert.alert_id,
        user_id: device.user_id,
        reading_id: reading.reading_id,
        alert_type: alertType,
        message,
        timestamp: createdAlert.timestamp,
      })

      await createNotification({
        type: NotificationType.ALERT,
        title: "Canh bao suc khoe",
        message,
        actorId: null,
        entityType: "alert",
        entityId: createdAlert.alert_id,
        payload: {
          user_id: device.user_id,
          alert_type: alertType,
          serial_number: device.serial_number,
          reading_id: reading.reading_id,
        },
        recipientUserIds: recipients,
        io,
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
      },
    })

    if (!reading) {
      return res.status(404).json({ message: "Khong tim thay reading" })
    }

    const patientId = reading.device.user_id
    if (requesterId !== patientId) {
      const doctorAccess = await prisma.accessPermission.findFirst({
        where: {
          patient_id: patientId,
          viewer_id: requesterId,
          role: AccessRole.BAC_SI,
          status: AccessStatus.accepted,
        },
        select: { permission_id: true },
      })

      if (!doctorAccess) {
        return res.status(403).json({ message: "Ban khong co quyen xem reading nay" })
      }
    }

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
