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

const PatientChat = () => {
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

  useEffect(() => { fetchContacts() }, [])

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
        // Nếu người dùng đang mở đúng hội thoại thì chỉ cần append tại chỗ và đánh dấu đã đọc cục bộ.
        setMessages((prev) => appendMessageIfMissing(prev, messageData))
        setContacts((prev) => markContactReadLocally(updateContactsFromRealtimeMessage(prev, messageData, user?.user_id, selectedContactId), selectedContactId))

        if (messageData.sender_id === selectedContactId && messageData.receiver_id === user?.user_id) {
          void markRead(selectedContactId, false)
        }
        return
      }

      // Nếu tin nhắn thuộc hội thoại khác, chỉ cập nhật preview và unread count cục bộ.
      setContacts((prev) => updateContactsFromRealtimeMessage(prev, messageData, user?.user_id, selectedContactId))
    }

    window.addEventListener("directChatMessage", onDirectMessage)
    return () => window.removeEventListener("directChatMessage", onDirectMessage)
  }, [selectedContactId, user?.user_id])

  // Hàm tải danh sách bác sĩ có quyền chat và giữ contact đang được chọn nếu còn tồn tại.
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
        return list.some((item) => item.user_id === current) ? current : list[0].user_id
      })
    } catch (error) {
      console.error("Lỗi tải danh sách bác sĩ:", error)
      toast.error("Không thể tải danh sách bác sĩ")
    } finally {
      if (showLoading) setLoadingContacts(false)
    }
  }

  // Hàm tải lịch sử hội thoại, hỗ trợ cả lần tải đầu và lần tải thêm các message cũ hơn bằng cursor.
  const fetchMessages = async (doctorId, { cursor = null, append = false } = {}) => {
    try {
      if (append) {
        setLoadingOlderMessages(true)
      } else {
        setLoadingMessages(true)
      }

      const response = await chatApi.getDirectHistory(doctorId, {
        limit: 50,
        ...(cursor ? { cursor } : {}),
      })

      const nextMessages = Array.isArray(response.data?.messages) ? response.data.messages : []
      const nextCursor = response.data?.next_cursor || null
      const nextHasMore = Boolean(response.data?.has_more)

      setMessages((prev) => (append ? prependOlderMessages(prev, nextMessages) : nextMessages))
      setHistoryCursor(nextCursor)
      setHasMoreHistory(nextHasMore)
      setContacts((prev) => markContactReadLocally(prev, doctorId))
      await markRead(doctorId, false)
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
  const loadConversation = async (doctorId) => {
    setMessages([])
    setHistoryCursor(null)
    setHasMoreHistory(false)
    await fetchMessages(doctorId)
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
    } catch (error) {
      if (notify) toast.error("Không thể cập nhật trạng thái đã đọc")
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
  const formatTime = (timestamp) => new Date(timestamp).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })

  if (loadingContacts) return <div className="page-shell"><div className="empty-state-rich"><div className="empty-state-rich-icon info"><i className="fas fa-spinner fa-spin"></i></div><h3>Đang tải hội thoại</h3><p>Hệ thống đang lấy danh sách bác sĩ có thể trò chuyện.</p></div></div>

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="page-hero-icon"><i className="fas fa-comments"></i></div>
        <div className="min-w-0 flex-1">
          <p className="panel-eyebrow">Trao đổi trực tiếp</p>
          <h1 className="page-hero-title">Tin nhắn với bác sĩ</h1>
          <p className="page-hero-subtitle">Ưu tiên các hội thoại có tin chưa đọc và giữ lịch sử trao đổi theo từng bác sĩ.</p>
        </div>
        <button type="button" className="btn btn-outline-primary" onClick={() => fetchContacts(false)}>
          <i className="fas fa-rotate-right me-2"></i>Làm mới
        </button>
      </section>

      <section className="metric-grid">
        <div className="priority-metric metric-info">
          <div className="metric-icon"><i className="fas fa-user-doctor"></i></div>
          <p className="metric-label">Bác sĩ</p>
          <p className="metric-value">{contacts.length}</p>
          <p className="metric-helper">Được cấp quyền trò chuyện</p>
        </div>
        <div className="priority-metric metric-danger">
          <div className="metric-icon"><i className="fas fa-envelope-open-text"></i></div>
          <p className="metric-label">Chưa đọc</p>
          <p className="metric-value">{contacts.reduce((total, item) => total + Number(item.unread_count || 0), 0)}</p>
          <p className="metric-helper">Tin nhắn cần xem</p>
        </div>
        <div className="priority-metric metric-success">
          <div className="metric-icon"><i className="fas fa-comment-dots"></i></div>
          <p className="metric-label">Đang mở</p>
          <p className="metric-value text-2xl">{selectedContact ? selectedContact.name : "Chưa chọn"}</p>
          <p className="metric-helper">Hội thoại hiện tại</p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <section className="clinical-panel overflow-hidden">
        <div className="clinical-panel-header">
          <div>
            <h2 className="section-title">Bác sĩ đã cấp quyền</h2>
            <p className="section-subtitle">Chọn bác sĩ để xem lịch sử trao đổi trực tiếp.</p>
          </div>
        </div>
        <div className="max-h-[720px] overflow-y-auto">
          {contacts.length === 0 ? (
            <div className="p-6 text-sm text-ink-600">Chưa có bác sĩ nào được cấp quyền trò chuyện với bạn.</div>
          ) : contacts.map((contact) => (
            <button key={contact.user_id} type="button" className={`flex w-full items-start gap-4 border-b border-surface-line px-5 py-4 text-left transition ${selectedContactId === contact.user_id ? "bg-brand-50" : "hover:bg-surface"}`} onClick={() => setSelectedContactId(contact.user_id)}>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700">{contact.name?.charAt(0)?.toUpperCase() || "B"}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-ink-900">{contact.name}</p>
                    <p className="truncate text-xs text-ink-500">{contact.email}</p>
                  </div>
                  {contact.unread_count > 0 ? <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-clinical-danger px-2 py-1 text-xs font-bold text-white">{contact.unread_count}</span> : null}
                </div>
                <p className="mt-2 truncate text-sm text-ink-600">{contact.last_message || "Chưa có tin nhắn"}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="clinical-panel overflow-hidden">
        <div className="clinical-panel-header">
          <div>
            <h2 className="section-title">{selectedContact ? selectedContact.name : "Tin nhắn"}</h2>
            <p className="section-subtitle">{selectedContact?.email || "Chọn một bác sĩ để bắt đầu trao đổi."}</p>
          </div>
        </div>

        {!selectedContact ? (
          <div className="flex min-h-[540px] items-center justify-center p-8 text-center text-ink-500">
            <div>
              <i className="fas fa-comments fa-3x text-brand-200"></i>
              <p className="mt-5 max-w-md text-sm leading-6">Chọn bác sĩ ở cột bên trái để xem cuộc trò chuyện và gửi tin nhắn trực tiếp.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="h-[520px] overflow-y-auto bg-surface-soft px-6 py-5">
              {hasMoreHistory ? (
                <div className="mb-4 flex justify-center">
                  <button type="button" className="btn btn-light" onClick={loadOlderMessages} disabled={loadingOlderMessages}>
                    {loadingOlderMessages ? "Đang tải tin nhắn cũ..." : "Tải tin nhắn cũ hơn"}
                  </button>
                </div>
              ) : null}

              {loadingMessages ? (
                <div className="flex justify-center py-14"><div className="spinner-border" role="status" /></div>
              ) : messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-center text-ink-500">
                  <div>
                    <i className="fas fa-comment-medical fa-3x text-brand-200"></i>
                    <p className="mt-4 text-sm">Chưa có tin nhắn nào trong cuộc trò chuyện này.</p>
                  </div>
                </div>
              ) : messages.map((message) => {
                const isMine = message.sender_id === user?.user_id
                return (
                  <div key={message.message_id} className={`mb-4 flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-soft ${isMine ? "bg-brand-600 text-white" : "border border-surface-line bg-white text-ink-800"}`}>
                      <div className="whitespace-pre-wrap text-sm leading-6">{message.message}</div>
                      <div className={`mt-2 text-[11px] ${isMine ? "text-white/70" : "text-ink-500"}`}>{formatTime(message.created_at)}</div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-surface-line bg-white p-4">
              <div className="flex items-end gap-3">
                <textarea className="form-control min-h-[56px] flex-1" placeholder={`Nhập tin nhắn gửi ${selectedContact.name}...`} value={inputMessage} onChange={(event) => setInputMessage(event.target.value)} onKeyDown={handleKeyDown} disabled={sending} />
                <button className="btn btn-primary h-[52px] px-5" onClick={sendMessage} disabled={!inputMessage.trim() || sending}><i className="fas fa-paper-plane"></i>Gửi</button>
              </div>
              <p className="mt-2 text-xs text-ink-500">Nhấn Enter để gửi, Shift+Enter để xuống dòng.</p>
            </div>
          </>
        )}
      </section>
      </div>
    </div>
  )
}

export default PatientChat
