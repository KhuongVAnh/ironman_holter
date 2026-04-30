// class SocketService
const socketService = {
  io: null,

  // Hàm khởi tạo Socket.IO và thiết lập các event handlers
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

      // Relay trạng thái typing theo cặp user để client có thể hiển thị "đang nhập...".
      socket.on("direct-message:typing", (payload = {}) => {
        const senderId = Number.parseInt(payload?.sender_id, 10)
        const receiverId = Number.parseInt(payload?.receiver_id, 10)

        if (!Number.isInteger(senderId) || !Number.isInteger(receiverId)) return
        if (senderId === receiverId) return

        this.io.to(`user-${receiverId}`).emit("direct-message:typing", {
          sender_id: senderId,
          receiver_id: receiverId,
          is_typing: Boolean(payload?.is_typing),
          conversation_key: payload?.conversation_key || null,
          timestamp: new Date().toISOString(),
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
}

module.exports = socketService
