const path = require("path")
const dotenv = require("dotenv")

// Quy tac uu tien env:
// 1) server/.env la nguon chinh
// 2) root .env chi bo sung key con thieu (khong override key da co)
dotenv.config({ path: path.resolve(__dirname, ".env") })
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: false })
const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const http = require("http")
const socketIo = require("socket.io")

const prisma = require("./prismaClient")
const socketService = require("./services/socketService")

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
  },
})

// view engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

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
app.use("/api/notifications", require("./routes/notifications"))
app.use("/api/reports", require("./routes/reports"))
app.use("/api/chat", require("./routes/chat"))
app.use("/test", require('./routes/routesServer'))
app.use("/api/access", require("./routes/access"));
app.use("/api/history", require("./routes/medicalHistory"));
app.use("/api/doctor", require("./routes/doctorRoutes"))
app.use("/api/family", require("./routes/familyRoutes"))

socketService.init(io)

// Lưu io instance để sử dụng trong các controller khác
app.set("io", io)
app.set("socketService", socketService)

const PORT = process.env.PORT || 4000

// Khởi động server
const startServer = async () => {
  try {
    // Kiểm tra kết nối database
    await prisma.$connect()
    console.log("Kết nối database thành công")


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
