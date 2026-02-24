"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "react-toastify"
import { useAuth } from "../../contexts/AuthContext"
import { chatApi } from "../../services/api"

const PatientChat = () => {
  const { user } = useAuth()
  const [contacts, setContacts] = useState([])
  const [selectedContactId, setSelectedContactId] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState("")
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)

  const selectedContact = useMemo(
    () => contacts.find((item) => item.user_id === selectedContactId) || null,
    [contacts, selectedContactId]
  )

  useEffect(() => {
    fetchContacts()
  }, [])

  useEffect(() => {
    if (selectedContactId) {
      fetchMessages(selectedContactId)
    } else {
      setMessages([])
    }
  }, [selectedContactId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    const onDirectMessage = async (event) => {
      const messageData = event.detail
      if (!messageData?.message_id) return

      const isCurrentConversation =
        selectedContactId &&
        (messageData.sender_id === selectedContactId || messageData.receiver_id === selectedContactId)

      if (isCurrentConversation) {
        setMessages((prev) => {
          if (prev.some((item) => item.message_id === messageData.message_id)) {
            return prev
          }
          return [...prev, messageData]
        })

        if (messageData.sender_id === selectedContactId && messageData.receiver_id === user?.user_id) {
          await markRead(selectedContactId, false)
        }
      }

      fetchContacts(false)
    }

    window.addEventListener("directChatMessage", onDirectMessage)
    return () => window.removeEventListener("directChatMessage", onDirectMessage)
  }, [selectedContactId, user?.user_id])

  const fetchContacts = async (showLoading = true) => {
    try {
      if (showLoading) setLoadingContacts(true)
      const response = await chatApi.getContacts()
      const list = response.data?.contacts || []
      setContacts(list)

      if (list.length === 0) {
        setSelectedContactId(null)
        return
      }

      setSelectedContactId((current) => {
        if (!current) return list[0].user_id
        const stillExists = list.some((item) => item.user_id === current)
        return stillExists ? current : list[0].user_id
      })
    } catch (error) {
      console.error("Lỗi tải danh sách bác sĩ:", error)
      toast.error("Không thể tải danh sách bác sĩ")
    } finally {
      if (showLoading) setLoadingContacts(false)
    }
  }

  const fetchMessages = async (doctorId) => {
    try {
      setLoadingMessages(true)
      const response = await chatApi.getDirectHistory(doctorId, { limit: 200 })
      setMessages(response.data?.messages || [])
      await markRead(doctorId, false)
      await fetchContacts(false)
    } catch (error) {
      console.error("Lỗi tải lịch sử chat:", error)
      toast.error(error.response?.data?.message || "Không thể tải lịch sử chat")
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }

  const markRead = async (contactId, notify = false) => {
    try {
      await chatApi.markDirectRead(contactId)
    } catch (error) {
      if (notify) {
        toast.error("Không thể cập nhật trạng thái đã đọc")
      }
    }
  }

  const sendMessage = async () => {
    if (!selectedContact || !inputMessage.trim() || sending) return

    try {
      setSending(true)
      const response = await chatApi.sendDirect(selectedContact.user_id, inputMessage.trim())
      const sentMessage = response.data?.data

      if (sentMessage?.message_id) {
        setMessages((prev) => {
          if (prev.some((item) => item.message_id === sentMessage.message_id)) {
            return prev
          }
          return [...prev, sentMessage]
        })
      }

      setInputMessage("")
      fetchContacts(false)
    } catch (error) {
      console.error("Lỗi gửi tin nhắn:", error)
      toast.error(error.response?.data?.message || "Không thể gửi tin nhắn")
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    })
  }

  if (loadingContacts) {
    return (
      <div className="container py-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <h1 className="h3 mb-4">
            <i className="fas fa-comments me-2 text-primary"></i>
            Chat với bác sĩ
          </h1>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-4 col-xl-3">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0">
              <h6 className="mb-0">Danh sách bác sĩ được phép chat</h6>
            </div>
            <div className="list-group list-group-flush">
              {contacts.length === 0 && (
                <div className="list-group-item text-muted small">
                  Chưa có bác sĩ nào được cấp quyền truy cập.
                </div>
              )}

              {contacts.map((contact) => (
                <button
                  key={contact.user_id}
                  type="button"
                  className={`list-group-item list-group-item-action border-0 ${
                    selectedContactId === contact.user_id ? "active" : ""
                  }`}
                  onClick={() => setSelectedContactId(contact.user_id)}
                >
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <div className="fw-semibold">{contact.name}</div>
                      <small className={selectedContactId === contact.user_id ? "text-white-50" : "text-muted"}>
                        {contact.email}
                      </small>
                      <div className="small mt-1">
                        {contact.last_message || "Chưa có tin nhắn"}
                      </div>
                    </div>
                    {contact.unread_count > 0 && (
                      <span className="badge bg-danger rounded-pill">{contact.unread_count}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="col-lg-8 col-xl-9">
          <div className="card border-0 shadow-sm" style={{ minHeight: "640px" }}>
            <div className="card-header bg-white border-bottom d-flex align-items-center justify-content-between">
              <div>
                <h6 className="mb-0">{selectedContact ? selectedContact.name : "Chọn bác sĩ"}</h6>
                <small className="text-muted">{selectedContact?.email || ""}</small>
              </div>
            </div>

            <div className="card-body overflow-auto" style={{ height: "500px" }}>
              {!selectedContact && (
                <div className="text-center text-muted py-5">Vui lòng chọn bác sĩ để bắt đầu trò chuyện.</div>
              )}

              {selectedContact && loadingMessages && (
                <div className="d-flex justify-content-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Đang tải...</span>
                  </div>
                </div>
              )}

              {selectedContact && !loadingMessages && messages.length === 0 && (
                <div className="text-center text-muted py-5">Chưa có tin nhắn nào trong cuộc trò chuyện này.</div>
              )}

              {selectedContact &&
                !loadingMessages &&
                messages.map((message) => {
                  const isMine = message.sender_id === user?.user_id

                  return (
                    <div
                      key={message.message_id}
                      className={`mb-3 d-flex ${isMine ? "justify-content-end" : "justify-content-start"}`}
                    >
                      <div
                        className={`rounded-3 p-3 shadow-sm ${
                          isMine ? "bg-primary text-white ms-5" : "bg-light me-5"
                        }`}
                        style={{ maxWidth: "75%" }}
                      >
                        <div style={{ whiteSpace: "pre-wrap" }}>{message.message}</div>
                        <small className={isMine ? "text-white-50" : "text-muted"}>
                          {formatTime(message.created_at)}
                        </small>
                      </div>
                    </div>
                  )
                })}

              <div ref={messagesEndRef} />
            </div>

            <div className="card-footer bg-white border-top">
              <div className="input-group">
                <textarea
                  className="form-control border-0 bg-light"
                  placeholder={selectedContact ? `Nhập tin nhắn gửi ${selectedContact.name}...` : "Chọn bác sĩ để nhắn tin"}
                  value={inputMessage}
                  onChange={(event) => setInputMessage(event.target.value)}
                  onKeyDown={handleKeyDown}
                  rows="2"
                  style={{ resize: "none" }}
                  disabled={!selectedContact || sending}
                />
                <button
                  className="btn btn-primary"
                  onClick={sendMessage}
                  disabled={!selectedContact || !inputMessage.trim() || sending}
                >
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PatientChat