const express = require("express")
const { chatWithGemini, getChatHistory } = require("../controllers/chatController")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

// Chat với Gemini AI
router.post("/", authenticateToken, chatWithGemini)

// Lấy lịch sử chat
router.get("/history", authenticateToken, getChatHistory)

module.exports = router
