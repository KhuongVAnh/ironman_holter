import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "react-toastify"
import { useAuth } from "../../contexts/AuthContext"
import { chatApi } from "../../services/api"
import EcgShareMessageBubble from "../shared/EcgShareMessageBubble"
import ReadingDetailModal from "../shared/ReadingDetailModal"

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

const normalizeSearchText = (value) => String(value || "").toLowerCase().trim()

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
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedReadingId, setSelectedReadingId] = useState(null)
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [historyCursor, setHistoryCursor] = useState(null)
  const [hasMoreHistory, setHasMoreHistory] = useState(false)
  const [isPeerTyping, setIsPeerTyping] = useState(false)
  const typingIndicatorTimeoutRef = useRef(null)
  const typingEmitRef = useRef({ lastEmittedAt: 0, isTyping: false })

  const selectedContact = useMemo(
    () => contacts.find((item) => item.user_id === selectedContactId) || null,
    [contacts, selectedContactId]
  )
  const filteredContacts = useMemo(() => {
    const keyword = normalizeSearchText(searchTerm)
    if (!keyword) return contacts
    return contacts.filter((contact) => normalizeSearchText(`${contact.name} ${contact.email} ${contact.last_message}`).includes(keyword))
  }, [contacts, searchTerm])
  const unreadCount = useMemo(
    () => contacts.reduce((total, item) => total + Number(item.unread_count || 0), 0),
    [contacts]
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
    setIsPeerTyping(false)
  }, [selectedContactId])

  useEffect(() => {
    const onDirectTyping = (event) => {
      const payload = event.detail || {}
      if (!selectedContactId || !user?.user_id) return
      if (Number(payload.sender_id) !== Number(selectedContactId)) return
      if (Number(payload.receiver_id) !== Number(user.user_id)) return

      if (!payload.is_typing) {
        setIsPeerTyping(false)
        if (typingIndicatorTimeoutRef.current) {
          clearTimeout(typingIndicatorTimeoutRef.current)
          typingIndicatorTimeoutRef.current = null
        }
        return
      }

      setIsPeerTyping(true)
      if (typingIndicatorTimeoutRef.current) clearTimeout(typingIndicatorTimeoutRef.current)
      typingIndicatorTimeoutRef.current = setTimeout(() => {
        setIsPeerTyping(false)
        typingIndicatorTimeoutRef.current = null
      }, 2500)
    }

    window.addEventListener("directChatTyping", onDirectTyping)
    return () => {
      window.removeEventListener("directChatTyping", onDirectTyping)
      if (typingIndicatorTimeoutRef.current) {
        clearTimeout(typingIndicatorTimeoutRef.current)
        typingIndicatorTimeoutRef.current = null
      }
    }
  }, [selectedContactId, user?.user_id])

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
      if (typingEmitRef.current.isTyping) {
        window.dispatchEvent(new CustomEvent("appDirectTypingEmit", {
          detail: {
            sender_id: user?.user_id,
            receiver_id: selectedContact.user_id,
            is_typing: false,
          },
        }))
        typingEmitRef.current = { lastEmittedAt: Date.now(), isTyping: false }
      }
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

  const handleInputChange = (event) => {
    const nextValue = event.target.value
    setInputMessage(nextValue)

    if (!selectedContact || !user?.user_id) return

    const isTypingNow = nextValue.trim().length > 0
    const now = Date.now()
    const typingState = typingEmitRef.current
    const shouldEmit = typingState.isTyping !== isTypingNow || now - typingState.lastEmittedAt >= 1200

    if (!shouldEmit) return

    window.dispatchEvent(new CustomEvent("appDirectTypingEmit", {
      detail: {
        sender_id: user.user_id,
        receiver_id: selectedContact.user_id,
        is_typing: isTypingNow,
      },
    }))

    typingEmitRef.current = { lastEmittedAt: now, isTyping: isTypingNow }
  }

  // Hàm format thời gian hiển thị trên bubble chat.
  const formatTime = (timestamp) => new Date(timestamp).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })

  if (loadingContacts) return <div className="page-shell"><div className="empty-state-rich"><div className="empty-state-rich-icon info"><i className="fas fa-spinner fa-spin"></i></div><h3>Đang tải hội thoại</h3><p>Hệ thống đang lấy danh sách bác sĩ có thể trò chuyện.</p></div></div>

  return (
    <div className="chat-page">
      <header className="chat-page-header">
        <div className="min-w-0">
          <p className="panel-eyebrow">Trao đổi trực tiếp</p>
          <h1 className="chat-page-title">Tin nhắn với bác sĩ</h1>
          <div className="chat-summary-row">
            <span className="chat-summary-chip"><i className="fas fa-user-doctor"></i>{contacts.length} bác sĩ</span>
            <span className="chat-summary-chip"><i className="fas fa-envelope"></i>{unreadCount} chưa đọc</span>
          </div>
        </div>
      </header>

      <div className="chat-layout">
        <aside className="chat-sidebar">
          <div className="chat-sidebar-header">
            <div>
              <h2 className="chat-pane-title">Hội thoại</h2>
              <p className="chat-pane-subtitle">{filteredContacts.length}/{contacts.length} bác sĩ</p>
            </div>
          </div>
          <div className="chat-search">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-400"></i>
              <input className="ui-field min-h-10 pl-9" placeholder="Tìm bác sĩ..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
            </div>
          </div>
          <div className="chat-contact-list">
            {contacts.length === 0 ? (
              <div className="chat-empty">Chưa có bác sĩ nào được cấp quyền trò chuyện với bạn.</div>
            ) : filteredContacts.length === 0 ? (
              <div className="chat-empty">Không tìm thấy hội thoại phù hợp.</div>
            ) : filteredContacts.map((contact) => (
              <button key={contact.user_id} type="button" className={`chat-contact-item ${selectedContactId === contact.user_id ? "is-active" : ""}`} onClick={() => setSelectedContactId(contact.user_id)}>
                <div className="chat-avatar is-brand">{contact.name?.charAt(0)?.toUpperCase() || "B"}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-900">{contact.name}</p>
                      <p className="truncate text-xs text-ink-500">{contact.email}</p>
                    </div>
                    {contact.unread_count > 0 ? <span className="chat-unread-badge">{contact.unread_count}</span> : null}
                  </div>
                  <p className="mt-1 truncate text-xs text-ink-600">{contact.last_message || "Chưa có tin nhắn"}</p>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="chat-thread">
          <div className="chat-thread-header">
            <div className="flex min-w-0 items-center gap-3">
              {selectedContact ? <div className="chat-avatar is-brand">{selectedContact.name?.charAt(0)?.toUpperCase() || "B"}</div> : null}
              <div className="min-w-0">
                <h2 className="chat-pane-title truncate">{selectedContact ? selectedContact.name : "Chọn hội thoại"}</h2>
                <p className="chat-pane-subtitle truncate">{selectedContact?.email || "Chọn bác sĩ ở danh sách bên trái để bắt đầu."}</p>
                {selectedContact && isPeerTyping ? <p className="chat-typing"><i className="fas fa-circle text-[6px]"></i>Đang nhập...</p> : null}
              </div>
            </div>
          </div>

          {!selectedContact ? (
            <div className="chat-empty">
              <div>
                <i className="fas fa-comments text-3xl text-brand-200"></i>
                <p className="mt-3 max-w-md">Chọn một bác sĩ để mở lịch sử trao đổi và gửi tin nhắn trực tiếp.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="chat-message-list">
                {loadingMessages ? (
                  <div className="flex w-full justify-center py-12"><div className="ui-spinner" role="status" /></div>
                ) : messages.length === 0 ? (
                  <div className="chat-empty w-full">
                    <div>
                      <i className="fas fa-comment-medical text-3xl text-brand-200"></i>
                      <p className="mt-3">Chưa có tin nhắn nào trong cuộc trò chuyện này.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {[...messages].reverse().map((message) => {
                      const isMine = message.sender_id === user?.user_id
                      return (
                        <div key={message.message_id} className={`chat-message-row ${isMine ? "is-mine" : "is-peer"}`}>
                          <EcgShareMessageBubble
                            messageText={message.message}
                            isMine={isMine}
                            createdAt={message.created_at}
                            onViewDetail={(readingId) => setSelectedReadingId(readingId)}
                          />
                        </div>
                      )
                    })}

                    {hasMoreHistory ? (
                      <div className="mt-4 flex w-full justify-center pb-4">
                        <button type="button" className="ui-btn ui-btn-outline-secondary ui-btn-sm" onClick={loadOlderMessages} disabled={loadingOlderMessages}>
                          {loadingOlderMessages ? "Đang tải..." : "Tải tin nhắn cũ hơn"}
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              <div className="chat-composer">
                <div className="chat-input-row">
                  <textarea className="ui-field chat-textarea" placeholder={`Nhập tin nhắn gửi ${selectedContact.name}...`} value={inputMessage} onChange={handleInputChange} onKeyDown={handleKeyDown} disabled={sending} rows="1" />
                  <button className="chat-send-button" onClick={sendMessage} disabled={!inputMessage.trim() || sending}>
                    <i className="fas fa-paper-plane"></i>
                    <span>Gửi</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <ReadingDetailModal
        show={Boolean(selectedReadingId)}
        readingId={selectedReadingId}
        onHide={() => setSelectedReadingId(null)}
      />
    </div>
  )
}

export default PatientChat
