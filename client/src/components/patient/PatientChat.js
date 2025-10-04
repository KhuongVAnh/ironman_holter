"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "../../contexts/AuthContext"
import useSocket from "../../hooks/useSocket"
import axios from "axios"
import { toast } from "react-toastify"

const PatientChat = () => {
  const { user } = useAuth()
  const { sendChatMessage } = useSocket(user?.id, user?.role)
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRecipient, setSelectedRecipient] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [familyMembers, setFamilyMembers] = useState([])
  const messagesEndRef = useRef(null)

  useEffect(() => {
    loadContacts()
    loadChatHistory()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Lắng nghe tin nhắn mới từ Socket.IO
    const handleNewMessage = (event) => {
      const messageData = event.detail
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: messageData.message,
          sender: "other",
          senderRole: messageData.senderRole,
          timestamp: new Date(messageData.timestamp),
        },
      ])
    }

    window.addEventListener("newChatMessage", handleNewMessage)
    return () => window.removeEventListener("newChatMessage", handleNewMessage)
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const loadContacts = async () => {
    try {
      // Load doctors
      const doctorsResponse = await axios.get("http://localhost:4000/api/users", {
        params: { role: "bác sĩ" },
      })
      setDoctors(doctorsResponse.data.users || [])

      // Load family members (mock data for now)
      setFamilyMembers([
        { id: "family1", full_name: "Nguyễn Văn A (Con trai)", role: "gia đình" },
        { id: "family2", full_name: "Trần Thị B (Con gái)", role: "gia đình" },
      ])
    } catch (error) {
      console.error("Lỗi tải danh bạ:", error)
      // toast.error("Không thể tải danh sách liên hệ")
    }
  }

  const loadChatHistory = async () => {
    try {
      const response = await axios.get(`http://localhost:4000/api/chat/history/${user.id}`)
      const history = response.data.history || []

      // Convert từ chat_logs trong DB -> messages format
      const formattedMessages = history.map((chat) => ({
        id: `${chat.role}-${chat.chat_id}`,
        text: chat.message,
        sender: chat.role, // "user" hoặc "bot"
        timestamp: new Date(chat.timestamp),
      }))

      setMessages(formattedMessages)
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

    if (selectedRecipient) {
      // Gửi qua socket nếu có người nhận cụ thể
      sendChatMessage(selectedRecipient.id, inputMessage, user.role)
    } else {
      // Gửi cho AI bot
      setIsLoading(true)
      try {
        const response = await axios.post("http://localhost:4000/api/chat", {
          message: inputMessage,
          userId: user.id,
          userRole: user.role,
        })

        const botMessage = {
          id: `bot-${Date.now()}`,
          text: response.data.response,   // ✅ backend đã trả về { response: ... }
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

    setInputMessage("")
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const selectRecipient = (recipient) => {
    setSelectedRecipient(recipient)
    setMessages([]) // Clear messages when switching recipients
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getSenderName = (message) => {
    if (message.sender === "user") return "Bạn"
    if (message.sender === "bot") return "Trợ lý AI"
    return selectedRecipient?.full_name || "Người khác"
  }

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 mb-0">
              <i className="fas fa-comments me-2 text-primary"></i>
              Tin nhắn & Tư vấn
            </h1>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Contacts Sidebar */}
        <div className="col-lg-3">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-primary text-white">
              <h6 className="mb-0">
                <i className="fas fa-address-book me-2"></i>
                Danh bạ
              </h6>
            </div>
            <div className="card-body p-0">
              {/* AI Chatbot */}
              <div
                className={`list-group-item list-group-item-action border-0 ${!selectedRecipient ? "active" : ""}`}
                onClick={() => selectRecipient(null)}
                style={{ cursor: "pointer" }}
              >
                <div className="d-flex align-items-center">
                  <div className="me-3">
                    <i className="fas fa-robot fa-2x text-primary"></i>
                  </div>
                  <div>
                    <h6 className="mb-1">Trợ lý AI</h6>
                    <small className="text-muted">Tư vấn tim mạch 24/7</small>
                  </div>
                </div>
              </div>

              {/* Doctors */}
              {doctors.length > 0 && (
                <>
                  <div className="px-3 py-2 bg-light border-bottom">
                    <small className="text-muted fw-bold">BÁC SĨ</small>
                  </div>
                  {doctors.map((doctor) => (
                    <div
                      key={doctor.id}
                      className={`list-group-item list-group-item-action border-0 ${selectedRecipient?.id === doctor.id ? "active" : ""}`}
                      onClick={() => selectRecipient(doctor)}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="d-flex align-items-center">
                        <div className="me-3">
                          <i className="fas fa-user-md fa-lg text-success"></i>
                        </div>
                        <div>
                          <h6 className="mb-1">{doctor.full_name}</h6>
                          <small className="text-muted">Bác sĩ tim mạch</small>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Family Members */}
              {familyMembers.length > 0 && (
                <>
                  <div className="px-3 py-2 bg-light border-bottom">
                    <small className="text-muted fw-bold">GIA ĐÌNH</small>
                  </div>
                  {familyMembers.map((family) => (
                    <div
                      key={family.id}
                      className={`list-group-item list-group-item-action border-0 ${selectedRecipient?.id === family.id ? "active" : ""}`}
                      onClick={() => selectRecipient(family)}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="d-flex align-items-center">
                        <div className="me-3">
                          <i className="fas fa-users fa-lg text-info"></i>
                        </div>
                        <div>
                          <h6 className="mb-1">{family.full_name}</h6>
                          <small className="text-muted">Thành viên gia đình</small>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="col-lg-9">
          <div className="card border-0 shadow-sm" style={{ height: "600px" }}>
            {/* Chat Header */}
            <div className="card-header bg-white border-bottom d-flex align-items-center">
              <div className="me-3">
                {selectedRecipient ? (
                  <i
                    className={`fas ${selectedRecipient.role === "bác sĩ" ? "fa-user-md text-success" : "fa-users text-info"} fa-lg`}
                  ></i>
                ) : (
                  <i className="fas fa-robot fa-lg text-primary"></i>
                )}
              </div>
              <div>
                <h6 className="mb-0">{selectedRecipient ? selectedRecipient.full_name : "Trợ lý AI Ironman"}</h6>
                <small className="text-muted">
                  {selectedRecipient
                    ? selectedRecipient.role === "bác sĩ"
                      ? "Bác sĩ tim mạch"
                      : "Thành viên gia đình"
                    : "Hỗ trợ tư vấn tim mạch"}
                </small>
              </div>
            </div>

            {/* Messages */}
            <div className="card-body overflow-auto" style={{ height: "450px" }}>
              {messages.length === 0 && (
                <div className="text-center py-5">
                  <i className={`fas ${selectedRecipient ? "fa-comments" : "fa-robot"} fa-3x text-muted mb-3`}></i>
                  <p className="text-muted">
                    {selectedRecipient
                      ? `Bắt đầu cuộc trò chuyện với ${selectedRecipient.full_name}`
                      : "Xin chào! Tôi có thể giúp bạn tư vấn về tim mạch và sức khỏe."}
                  </p>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`mb-3 d-flex ${message.sender === "user" ? "justify-content-end" : "justify-content-start"}`}
                >
                  <div
                    className={`rounded-3 p-3 shadow-sm ${message.sender === "user"
                      ? "bg-primary text-white ms-5"
                      : message.sender === "bot"
                        ? "bg-light me-5"
                        : "bg-info text-white me-5"
                      }`}
                    style={{ maxWidth: "70%" }}
                  >
                    <div className="d-flex align-items-center mb-1">
                      <small className={`fw-bold ${message.sender === "user" ? "text-white-50" : "text-muted"}`}>
                        {getSenderName(message)}
                      </small>
                    </div>
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
                  <div className="bg-light rounded-3 p-3 shadow-sm me-5">
                    <div className="d-flex align-items-center">
                      <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                        <span className="visually-hidden">Đang tải...</span>
                      </div>
                      <small className="text-muted">Đang soạn tin nhắn...</small>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="card-footer bg-white border-top">
              <div className="input-group">
                <textarea
                  className="form-control border-0 bg-light"
                  placeholder={
                    selectedRecipient
                      ? `Nhập tin nhắn gửi ${selectedRecipient.full_name}...`
                      : "Nhập câu hỏi về tim mạch..."
                  }
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  rows="2"
                  style={{ resize: "none" }}
                  disabled={isLoading}
                />
                <button className="btn btn-primary" onClick={sendMessage} disabled={!inputMessage.trim() || isLoading}>
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>
              <small className="text-muted mt-1 d-block">
                <i className="fas fa-info-circle me-1"></i>
                Nhấn Enter để gửi, Shift+Enter để xuống dòng
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PatientChat
