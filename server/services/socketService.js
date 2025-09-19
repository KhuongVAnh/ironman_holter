const socketService = {
  io: null,

  init(io) {
    this.io = io
    this.setupSocketHandlers()
  },

  setupSocketHandlers() {
    this.io.on("connection", (socket) => {
      console.log("Người dùng đã kết nối:", socket.id)

      // Join room theo user_id để nhận cảnh báo cá nhân
      socket.on("join-user-room", (userId) => {
        socket.join(`user-${userId}`)
        console.log(`User ${userId} joined room user-${userId}`)

        // Gửi thông báo kết nối thành công
        socket.emit("connection-status", {
          status: "connected",
          message: "Kết nối real-time thành công",
          timestamp: new Date(),
        })
      })

      // Join room theo role để nhận thông báo theo vai trò
      socket.on("join-role-room", (role) => {
        socket.join(`role-${role}`)
        console.log(`User joined role room: role-${role}`)
      })

      // Join room theo device để nhận dữ liệu ECG real-time
      socket.on("join-device-room", (deviceId) => {
        socket.join(`device-${deviceId}`)
        console.log(`User joined device room: device-${deviceId}`)
      })

      // Xử lý yêu cầu dữ liệu ECG real-time
      socket.on("request-ecg-data", (data) => {
        const { userId, deviceId } = data
        console.log(`ECG data requested for user ${userId}, device ${deviceId}`)

        // Bắt đầu stream dữ liệu ECG giả lập
        this.startECGStream(socket, userId, deviceId)
      })

      // Dừng stream ECG
      socket.on("stop-ecg-stream", (data) => {
        const { userId, deviceId } = data
        console.log(`ECG stream stopped for user ${userId}, device ${deviceId}`)

        if (socket.ecgInterval) {
          clearInterval(socket.ecgInterval)
          socket.ecgInterval = null
        }
      })

      // Xử lý tin nhắn chat real-time
      socket.on("send-chat-message", (data) => {
        const { senderId, receiverId, message, senderRole } = data

        // Gửi tin nhắn đến người nhận
        this.io.to(`user-${receiverId}`).emit("new-chat-message", {
          senderId,
          message,
          senderRole,
          timestamp: new Date(),
        })
      })

      // Xử lý cảnh báo khẩn cấp
      socket.on("emergency-alert", (data) => {
        const { userId, alertType, message, severity } = data
        console.log(`Emergency alert from user ${userId}: ${alertType}`)

        // Gửi cảnh báo đến bác sĩ và gia đình
        this.io.to(`role-bác sĩ`).emit("emergency-alert", {
          userId,
          alertType,
          message,
          severity,
          timestamp: new Date(),
        })

        this.io.to(`role-gia đình`).emit("emergency-alert", {
          userId,
          alertType,
          message,
          severity,
          timestamp: new Date(),
        })
      })

      socket.on("disconnect", () => {
        console.log("Người dùng đã ngắt kết nối:", socket.id)

        // Dọn dẹp interval nếu có
        if (socket.ecgInterval) {
          clearInterval(socket.ecgInterval)
        }
      })
    })
  },

  // Bắt đầu stream dữ liệu ECG giả lập
  startECGStream(socket, userId, deviceId) {
    if (socket.ecgInterval) {
      clearInterval(socket.ecgInterval)
    }

    socket.ecgInterval = setInterval(() => {
      const ecgData = this.generateFakeECGData()

      socket.emit("ecg-data", {
        userId,
        deviceId,
        data: ecgData,
        timestamp: new Date(),
      })

      // Phát hiện bất thường và gửi cảnh báo
      this.detectAbnormalities(ecgData, userId, deviceId)
    }, 1000) // Gửi dữ liệu mỗi giây
  },

  // Tạo dữ liệu ECG giả lập
  generateFakeECGData() {
    const baseHeartRate = 70 + Math.random() * 20 // 70-90 BPM
    const timestamp = Date.now()

    // Tạo sóng ECG giả lập (P, QRS, T waves)
    const ecgPoints = []
    for (let i = 0; i < 100; i++) {
      let value = 0

      // P wave (10-20)
      if (i >= 10 && i <= 20) {
        value = 0.2 * Math.sin(((i - 10) * Math.PI) / 10)
      }
      // QRS complex (30-50)
      else if (i >= 30 && i <= 50) {
        if (i >= 35 && i <= 45) {
          value = i === 40 ? 1.0 : 0.5 * Math.sin(((i - 35) * Math.PI) / 10)
        } else {
          value = -0.2
        }
      }
      // T wave (60-80)
      else if (i >= 60 && i <= 80) {
        value = 0.3 * Math.sin(((i - 60) * Math.PI) / 20)
      }

      // Thêm nhiễu nhỏ
      value += (Math.random() - 0.5) * 0.05

      ecgPoints.push({
        x: timestamp + i * 10,
        y: value,
      })
    }

    return {
      heartRate: Math.round(baseHeartRate),
      ecgPoints,
      quality: Math.random() > 0.1 ? "good" : "poor",
      batteryLevel: Math.round(80 + Math.random() * 20),
    }
  },

  // Phát hiện bất thường trong dữ liệu ECG
  detectAbnormalities(ecgData, userId, deviceId) {
    const { heartRate } = ecgData

    let alertType = null
    let severity = "low"
    let message = ""

    if (heartRate > 100) {
      alertType = "nhịp nhanh"
      severity = heartRate > 120 ? "high" : "medium"
      message = `Nhịp tim cao: ${heartRate} BPM`
    } else if (heartRate < 60) {
      alertType = "nhịp chậm"
      severity = heartRate < 45 ? "high" : "medium"
      message = `Nhịp tim thấp: ${heartRate} BPM`
    }

    // Phát hiện rung nhĩ (giả lập)
    if (Math.random() < 0.02) {
      // 2% chance
      alertType = "rung nhĩ"
      severity = "high"
      message = "Phát hiện nhịp tim không đều - nghi ngờ rung nhĩ"
    }

    if (alertType) {
      this.sendAlert(userId, deviceId, alertType, message, severity)
    }
  },

  // Gửi cảnh báo real-time
  sendAlert(userId, deviceId, alertType, message, severity) {
    const alertData = {
      userId,
      deviceId,
      alertType,
      message,
      severity,
      timestamp: new Date(),
      status: "pending",
    }

    // Gửi đến user
    this.io.to(`user-${userId}`).emit("new-alert", alertData)

    // Gửi đến bác sĩ
    this.io.to(`role-bác sĩ`).emit("patient-alert", {
      ...alertData,
      patientId: userId,
    })

    // Gửi đến gia đình
    this.io.to(`role-gia đình`).emit("family-alert", {
      ...alertData,
      patientId: userId,
    })

    console.log(`Alert sent: ${alertType} for user ${userId}`)
  },

  // Gửi thông báo hệ thống
  sendSystemNotification(targetRoom, notification) {
    this.io.to(targetRoom).emit("system-notification", {
      ...notification,
      timestamp: new Date(),
    })
  },

  // Gửi cập nhật trạng thái thiết bị
  sendDeviceStatusUpdate(deviceId, status) {
    this.io.emit("device-status-update", {
      deviceId,
      status,
      timestamp: new Date(),
    })
  },

  // Gửi thống kê real-time cho admin
  sendAdminStats(stats) {
    this.io.to("role-admin").emit("admin-stats-update", {
      ...stats,
      timestamp: new Date(),
    })
  },
}

module.exports = socketService
