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

  const selectedContact = useMemo(() => contacts.find((item) => item.user_id === selectedContactId) || null, [contacts, selectedContactId])

  useEffect(() => { fetchContacts() }, [])
  useEffect(() => { selectedContactId ? fetchMessages(selectedContactId) : setMessages([]) }, [selectedContactId])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  useEffect(() => {
    const onDirectMessage = async (event) => {
      const messageData = event.detail
      if (!messageData?.message_id) return
      const isCurrentConversation = selectedContactId && (messageData.sender_id === selectedContactId || messageData.receiver_id === selectedContactId)

      if (isCurrentConversation) {
        setMessages((prev) => prev.some((item) => item.message_id === messageData.message_id) ? prev : [...prev, messageData])
        if (messageData.sender_id === selectedContactId && messageData.receiver_id === user?.user_id) await markRead(selectedContactId, false)
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
      setSelectedContactId((current) => !current ? list[0].user_id : (list.some((item) => item.user_id === current) ? current : list[0].user_id))
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
      if (notify) toast.error("Không thể cập nhật trạng thái đã đọc")
    }
  }

  const sendMessage = async () => {
    if (!selectedContact || !inputMessage.trim() || sending) return
    try {
      setSending(true)
      const response = await chatApi.sendDirect(selectedContact.user_id, inputMessage.trim())
      const sentMessage = response.data?.data
      if (sentMessage?.message_id) setMessages((prev) => prev.some((item) => item.message_id === sentMessage.message_id) ? prev : [...prev, sentMessage])
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

  const formatTime = (timestamp) => new Date(timestamp).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })

  if (loadingContacts) return <div className="flex justify-center py-14"><div className="spinner-border" role="status" /></div>

  return (
    <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <section className="app-card overflow-hidden">
        <div className="app-card-header">
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

      <section className="app-card overflow-hidden">
        <div className="app-card-header">
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
            <div className="h-[520px] overflow-y-auto bg-surface px-6 py-5">
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
                    <div className={`max-w-[78%] rounded-[24px] px-4 py-3 shadow-soft ${isMine ? "bg-brand-600 text-white" : "bg-white text-ink-800"}`}>
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
  )
}

export default PatientChat
