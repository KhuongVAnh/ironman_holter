"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "react-toastify"
import { useAuth } from "../../contexts/AuthContext"
import { chatApi } from "../../services/api"

// Hàm sắp xếp danh sách contact theo thời điểm có tin nhắn cuối mới nhất.
const sortContactsByLastActivity = (contacts = []) => {
  return [...contacts].sort((left, right) => {
    if (!left.last_message_at && !right.last_message_at) return left.name.localeCompare(right.name)
    if (!left.last_message_at) return 1
    if (!right.last_message_at) return -1
    return new Date(right.last_message_at) - new Date(left.last_message_at)
  })
}

// Hàm thêm message vào danh sách nếu chưa có và giữ thứ tự tăng dần theo thời gian tạo.
const appendMessageIfMissing = (messages = [], nextMessage) => {
  if (!nextMessage?.message_id) return messages
  if (messages.some((item) => item.message_id === nextMessage.message_id)) return messages

  return [...messages, nextMessage].sort((left, right) => {
    const leftTime = new Date(left.created_at).getTime()
    const rightTime = new Date(right.created_at).getTime()
    if (leftTime !== rightTime) return leftTime - rightTime
    return Number(left.message_id) - Number(right.message_id)
  })
}

// Hàm prepend một page message cũ hơn vào đầu danh sách hiện tại mà không tạo bản ghi trùng.
const prependOlderMessages = (currentMessages = [], olderMessages = []) => {
  const existingIds = new Set(currentMessages.map((item) => item.message_id))
  const nextMessages = olderMessages.filter((item) => !existingIds.has(item.message_id))
  return [...nextMessages, ...currentMessages]
}

// Hàm đánh dấu unread của contact đang mở về 0 trong state cục bộ.
const markContactReadLocally = (contacts = [], contactId) => {
  return contacts.map((contact) => (
    contact.user_id === contactId
      ? { ...contact, unread_count: 0 }
      : contact
  ))
}

// Hàm cập nhật preview contact khi có direct message mới mà không cần refetch toàn bộ danh sách contact.
const updateContactsFromRealtimeMessage = (contacts = [], messageData, currentUserId, activeContactId) => {
  if (!messageData?.message_id) return contacts

  const partnerId = messageData.sender_id === currentUserId
    ? messageData.receiver_id
    : messageData.sender_id

  const nextContacts = contacts.map((contact) => {
    if (contact.user_id !== partnerId) return contact

    const isIncomingForInactiveConversation =
      messageData.receiver_id === currentUserId && partnerId !== activeContactId

    return {
      ...contact,
      last_message: messageData.message,
      last_message_at: messageData.created_at,
      unread_count: isIncomingForInactiveConversation ? Number(contact.unread_count || 0) + 1 : 0,
    }
  })

  return sortContactsByLastActivity(nextContacts)
}

const DoctorChat = () => {
  const { user } = useAuth()
  const [contacts, setContacts] = useState([])
  const [selectedContactId, setSelectedContactId] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState("")
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [historyCursor, setHistoryCursor] = useState(null)
  const [hasMoreHistory, setHasMoreHistory] = useState(false)
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
      loadConversation(selectedContactId)
    } else {
      setMessages([])
      setHistoryCursor(null)
      setHasMoreHistory(false)
    }
  }, [selectedContactId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    const onDirectMessage = (event) => {
      const messageData = event.detail
      if (!messageData?.message_id) return

      const isCurrentConversation =
        selectedContactId &&
        (messageData.sender_id === selectedContactId || messageData.receiver_id === selectedContactId)

      if (isCurrentConversation) {
        // Khi đang mở đúng hội thoại, chỉ append tại chỗ và giữ unread cục bộ ở 0.
        setMessages((prev) => appendMessageIfMissing(prev, messageData))
        setContacts((prev) => markContactReadLocally(updateContactsFromRealtimeMessage(prev, messageData, user?.user_id, selectedContactId), selectedContactId))

        if (messageData.sender_id === selectedContactId && messageData.receiver_id === user?.user_id) {
          void markRead(selectedContactId, false)
        }
        return
      }

      // Nếu tin nhắn đến từ hội thoại khác, chỉ cập nhật preview contact và unread count cục bộ.
      setContacts((prev) => updateContactsFromRealtimeMessage(prev, messageData, user?.user_id, selectedContactId))
    }

    window.addEventListener("directChatMessage", onDirectMessage)
    return () => window.removeEventListener("directChatMessage", onDirectMessage)
  }, [selectedContactId, user?.user_id])

  // Hàm tải danh sách bệnh nhân đã cấp quyền chat và giữ contact đang được chọn nếu còn tồn tại.
  const fetchContacts = async (showLoading = true) => {
    try {
      if (showLoading) setLoadingContacts(true)
      const response = await chatApi.getContacts()
      const list = sortContactsByLastActivity(response.data?.contacts || [])
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
      console.error("Lỗi tải danh sách bệnh nhân:", error)
      toast.error("Không thể tải danh sách bệnh nhân")
    } finally {
      if (showLoading) setLoadingContacts(false)
    }
  }

  // Hàm tải lịch sử hội thoại, hỗ trợ cả lần tải đầu và lần tải thêm các message cũ hơn bằng cursor.
  const fetchMessages = async (patientId, { cursor = null, append = false } = {}) => {
    try {
      if (append) {
        setLoadingOlderMessages(true)
      } else {
        setLoadingMessages(true)
      }

      const response = await chatApi.getDirectHistory(patientId, {
        limit: 50,
        ...(cursor ? { cursor } : {}),
      })

      const nextMessages = Array.isArray(response.data?.messages) ? response.data.messages : []
      const nextCursor = response.data?.next_cursor || null
      const nextHasMore = Boolean(response.data?.has_more)

      setMessages((prev) => (append ? prependOlderMessages(prev, nextMessages) : nextMessages))
      setHistoryCursor(nextCursor)
      setHasMoreHistory(nextHasMore)
      setContacts((prev) => markContactReadLocally(prev, patientId))
      await markRead(patientId, false)
    } catch (error) {
      console.error("Lỗi tải lịch sử chat:", error)
      toast.error(error.response?.data?.message || "Không thể tải lịch sử chat")
      if (!append) {
        setMessages([])
        setHistoryCursor(null)
        setHasMoreHistory(false)
      }
    } finally {
      setLoadingMessages(false)
      setLoadingOlderMessages(false)
    }
  }

  // Hàm tải trạng thái ban đầu của hội thoại đang chọn.
  const loadConversation = async (patientId) => {
    setMessages([])
    setHistoryCursor(null)
    setHasMoreHistory(false)
    await fetchMessages(patientId)
  }

  // Hàm tải thêm các tin nhắn cũ hơn ở đầu hội thoại bằng cursor pagination.
  const loadOlderMessages = async () => {
    if (!selectedContactId || !historyCursor || loadingOlderMessages) return
    await fetchMessages(selectedContactId, { cursor: historyCursor, append: true })
  }

  // Hàm đánh dấu các tin nhắn incoming trong hội thoại là đã đọc.
  const markRead = async (contactId, notify = false) => {
    try {
      await chatApi.markDirectRead(contactId)
    } catch (_error) {
      if (notify) {
        toast.error("Không thể cập nhật trạng thái đã đọc")
      }
    }
  }

  // Hàm gửi direct message, append optimistic theo response và cập nhật preview contact cục bộ.
  const sendMessage = async () => {
    if (!selectedContact || !inputMessage.trim() || sending) return

    try {
      setSending(true)
      const response = await chatApi.sendDirect(selectedContact.user_id, inputMessage.trim())
      const sentMessage = response.data?.data

      if (sentMessage?.message_id) {
        setMessages((prev) => appendMessageIfMissing(prev, sentMessage))
        setContacts((prev) => markContactReadLocally(updateContactsFromRealtimeMessage(prev, sentMessage, user?.user_id, selectedContact.user_id), selectedContact.user_id))
      }

      setInputMessage("")
    } catch (error) {
      console.error("Lỗi gửi tin nhắn:", error)
      toast.error(error.response?.data?.message || "Không thể gửi tin nhắn")
    } finally {
      setSending(false)
    }
  }

  // Hàm hỗ trợ Enter để gửi và Shift+Enter để xuống dòng.
  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  // Hàm format thời gian hiển thị trên bubble chat.
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
            <i className="fas fa-comments me-2 text-success"></i>
            Chat với bệnh nhân
          </h1>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-4 col-xl-3">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0">
              <h6 className="mb-0">Danh sách bệnh nhân đã cấp quyền</h6>
            </div>
            <div className="list-group list-group-flush">
              {contacts.length === 0 && (
                <div className="list-group-item text-muted small">
                  Chưa có bệnh nhân nào cấp quyền chat cho bạn.
                </div>
              )}

              {contacts.map((contact) => (
                <button
                  key={contact.user_id}
                  type="button"
                  className={`list-group-item list-group-item-action border-0 ${selectedContactId === contact.user_id ? "active" : ""
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
                <h6 className="mb-0">{selectedContact ? selectedContact.name : "Chọn bệnh nhân"}</h6>
                <small className="text-muted">{selectedContact?.email || ""}</small>
              </div>
            </div>

            <div className="card-body overflow-auto" style={{ height: "500px" }}>
              {selectedContact && hasMoreHistory && (
                <div className="d-flex justify-content-center pb-3">
                  <button type="button" className="btn btn-light" onClick={loadOlderMessages} disabled={loadingOlderMessages}>
                    {loadingOlderMessages ? "Đang tải tin nhắn cũ..." : "Tải tin nhắn cũ hơn"}
                  </button>
                </div>
              )}

              {!selectedContact && (
                <div className="text-center text-muted py-5">Vui lòng chọn bệnh nhân để bắt đầu trò chuyện.</div>
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
                        className={`rounded-3 p-3 shadow-sm ${isMine ? "bg-success text-white ms-5" : "bg-light me-5"
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
                  placeholder={selectedContact ? `Nhập tin nhắn gửi ${selectedContact.name}...` : "Chọn bệnh nhân để nhắn tin"}
                  value={inputMessage}
                  onChange={(event) => setInputMessage(event.target.value)}
                  onKeyDown={handleKeyDown}
                  rows="2"
                  style={{ resize: "none" }}
                  disabled={!selectedContact || sending}
                />
                <button
                  className="btn btn-success"
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

export default DoctorChat
