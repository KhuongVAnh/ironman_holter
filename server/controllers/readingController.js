const { Reading, Device, User } = require("../models")

// Tạo dữ liệu ECG giả lập
const generateFakeECGData = () => {
  const data = []
  const sampleRate = 250 // 250 Hz
  const duration = 10 // 10 giây
  const samples = sampleRate * duration

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate
    // Tạo tín hiệu ECG cơ bản với sóng P, QRS, T
    let signal = 0

    // Sóng QRS (chính)
    const heartRate = 75 // 75 bpm
    const beatInterval = 60 / heartRate
    const beatPhase = (t % beatInterval) / beatInterval

    if (beatPhase < 0.1) {
      // Sóng P
      signal += 0.1 * Math.sin(beatPhase * 20 * Math.PI)
    } else if (beatPhase > 0.15 && beatPhase < 0.25) {
      // Phức hợp QRS
      const qrsPhase = (beatPhase - 0.15) / 0.1
      signal += Math.sin(qrsPhase * Math.PI) * (qrsPhase < 0.3 ? -0.2 : qrsPhase < 0.7 ? 1.0 : 0.3)
    } else if (beatPhase > 0.4 && beatPhase < 0.6) {
      // Sóng T
      const tPhase = (beatPhase - 0.4) / 0.2
      signal += 0.3 * Math.sin(tPhase * Math.PI)
    }

    // Thêm nhiễu nhỏ
    signal += (Math.random() - 0.5) * 0.05

    data.push(Math.round(signal * 1000) / 1000)
  }

  return data
}

const createFakeReading = async (req, res) => {
  try {
    const { device_id } = req.body

    // Kiểm tra thiết bị tồn tại
    const device = await Device.findByPk(device_id)
    if (!device) {
      return res.status(404).json({ message: "Không tìm thấy thiết bị" })
    }

    // Tạo dữ liệu giả
    const heart_rate = Math.floor(Math.random() * (120 - 60 + 1)) + 60 // 60-120 bpm
    const ecg_signal = generateFakeECGData()

    // Phát hiện bất thường đơn giản
    const abnormal_detected = heart_rate > 100 || heart_rate < 60

    const reading = await Reading.create({
      device_id,
      heart_rate,
      ecg_signal,
      abnormal_detected,
    })

    // Gửi dữ liệu realtime qua Socket.IO
    const io = req.app.get("io")
    io.emit("fake-reading", {
      device_id,
      heart_rate,
      ecg_signal: ecg_signal.slice(0, 100), // Chỉ gửi 100 điểm đầu cho realtime
      abnormal_detected,
      timestamp: reading.timestamp,
    })

    // Tạo cảnh báo nếu phát hiện bất thường
    if (abnormal_detected) {
      const { Alert } = require("../models")
      const alertType = heart_rate > 100 ? "nhịp nhanh" : "nhịp chậm"
      const message = `Phát hiện ${alertType}: ${heart_rate} bpm`

      await Alert.create({
        user_id: device.user_id,
        alert_type: alertType,
        message,
      })

      // Gửi cảnh báo realtime
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

    const readings = await Reading.findAll({
      where: { device_id },
      order: [["timestamp", "DESC"]],
      limit: Number.parseInt(limit),
      offset: Number.parseInt(offset),
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

    const readings = await Reading.findAll({
      include: [
        {
          model: Device,
          where: { user_id },
          attributes: ["device_id", "serial_number"],
        },
      ],
      order: [["timestamp", "DESC"]],
      limit: Number.parseInt(limit),
      offset: Number.parseInt(offset),
    })

    res.json({ readings })
  } catch (error) {
    console.error("Lỗi lấy lịch sử đọc:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

module.exports = {
  createFakeReading,
  getDeviceReadings,
  getUserReadingHistory,
}
