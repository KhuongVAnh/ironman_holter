const express = require("express")
const { createReport, getUserReports, getDoctorReports } = require("../controllers/reportController")
const { authenticateToken, authorizeRoles } = require("../middleware/auth")

const router = express.Router()

// Tạo báo cáo cho bệnh nhân (chỉ bác sĩ)
router.post("/:user_id", authenticateToken, authorizeRoles("bác sĩ"), createReport)

// Lấy báo cáo của bệnh nhân
router.get("/:user_id", authenticateToken, getUserReports)

// Lấy báo cáo do bác sĩ tạo
router.get("/doctor/my-reports", authenticateToken, authorizeRoles("bác sĩ"), getDoctorReports)

module.exports = router
