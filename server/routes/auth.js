const express = require("express")
const { register, login, getMe } = require("../controllers/authController")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

// Đăng ký
router.post("/register", register)

// Đăng nhập
router.post("/login", login)

// Lấy thông tin người dùng hiện tại
router.get("/me", authenticateToken, getMe)

module.exports = router
