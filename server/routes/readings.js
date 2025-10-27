const express = require("express")
const { createFakeReading, getDeviceReadings, getUserReadingHistory,
    receiveTelemetry, createReading 
 } = require("../controllers/readingController")
const { authenticateToken, authorizeRoles } = require("../middleware/auth")

const router = express.Router()
// route cho ESP32 gửi dữ liệu
router.post("/telemetry", receiveTelemetry);

// Tạo dữ liệu đọc giả lập
router.post("/fake", authenticateToken, createFakeReading)

// Lấy dữ liệu đọc của thiết bị
router.get("/:device_id", authenticateToken, getDeviceReadings)

// Lấy lịch sử đọc của người dùng
router.get("/history/:user_id", authenticateToken, getUserReadingHistory)


module.exports = router
