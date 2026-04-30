"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { toast } from "react-toastify"
import { useAuth } from "../../contexts/AuthContext"
import { chatApi } from "../../services/api"
import { EmptyState, formatDateTime, normalizeText } from "./DoctorUi"

const sortContactsByLastActivity = (contacts = []) => {
  return [...contacts].sort((left, right) => {
    if (!left.last_message_at && !right.last_message_at) return left.name.localeCompare(right.name)
    if (!left.last_message_at) return 1
    if (!right.last_message_at) return -1
    return new Date(right.last_message_at) - new Date(left.last_message_at)
  })
}

const appendMessageIfMissing = (messages = [], nextMessage) => {
  if (!nextMessage?.message_id || messages.some((item) => item.message_id === nextMessage.message_id)) return messages
  return [...messages, nextMessage].sort((left, right) => new Date(left.created_at) - new Date(right.created_at))
}

const prependOlderMessages = (currentMessages = [], olderMessages = []) => {
  const existingIds = new Set(currentMessages.map((item) => item.message_id))
  return [...olderMessages.filter((item) => !existingIds.has(item.message_id)), ...currentMessages]
}

const markContactReadLocally = (contacts = [], contactId) =>
  contacts.map((contact) => contact.user_id === contactId ? { ...contact, unread_count: 0 } : contact)

const updateContactsFromRealtimeMessage = (contacts = [], messageData, currentUserId, activeContactId) => {
  if (!messageData?.message_id) return contacts
  const partnerId = messageData.sender_id === currentUserId ? messageData.receiver_id : messageData.sender_id
  return sortContactsByLastActivity(contacts.map((contact) => {
    if (contact.user_id !== partnerId) return contact
    const incomingInactive = messageData.receiver_id === currentUserId && partnerId !== activeContactId
    return {
      ...contact,
      last_message: messageData.message,
      last_message_at: messageData.created_at,
      unread_count: incomingInactive ? Number(contact.unread_count || 0) + 1 : 0,
    }
  }))
}

const DoctorChat = () => {
  const { user } = useAuth()
  const location = useLocation()
  const requestedPatientId = location.state?.patientId ? Number(location.state.patientId) : null
  const [contacts, setContacts] = useState([])
  const [selectedContactId, setSelectedContactId] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [historyCursor, setHistoryCursor] = useState(null)
  const [hasMoreHistory, setHasMoreHistory] = useState(false)
  const [isPeerTyping, setIsPeerTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const typingIndicatorTimeoutRef = useRef(null)
  const typingEmitRef = useRef({ lastEmittedAt: 0, isTyping: false })

  const selectedContact = useMemo(() => contacts.find((item) => item.user_id === selectedContactId) || null, [contacts, selectedContactId])
  const filteredContacts = useMemo(() => {
    const keyword = normalizeText(searchTerm)
    return keyword ? contacts.filter((contact) => normalizeText(`${contact.name} ${contact.email}`).includes(keyword)) : contacts
  }, [contacts, searchTerm])
  const unreadCount = useMemo(
    () => contacts.reduce((total, item) => total + Number(item.unread_count || 0), 0),
    [contacts]
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

      const isCurrentConversation = selectedContactId && (messageData.sender_id === selectedContactId || messageData.receiver_id === selectedContactId)
      if (isCurrentConversation) {
        setMessages((prev) => appendMessageIfMissing(prev, messageData))
        setContacts((prev) => markContactReadLocally(updateContactsFromRealtimeMessage(prev, messageData, user?.user_id, selectedContactId), selectedContactId))
        if (messageData.sender_id === selectedContactId && messageData.receiver_id === user?.user_id) void markRead(selectedContactId)
        return
      }

      setContacts((prev) => updateContactsFromRealtimeMessage(prev, messageData, user?.user_id, selectedContactId))
    }

    window.addEventListener("directChatMessage", onDirectMessage)
    return () => window.removeEventListener("directChatMessage", onDirectMessage)
  }, [selectedContactId, user?.user_id])

  const fetchContacts = async () => {
    try {
      setLoadingContacts(true)
      const response = await chatApi.getContacts()
      const list = sortContactsByLastActivity(response.data?.contacts || [])
      setContacts(list)
      setSelectedContactId((current) => {
        if (requestedPatientId && list.some((item) => item.user_id === requestedPatientId)) return requestedPatientId
        if (current && list.some((item) => item.user_id === current)) return current
        return list[0]?.user_id || null
      })
    } catch (error) {
      console.error("Lỗi tải danh sách bệnh nhân:", error)
      toast.error("Không thể tải danh sách bệnh nhân")
    } finally {
      setLoadingContacts(false)
    }
  }

  const fetchMessages = async (patientId, { cursor = null, append = false } = {}) => {
    try {
      append ? setLoadingOlderMessages(true) : setLoadingMessages(true)
      const response = await chatApi.getDirectHistory(patientId, { limit: 50, ...(cursor ? { cursor } : {}) })
      const nextMessages = Array.isArray(response.data?.messages) ? response.data.messages : []
      setMessages((prev) => append ? prependOlderMessages(prev, nextMessages) : nextMessages)
      setHistoryCursor(response.data?.next_cursor || null)
      setHasMoreHistory(Boolean(response.data?.has_more))
      setContacts((prev) => markContactReadLocally(prev, patientId))
      await markRead(patientId)
    } catch (error) {
      console.error("Lỗi tải lịch sử chat:", error)
      toast.error(error.response?.data?.message || "Không thể tải lịch sử chat")
      if (!append) setMessages([])
    } finally {
      setLoadingMessages(false)
      setLoadingOlderMessages(false)
    }
  }

  const loadConversation = async (patientId) => {
    setMessages([])
    setHistoryCursor(null)
    setHasMoreHistory(false)
    await fetchMessages(patientId)
  }

  const loadOlderMessages = async () => {
    if (!selectedContactId || !historyCursor || loadingOlderMessages) return
    await fetchMessages(selectedContactId, { cursor: historyCursor, append: true })
  }

  const markRead = async (contactId) => {
    try {
      await chatApi.markDirectRead(contactId)
    } catch (_error) {
      // Read receipt is best-effort.
    }
  }

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

  if (loadingContacts) return <div className="page-shell"><div className="empty-state-rich"><div className="empty-state-rich-icon info"><i className="fas fa-spinner fa-spin"></i></div><h3>Đang tải hội thoại</h3><p>Danh sách bệnh nhân đang được đồng bộ.</p></div></div>

  return (
    <div className="chat-page">
      <header className="chat-page-header">
        <div className="min-w-0">
          <p className="panel-eyebrow">Trao đổi bảo mật</p>
          <h1 className="chat-page-title">Tin nhắn bệnh nhân</h1>
          <p className="chat-page-subtitle">Theo dõi hội thoại bệnh nhân trong một workspace gọn và tập trung hơn.</p>
          <div className="chat-summary-row">
            <span className="chat-summary-chip"><i className="fas fa-user-group"></i>{contacts.length} bệnh nhân</span>
            <span className="chat-summary-chip"><i className="fas fa-envelope"></i>{unreadCount} chưa đọc</span>
          </div>
        </div>
      </header>

      <div className="chat-layout">
        <aside className="chat-sidebar">
          <div className="chat-sidebar-header">
            <div>
              <h2 className="chat-pane-title">Hội thoại</h2>
              <p className="chat-pane-subtitle">{filteredContacts.length}/{contacts.length} bệnh nhân</p>
            </div>
          </div>
          <div className="chat-search">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-400"></i>
              <input className="ui-field min-h-10 pl-9" placeholder="Tìm bệnh nhân..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
            </div>
          </div>
          <div className="chat-contact-list">
            {filteredContacts.length ? filteredContacts.map((contact) => (
              <button
                key={contact.user_id}
                type="button"
                className={`chat-contact-item ${selectedContactId === contact.user_id ? "is-active" : ""}`}
                onClick={() => setSelectedContactId(contact.user_id)}
              >
                <div className="chat-avatar is-brand">{contact.name?.charAt(0)?.toUpperCase() || "B"}</div>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink-900">{contact.name}</span>
                  <span className="block truncate text-xs text-ink-500">{contact.email}</span>
                  <span className="mt-1 block truncate text-xs text-ink-600">{contact.last_message || "Chưa có tin nhắn"}</span>
                </span>
                {contact.unread_count > 0 ? <span className="chat-unread-badge">{contact.unread_count}</span> : null}
              </button>
            )) : <EmptyState icon="fas fa-comments" title="Không có hội thoại" description="Bệnh nhân đã cấp quyền chat sẽ xuất hiện ở đây." />}
          </div>
        </aside>

        <section className="chat-thread">
          <div className="chat-thread-header">
            <div className="flex min-w-0 items-center gap-3">
              {selectedContact ? <div className="chat-avatar is-brand">{selectedContact.name?.charAt(0)?.toUpperCase() || "B"}</div> : null}
              <div className="min-w-0">
                <h2 className="chat-pane-title truncate">{selectedContact ? selectedContact.name : "Chọn bệnh nhân"}</h2>
                <p className="chat-pane-subtitle truncate">{selectedContact?.email || "Mở một hội thoại để bắt đầu trao đổi."}</p>
                {selectedContact && isPeerTyping ? <p className="chat-typing"><i className="fas fa-circle text-[6px]"></i>Đang nhập...</p> : null}
              </div>
            </div>
            {selectedContact ? <Link to={`/doctor/patient/${selectedContact.user_id}`} className="ui-btn ui-btn-outline-primary ui-btn-sm">Mở hồ sơ</Link> : null}
          </div>

          <div className="chat-message-list">
            {selectedContact && hasMoreHistory ? (
              <div className="mb-4 flex justify-center">
                <button type="button" className="ui-btn ui-btn-outline-secondary ui-btn-sm" onClick={loadOlderMessages} disabled={loadingOlderMessages}>
                  {loadingOlderMessages ? "Đang tải..." : "Tải tin nhắn cũ hơn"}
                </button>
              </div>
            ) : null}

            {!selectedContact ? <EmptyState icon="fas fa-user-check" title="Chọn bệnh nhân" description="Danh sách bên trái chứa các bệnh nhân đã cấp quyền chat." /> : null}
            {selectedContact && loadingMessages ? <div className="flex justify-center py-8"><div className="ui-spinner"></div></div> : null}
            {selectedContact && !loadingMessages && messages.length === 0 ? <EmptyState icon="fas fa-message" title="Chưa có tin nhắn" /> : null}

            {selectedContact && !loadingMessages ? messages.map((message) => {
              const isMine = message.sender_id === user?.user_id
              return (
                <div key={message.message_id} className={`chat-message-row ${isMine ? "is-mine" : "is-peer"}`}>
                  <div className={`chat-bubble ${isMine ? "is-mine" : "is-peer"}`}>
                    <p className="mb-0 whitespace-pre-wrap text-sm leading-6">{message.message}</p>
                    <p className="chat-message-time">{formatDateTime(message.created_at)}</p>
                  </div>
                </div>
              )
            }) : null}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-composer">
            <div className="chat-input-row">
              <textarea
                className="ui-field chat-textarea"
                placeholder={selectedContact ? `Nhập tin nhắn gửi ${selectedContact.name}...` : "Chọn bệnh nhân để nhắn tin"}
                value={inputMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows="1"
                disabled={!selectedContact || sending}
              />
              <button type="button" className="chat-send-button" onClick={sendMessage} disabled={!selectedContact || !inputMessage.trim() || sending}>
                <i className="fas fa-paper-plane"></i>
                <span>Gửi</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default DoctorChat
