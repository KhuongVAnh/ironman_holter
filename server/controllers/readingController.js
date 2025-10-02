const { Reading, Device, User } = require("../models")

// Tạo dữ liệu ECG giả lập
const generateFakeECGData = (duration = 10, sampleRate = 250, heartRate = 75) => {
  const data = []
  const samples = sampleRate * duration
  const beatInterval = 60 / heartRate // khoảng thời gian 1 nhịp tim (giây)

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate
    const beatPhase = (t % beatInterval) / beatInterval // pha trong 1 nhịp tim (0 → 1)

    let signal = 0

    // Sóng P (nhỏ, tròn, trước QRS)
    if (beatPhase >= 0.05 && beatPhase < 0.20) {
      const pPhase = (beatPhase - 0.05) / 0.15
      signal += 0.15 * Math.sin(pPhase * Math.PI)
    }

    // Phức hợp QRS (cao, hẹp)
    else if (beatPhase >= 0.25 && beatPhase < 0.35) {
      const qrsPhase = (beatPhase - 0.25) / 0.10
      // tạo dạng nhọn: Q (âm nhỏ) → R (dương cao) → S (âm vừa)
      if (qrsPhase < 0.2) signal -= 0.25 * Math.sin(qrsPhase * 5 * Math.PI)
      else if (qrsPhase < 0.6) signal += 1.2 * Math.sin((qrsPhase - 0.2) * 5 * Math.PI)
      else signal -= 0.35 * Math.sin((qrsPhase - 0.6) * 5 * Math.PI)
    }

    // Sóng T (dương, rộng, sau QRS)
    else if (beatPhase >= 0.45 && beatPhase < 0.70) {
      const tPhase = (beatPhase - 0.45) / 0.25
      signal += 0.35 * Math.sin(tPhase * Math.PI)
    }

    // Baseline wander (dao động nền rất nhỏ, tần số thấp ~0.5 Hz)
    signal += 0.05 * Math.sin(2 * Math.PI * 0.5 * t)

    // Thêm nhiễu ngẫu nhiên nhỏ
    signal += (Math.random() - 0.5) * 0.03

    // Làm tròn 3 chữ số
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

    // 🔹 AI phân loại ngay
    const aiResult = mockAIClassifier(ecg_signal);

    const reading = await Reading.create({
      device_id: device_id || 'device_1', // default = 1
      heart_rate: heart_rate,
      ecg_signal: JSON.stringify(ecg_signal),
      abnormal_detected: false,
      ai_result: aiResult,
      timestamp: new Date(),
    });

    // Gửi dữ liệu realtime qua Socket.IO
    const io = req.app.get("io")
    io.emit("fake-reading", {
      device_id: device_id || 'device_1', // default = 1
      heart_rate: heart_rate,
      ecg_signal: ecg_signal,
      abnormal_detected: false,
      ai_result: aiResult,
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

// Sinh ECG giả nếu ESP32 chưa có sensor
function fakeECGSignal(length = 100) {
  let arr = [];
  for (let i = 0; i < length; i++) {
    const t = i / 10;
    const noise = (Math.random() - 0.5) * 0.2;
    arr.push(Math.sin(t) + noise);
  }
  return arr;
}

// Fake AI classifier (sau này thay bằng call API AI thật)
function mockAIClassifier(ecgSignal) {
  const results = ["Normal", "AFIB", "Ngoại tâm thu", "Nhịp nhanh"];
  return results[Math.floor(Math.random() * results.length)];

  // có AI thì lấy code dưới đây
  // try {
  //   const response = await axios.post("http://localhost:5001/classify", {
  //     ecg_signal: ecgSignal,
  //   });
  //   return response.data.result || "Unknown";
  // } catch (error) {
  //   console.error("AI service error:", error.message);
  //   return "AI_ERROR";
  // }
}

const receiveTelemetry = async (req, res) => {
  try {
    const { device_id, heart_rate, ecg_signal } = req.body;
    const io = req.app.get("io");

    // Nếu không có ecg_signal từ ESP32 thì sinh dữ liệu fake
    const ecg = ecg_signal || fakeECGSignal();

    // 🔹 AI phân loại ngay
    const aiResult = mockAIClassifier(ecg);

    const reading = await Reading.create({
      device_id: device_id || 'device_1',
      heart_rate: heart_rate || Math.floor(Math.random() * 60) + 60,
      ecg_signal: JSON.stringify(ecg),
      abnormal_detected: false,
      ai_result: aiResult,
    });


    // 🔹 phát realtime tới frontend
    io.emit("reading-update", {
      reading_id: reading.reading_id,
      device_id: reading.device_id,
      heart_rate: reading.heart_rate,
      ecg_signal: ecg,
      ai_result: reading.ai_result,
      timestamp: reading.timestamp,
    });

    return res.status(201).json({
      message: "Telemetry data received",
      data: reading,
    });
  } catch (error) {
    console.error("Error receiving telemetry:", error);
    return res.status(500).json({ error: "Failed to receive telemetry" });
  }
};

module.exports = {
  createFakeReading,
  getDeviceReadings,
  getUserReadingHistory,
  receiveTelemetry,
}
