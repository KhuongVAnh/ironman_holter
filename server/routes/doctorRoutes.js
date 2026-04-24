const express = require("express")
const router = express.Router()
const doctorController = require("../controllers/doctorController")
const { authenticateToken, authorizeRoles } = require("../middleware/auth")

// Lấy danh sách bệnh nhân được phép xem
router.get("/patients/:viewer_id", authenticateToken, authorizeRoles("bác sĩ"), doctorController.getAccessiblePatients)


module.exports = router
