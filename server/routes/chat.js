const express = require("express")
const {
  chatWithGemini,
  getChatHistory,
  getDirectChatContacts,
  getDirectMessages,
  sendDirectMessage,
  markDirectMessagesRead,
} = require("../controllers/chatController")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

// Chat voi Gemini AI
router.post("/", authenticateToken, chatWithGemini)

// Lay lich su chat AI
router.get("/history", authenticateToken, getChatHistory)

// Danh sach contact direct chat bac si - benh nhan
router.get("/contacts", authenticateToken, getDirectChatContacts)

// Lay lich su chat direct voi 1 user cu the
router.get("/direct/:other_user_id", authenticateToken, getDirectMessages)

// Gui tin nhan direct
router.post("/direct", authenticateToken, sendDirectMessage)

// Danh dau doc tin nhan direct tu 1 user
router.put("/direct/:other_user_id/read", authenticateToken, markDirectMessagesRead)

module.exports = router
