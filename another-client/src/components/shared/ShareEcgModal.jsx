import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import { chatApi } from "../../services/api"
import ModalFrame from "./ModalFrame"

const ShareEcgModal = ({ show, onHide, data, isAlert = false }) => {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedContactId, setSelectedContactId] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (show) {
      fetchContacts()
      setMessage("")
      setSelectedContactId("")
    }
  }, [show])

  const fetchContacts = async () => {
    try {
      setLoading(true)
      const response = await chatApi.getContacts()
      const list = response.data?.contacts || []
      setContacts(list)
      if (list.length > 0) {
        setSelectedContactId(list[0].user_id)
      }
    } catch (error) {
      console.error("Lỗi tải danh sách liên hệ:", error)
      toast.error("Không thể tải danh sách liên hệ để gửi")
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!selectedContactId) {
      toast.error("Vui lòng chọn người nhận")
      return
    }

    if (!data) {
      toast.error("Không có dữ liệu để gửi")
      return
    }

    setSending(true)
    try {
      // Chuẩn bị payload chia sẻ
      const readingId = isAlert ? data.reading_id : data.reading_id
      if (!readingId) {
        toast.error("Không thể gửi mục này vì không có mã bản ghi ECG")
        return
      }

      const sharePayload = {
        type: "ecg_share",
        reading_id: readingId,
        heart_rate: data.heart_rate || "-",
        ai_status: data.ai_status || "PENDING",
        ai_result: data.ai_result || "",
        timestamp: data.timestamp || data.created_at,
        patient_note: message.trim(),
        is_alert: isAlert,
      }

      if (isAlert) {
        sharePayload.alert_type = data.alert_type
        sharePayload.alert_message = data.message
      }

      const formattedMessage = `[[ECG_SHARE]]${JSON.stringify(sharePayload)}`

      await chatApi.sendDirect(selectedContactId, formattedMessage)
      toast.success("Đã gửi thành công")
      onHide()
    } catch (error) {
      console.error("Lỗi khi gửi:", error)
      toast.error("Không thể gửi tin nhắn")
    } finally {
      setSending(false)
    }
  }

  return (
    <ModalFrame
      show={show}
      onClose={onHide}
      eyebrow="Chia sẻ dữ liệu"
      title={isAlert ? "Gửi cảnh báo qua tin nhắn" : "Gửi bản ghi qua tin nhắn"}
      size="md"
      footer={
        <>
          <button type="button" className="ui-btn ui-btn-outline-secondary" onClick={onHide} disabled={sending}>
            Hủy
          </button>
          <button type="button" className="ui-btn ui-btn-primary" onClick={handleSend} disabled={sending || !selectedContactId}>
            {sending ? "Đang gửi..." : "Gửi tin nhắn"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="ui-spinner"></div>
          </div>
        ) : contacts.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-700">
            Không có liên hệ nào để gửi. Vui lòng kiểm tra quyền truy cập.
          </div>
        ) : (
          <form id="share-ecg-form" onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="ui-label">Chọn người nhận</label>
              <select
                className="ui-select"
                value={selectedContactId}
                onChange={(e) => setSelectedContactId(e.target.value)}
                disabled={sending}
                required
              >
                <option value="" disabled>-- Chọn người nhận --</option>
                {contacts.map((contact) => (
                  <option key={contact.user_id} value={contact.user_id}>
                    {contact.name} ({contact.email})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="rounded-xl border border-surface-line bg-surface-soft p-4">
              <p className="text-xs font-semibold uppercase text-ink-500 mb-2">Bản tóm tắt đính kèm</p>
              {isAlert ? (
                <>
                  <p className="text-sm font-bold text-ink-900">{data?.alert_type || "Cảnh báo"}</p>
                  <p className="text-xs text-ink-600 mt-1 line-clamp-2">{data?.message}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-ink-900">Bản ghi #{data?.reading_id}</p>
                  <p className="text-xs text-ink-600 mt-1">Nhịp tim: {data?.heart_rate || "-"} BPM</p>
                </>
              )}
            </div>

            <div>
              <label className="ui-label">Lời nhắn kèm theo (tùy chọn)</label>
              <textarea
                className="ui-field min-h-[100px]"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ví dụ: Bác sĩ xem giúp em bản ghi này với ạ..."
                disabled={sending}
              />
            </div>
          </form>
        )}
      </div>
    </ModalFrame>
  )
}

export default ShareEcgModal
