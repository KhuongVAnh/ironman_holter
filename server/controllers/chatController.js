const axios = require("axios")
const { ChatLog } = require("../models")

// Chat với Gemini
const chatWithGemini = async (req, res) => {
  try {
    const { message } = req.body
    const user_id = req.user.user_id

    // Lưu message user
    await ChatLog.create({
      user_id,
      role: "user",
      message,
    })

    // Gọi Gemini
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`

    const response = await axios.post(
      url,
      {
        contents: [
          {
            parts: [{
              text: `
                  Bạn là một trợ lý AI chuyên môn tim mạch, giống như một bác sĩ tim mạch.
                  Hãy luôn trả lời bằng tiếng Việt, ngắn gọn, dễ hiểu, chuyên nghiệp.
                  Khi có triệu chứng nguy hiểm (ví dụ: đau ngực dữ dội, khó thở nặng, ngất xỉu), 
                  hãy nhấn mạnh rằng bệnh nhân cần đi khám hoặc gọi cấp cứu ngay lập tức.
                  Không đưa ra chẩn đoán tuyệt đối, luôn khuyên bệnh nhân đi khám bác sĩ chuyên khoa.
                  ---
                  Câu hỏi của bệnh nhân: ${message}
                  `,
            }],
          },
        ],
      },
      { headers: { "Content-Type": "application/json" } }
    )

    const botReply =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Xin lỗi, tôi chưa nhận được phản hồi từ hệ thống."

    // Lưu message bot
    await ChatLog.create({
      user_id,
      role: "bot",
      message: botReply,
    })

    // 🚀 Đổi key trả về thành "response" để khớp frontend
    res.json({ response: botReply })
  } catch (error) {
    console.error("Lỗi chat với Gemini:", error.response?.data || error.message)

    const defaultReply =
      "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau."

    await ChatLog.create({
      user_id: req.user.user_id,
      role: "bot",
      message: defaultReply,
    })

    res.json({ response: defaultReply })
  }
}

// Lấy lịch sử chat
const getChatHistory = async (req, res) => {
  try {
    const user_id = req.user.user_id

    const chatLogs = await ChatLog.findAll({
      where: { user_id },
      order: [["timestamp", "ASC"]],
    })

    res.json({ history: chatLogs })
  } catch (error) {
    console.error("Lỗi lấy lịch sử chat:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

module.exports = { chatWithGemini, getChatHistory }
