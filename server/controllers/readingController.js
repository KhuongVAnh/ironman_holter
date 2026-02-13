const prisma = require("../prismaClient")

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

function mockAIClassifier(ecgSignal) {
  const results = ["Normal", "AFIB", "Ngoại tâm thu", "Nhịp nhanh", "Nhịp chậm"]
  return results[Math.floor(Math.random() * results.length)]
}

const createFakeReading = async (req, res) => {
  try {
    const { device_id } = req.body

    const device = await prisma.device.findUnique({ where: { device_id } })
    if (!device) {
      return res.status(404).json({ message: "Không tìm thấy thiết bị" })
    }

    const heart_rate = Math.floor(Math.random() * (120 - 60 + 1)) + 60
    const ecg_signal = generateFakeECGData()

    const aiResult = mockAIClassifier(ecg_signal)
    const abnormal_detected = aiResult !== "Normal"

    const reading = await prisma.reading.create({
      data: {
        device_id: device_id || "device_1",
        heart_rate,
        ecg_signal: JSON.stringify(ecg_signal),
        abnormal_detected: false,
        ai_result: aiResult,
        timestamp: new Date(),
      },
    })

    const io = req.app.get("io")
    io.emit("fake-reading", {
      device_id: device_id || "device_1",
      heart_rate,
      ecg_signal,
      abnormal_detected: false,
      ai_result: aiResult,
      timestamp: reading.timestamp,
    })

    if (abnormal_detected) {
      const alertType = aiResult
      const message = `Phát hiện dấu hiệu của ${alertType}: Nhịp tim ${heart_rate} bpm`

      await prisma.alert.create({
        data: {
          user_id: device.user_id,
          alert_type: alertType,
          message,
        },
      })

      io.emit("alert", {
        user_id: device.user_id,
        alert_type: alertType,
        message,
        timestamp: new Date(),
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

const getDeviceReadings = async (req, res) => {
  try {
    const { device_id } = req.params
    const { limit = 50, offset = 0 } = req.query

    const readings = await prisma.reading.findMany({
      where: { device_id },
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

function fakeECGSignal(length = 100) {
  const arr = []
  for (let i = 0; i < length; i++) {
    const t = i / 10
    const noise = (Math.random() - 0.5) * 0.2
    arr.push(Math.sin(t) + noise)
  }
  return arr
}

const receiveTelemetry = async (req, res) => {
  try {
    const { device_id, heart_rate, ecg_signal } = req.body
    const io = req.app.get("io")

    const ecg = ecg_signal || fakeECGSignal()

    const aiResult = mockAIClassifier(ecg)
    const abnormal_detected = aiResult !== "Normal"

    const reading = await prisma.reading.create({
      data: {
        device_id: device_id || "device_1",
        heart_rate: heart_rate || Math.floor(Math.random() * 60) + 60,
        ecg_signal: JSON.stringify(ecg),
        abnormal_detected: false,
        ai_result: "Bình thường",
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

    io.emit("reading-update", {
      reading_id: reading.reading_id,
      device_id: reading.device_id,
      heart_rate: reading.heart_rate,
      ecg_signal: mergedECG,
      ai_result: reading.ai_result,
      timestamp: reading.timestamp,
    })

    if (abnormal_detected) {
      const alertType = aiResult
      const message = `Phát hiện dấu hiệu của ${alertType}: Nhịp tim ${heart_rate} bpm`

      const device = await prisma.device.findUnique({
        where: { device_id: reading.device_id },
      })

      await prisma.alert.create({
        data: {
          user_id: device.user_id,
          alert_type: alertType,
          message,
        },
      })

      io.emit("alert", {
        user_id: device.user_id,
        alert_type: alertType,
        message,
        timestamp: new Date(),
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

module.exports = {
  createFakeReading,
  getDeviceReadings,
  getUserReadingHistory,
  receiveTelemetry,
}
