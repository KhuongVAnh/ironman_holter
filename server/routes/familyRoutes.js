const express = require("express")
const router = express.Router()
const familyController = require("../controllers/familyController")
const { authenticateToken, authorizeRoles } = require("../middleware/auth")

// Danh sách bệnh nhân được phép xem
router.get("/patients/:viewer_id", authenticateToken, authorizeRoles("gia đình"), familyController.getAccessiblePatients)

module.exports = router
