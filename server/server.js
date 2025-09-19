require("dotenv").config()
const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const http = require("http")
const socketIo = require("socket.io")

const { sequelize } = require("./models")
const socketService = require("./services/socketService")

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
})

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use("/api/auth", require("./routes/auth"))
app.use("/api/users", require("./routes/users"))
app.use("/api/devices", require("./routes/devices"))
app.use("/api/readings", require("./routes/readings"))
app.use("/api/alerts", require("./routes/alerts"))
app.use("/api/reports", require("./routes/reports"))
app.use("/api/chat", require("./routes/chat"))

socketService.init(io)

// Lưu io instance để sử dụng trong các controller khác
app.set("io", io)
app.set("socketService", socketService)

const PORT = process.env.PORT || 4000

// Khởi động server
const startServer = async () => {
  try {
    // Kiểm tra kết nối database
    await sequelize.authenticate()
    console.log("Kết nối database thành công")

    // Đồng bộ models (chỉ trong development)
    if (process.env.NODE_ENV === "development") {
      await sequelize.sync({ alter: true })
      console.log("Đồng bộ database thành công")
    }

    server.listen(PORT, () => {
      console.log(`Server đang chạy trên port ${PORT}`)
      console.log("Socket.IO service đã được khởi tạo")
    })
  } catch (error) {
    console.error("Không thể khởi động server:", error)
    process.exit(1)
  }
}

startServer()
