"use client"

import { useState, useEffect, useRef } from "react"
import axios from "axios"
import { toast } from "react-toastify"

const Chatbot = ({ userId, userRole }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState([])
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (isOpen && userId) {
      loadChatHistory()
    }
  }, [isOpen, userId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const loadChatHistory = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/chat/history/${userId}`)
      const history = response.data.history || []

      // Convert history to messages format
      const formattedMessages = []
      history.forEach((chat) => {
        formattedMessages.push({
          id: `user-${chat.id}`,
          text: chat.user_message,
          sender: "user",
          timestamp: new Date(chat.created_at),
        })
        formattedMessages.push({
          id: `bot-${chat.id}`,
          text: chat.bot_response,
          sender: "bot",
          timestamp: new Date(chat.created_at),
        })
      })

      setMessages(formattedMessages)
      setChatHistory(history)
    } catch (error) {
      console.error("Lỗi tải lịch sử chat:", error)
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage = {
      id: `user-${Date.now()}`,
      text: inputMessage,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputMessage("")
    setIsLoading(true)

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/chat`, {
        message: inputMessage,
        userId: userId,
        userRole: userRole,
      })

      const botMessage = {
        id: `bot-${Date.now()}`,
        text: response.data.response,
        sender: "bot",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, botMessage])
    } catch (error) {
      console.error("Lỗi gửi tin nhắn:", error)
      toast.error("Không thể gửi tin nhắn. Vui lòng thử lại.")

      const errorMessage = {
        id: `bot-error-${Date.now()}`,
        text: "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.",
        sender: "bot",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
    setChatHistory([])
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getWelcomeMessage = () => {
    switch (userRole) {
      case "bệnh nhân":
        return "Xin chào! Tôi là trợ lý AI của hệ thống Ironman Holter. Tôi có thể giúp bạn hiểu về tình trạng tim mạch, giải thích các chỉ số ECG, và trả lời các câu hỏi về sức khỏe tim mạch của bạn."
      case "bác sĩ":
        return "Xin chào bác sĩ! Tôi có thể hỗ trợ phân tích dữ liệu ECG, đưa ra gợi ý chẩn đoán, và cung cấp thông tin y khoa cập nhật về các bệnh lý tim mạch."
      case "gia đình":
        return "Xin chào! Tôi có thể giúp bạn hiểu về tình trạng sức khỏe của người thân, giải thích các cảnh báo, và hướng dẫn cách chăm sóc bệnh nhân tim mạch."
      case "admin":
        return "Xin chào admin! Tôi có thể hỗ trợ phân tích dữ liệu hệ thống, thống kê sử dụng, và trả lời các câu hỏi về quản trị hệ thống."
      default:
        return "Xin chào! Tôi là trợ lý AI của hệ thống Ironman Holter. Tôi có thể giúp bạn với các câu hỏi về tim mạch và sức khỏe."
    }
  }

  return (
    <>
      {/* Chat Toggle Button */}
      <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1050 }}>
        <button
          className="btn btn-primary rounded-circle shadow-lg"
          style={{ width: "60px", height: "60px" }}
          onClick={() => setIsOpen(!isOpen)}
        >
          <i className={`fas ${isOpen ? "fa-times" : "fa-robot"}`}></i>
        </button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div
          className="position-fixed bottom-0 end-0 me-3 mb-5 bg-white rounded-3 shadow-lg border"
          style={{
            width: "400px",
            height: "500px",
            zIndex: 1040,
            maxWidth: "90vw",
          }}
        >
          {/* Chat Header */}
          <div className="bg-primary text-white p-3 rounded-top-3 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <i className="fas fa-robot me-2"></i>
              <div>
                <h6 className="mb-0">Trợ lý AI Ironman</h6>
                <small className="opacity-75">Hỗ trợ tim mạch 24/7</small>
              </div>
            </div>
            <div className="dropdown">
              <button className="btn btn-sm btn-outline-light border-0" data-bs-toggle="dropdown">
                <i className="fas fa-ellipsis-v"></i>
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                <li>
                  <button className="dropdown-item" onClick={clearChat}>
                    <i className="fas fa-trash me-2"></i>
                    Xóa cuộc trò chuyện
                  </button>
                </li>
                <li>
                  <button className="dropdown-item" onClick={() => setIsOpen(false)}>
                    <i className="fas fa-times me-2"></i>
                    Đóng chat
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="p-3 overflow-auto" style={{ height: "350px" }}>
            {messages.length === 0 && (
              <div className="text-center py-4">
                <i className="fas fa-robot fa-3x text-primary mb-3"></i>
                <div className="alert alert-info border-0 shadow-sm">
                  <small>{getWelcomeMessage()}</small>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-3 d-flex ${message.sender === "user" ? "justify-content-end" : "justify-content-start"}`}
              >
                <div
                  className={`rounded-3 p-2 shadow-sm ${message.sender === "user" ? "bg-primary text-white ms-5" : "bg-light me-5"
                    }`}
                  style={{ maxWidth: "80%" }}
                >
                  {message.sender === "bot" && (
                    <div className="d-flex align-items-center mb-1">
                      <i className="fas fa-robot me-2 text-primary"></i>
                      <small className="text-muted">Trợ lý AI</small>
                    </div>
                  )}
                  <div className="mb-1" style={{ whiteSpace: "pre-wrap" }}>
                    {message.text}
                  </div>
                  <small className={`${message.sender === "user" ? "text-white-50" : "text-muted"}`}>
                    {formatTime(message.timestamp)}
                  </small>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="mb-3 d-flex justify-content-start">
                <div className="bg-light rounded-3 p-2 shadow-sm me-5">
                  <div className="d-flex align-items-center">
                    <i className="fas fa-robot me-2 text-primary"></i>
                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                      <span className="visually-hidden">Đang tải...</span>
                    </div>
                    <small className="text-muted">Đang suy nghĩ...</small>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-3 border-top">
            <div className="input-group">
              <textarea
                className="form-control border-0 bg-light"
                placeholder="Nhập câu hỏi về tim mạch..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                rows="1"
                style={{ resize: "none" }}
                disabled={isLoading}
              />
              <button className="btn btn-primary" onClick={sendMessage} disabled={!inputMessage.trim() || isLoading}>
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
            <small className="text-muted">
              <i className="fas fa-info-circle me-1"></i>
              Nhấn Enter để gửi, Shift+Enter để xuống dòng
            </small>
          </div>
        </div>
      )}
    </>
  )
}

export default Chatbot
