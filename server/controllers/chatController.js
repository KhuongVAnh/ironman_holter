const axios = require("axios")
const { ChatLog } = require("../models")

const chatWithGemini = async (req, res) => {
  try {
    const { message } = req.body
    const user_id = req.user.user_id

    // Lưu tin nhắn của người dùng
    await ChatLog.create({
      user_id,
      role: "user",
      message,
    })

    // Gọi Google Gemini API
    const geminiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: `Bạn là một trợ lý AI chuyên về sức khỏe tim mạch. Hãy trả lời câu hỏi sau bằng tiếng Việt một cách chuyên nghiệp và dễ hiểu: ${message}`,
              },
            ],
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    )

    const botReply = geminiResponse.data.candidates[0].content.parts[0].text

    // Lưu phản hồi của bot
    await ChatLog.create({
      user_id,
      role: "bot",
      message: botReply,
    })

    res.json({ reply: botReply })
  } catch (error) {
    console.error("Lỗi chat với Gemini:", error)

    // Phản hồi mặc định khi có lỗi
    const defaultReply =
      "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau hoặc liên hệ với bác sĩ của bạn nếu có vấn đề khẩn cấp."

    await ChatLog.create({
      user_id: req.user.user_id,
      role: "bot",
      message: defaultReply,
    })

    res.json({ reply: defaultReply })
  }
}

const getChatHistory = async (req, res) => {
  try {
    const user_id = req.user.user_id
    const { limit = 50, offset = 0 } = req.query

    const chatLogs = await ChatLog.findAll({
      where: { user_id },
      order: [["timestamp", "ASC"]],
      limit: Number.parseInt(limit),
      offset: Number.parseInt(offset),
    })

    res.json({ chatLogs })
  } catch (error) {
    console.error("Lỗi lấy lịch sử chat:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

module.exports = {
  chatWithGemini,
  getChatHistory,
}
