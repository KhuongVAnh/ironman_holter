import { useEffect, useRef, useState } from "react"
import { toast } from "react-toastify"
import { chatApi } from "../../services/api"
import { ROLE } from "../../services/string"

const Chatbot = ({ userId, userRole }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (isOpen && userId) loadChatHistory()
  }, [isOpen, userId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const loadChatHistory = async () => {
    try {
      const response = await chatApi.getHistory()
      const history = response.data.history || []
      setMessages(history.map((chat) => ({ id: `${chat.role}-${chat.chat_id}`, text: chat.message, sender: chat.role, timestamp: new Date(chat.timestamp) })))
    } catch (error) {
      console.error("Lỗi tải lịch sử chat:", error)
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return
    const content = inputMessage
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, text: content, sender: "user", timestamp: new Date() }])
    setInputMessage("")
    setIsLoading(true)
    try {
      const response = await chatApi.send(content)
      setMessages((prev) => [...prev, { id: `bot-${Date.now()}`, text: response.data.response, sender: "bot", timestamp: new Date() }])
    } catch (error) {
      console.error("Lỗi gửi tin nhắn:", error)
      toast.error("Không thể gửi tin nhắn. Vui lòng thử lại.")
      setMessages((prev) => [...prev, { id: `bot-error-${Date.now()}`, text: "Xin loi, toi dang gap su co ky thuat. Vui long thu lai sau.", sender: "bot", timestamp: new Date() }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => setMessages([])

  const getWelcomeMessage = () => {
    switch (userRole) {
      case ROLE.BENH_NHAN:
        return "Xin chào. Tôi có thể giải thích các chỉ số ECG, trạng thái cảnh báo và các thông tin tim mạch cơ bản."
      case ROLE.BAC_SI:
        return "Xin chào bác sĩ. Tôi có thể hỗ trợ tóm tắt ECG, nhận diện cảnh báo và tra cứu thông tin y khoa nền tảng."
      case ROLE.GIA_DINH:
        return "Xin chào. Tôi có thể giải thích tình trạng sức khỏe của người thân và các cảnh báo liên quan."
      case ROLE.ADMIN:
        return "Xin chào admin. Tôi có thể hỗ trợ giải thích số liệu và sự kiện vận hành hệ thống."
      default:
        return "Xin chao. Toi la tro ly AI Ironman Holter."
    }
  }

  const formatTime = (timestamp) => new Date(timestamp).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })

  return (
    <>
      <div className="fixed bottom-5 right-5 z-40">
        <button type="button" className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-lg text-white shadow-float transition hover:bg-brand-700" onClick={() => setIsOpen((prev) => !prev)}>
          <i className={`fas ${isOpen ? "fa-xmark" : "fa-robot"}`}></i>
        </button>
      </div>

      {isOpen ? (
        <div className="fixed bottom-24 right-5 z-40 flex h-[520px] w-[400px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-surface-line bg-white shadow-panel">
          <div className="flex items-center justify-between bg-brand-600 px-5 py-4 text-white">
            <div>
              <p className="text-sm font-bold">Tro ly AI Ironman</p>
              <p className="text-xs text-white/75">Ho tro tim mach 24/7</p>
            </div>
            <div className="relative">
              <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" onClick={() => setShowMenu((prev) => !prev)}>
                <i className="fas fa-ellipsis"></i>
              </button>
              {showMenu ? (
                <div className="absolute right-0 top-12 w-52 rounded-2xl border border-surface-line bg-white p-2 text-sm text-ink-700 shadow-panel">
                  <button type="button" className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 hover:bg-surface-soft" onClick={() => { clearChat(); setShowMenu(false) }}>
                    <i className="fas fa-trash"></i>
                    Xoa cuoc tro chuyen
                  </button>
                  <button type="button" className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 hover:bg-surface-soft" onClick={() => { setIsOpen(false); setShowMenu(false) }}>
                    <i className="fas fa-xmark"></i>
                    Đóng chat
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-surface-soft px-4 py-4">
            {messages.length === 0 ? <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm text-ink-800">{getWelcomeMessage()}</div> : null}
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm shadow-soft ${message.sender === "user" ? "bg-brand-600 text-white" : "border border-surface-line bg-white text-ink-800"}`}>
                  {message.sender === "bot" ? <div className="mb-1 text-[11px] font-semibold uppercase text-brand-600">AI</div> : null}
                  <div className="whitespace-pre-wrap">{message.text}</div>
                  <div className={`mt-2 text-[11px] ${message.sender === "user" ? "text-white/70" : "text-ink-500"}`}>{formatTime(message.timestamp)}</div>
                </div>
              </div>
            ))}
            {isLoading ? (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-surface-line bg-white px-4 py-3 shadow-soft">
                  <div className="flex items-center gap-2 text-sm text-ink-600"><div className="spinner-border spinner-border-sm"></div>Đang suy nghĩ...</div>
                </div>
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-surface-line bg-white p-4">
            <div className="input-group">
              <textarea className="form-control min-h-[52px]" placeholder="Nhap cau hoi ve tim mach..." value={inputMessage} onChange={(event) => setInputMessage(event.target.value)} onKeyDown={handleKeyPress} disabled={isLoading} />
              <button type="button" className="btn btn-primary" onClick={sendMessage} disabled={!inputMessage.trim() || isLoading}><i className="fas fa-paper-plane"></i></button>
            </div>
            <p className="mt-2 text-xs text-ink-500">Nhan Enter de gui, Shift+Enter de xuong dong.</p>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default Chatbot
