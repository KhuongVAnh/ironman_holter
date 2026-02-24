const express = require("express")
const { createReport, getUserReports, getDoctorReports } = require("../controllers/reportController")
const { authenticateToken, authorizeRoles } = require("../middleware/auth")

const DOCTOR_ROLE = "bác sĩ"

const router = express.Router()

// Create report for patient (doctor only)
router.post("/:user_id", authenticateToken, authorizeRoles(DOCTOR_ROLE), createReport)

// Get reports of a patient
router.get("/:user_id", authenticateToken, getUserReports)

// Get reports created by doctor, or all reports if admin
router.get("/doctor/my-reports", authenticateToken, authorizeRoles(DOCTOR_ROLE, "admin"), getDoctorReports)

module.exports = router
