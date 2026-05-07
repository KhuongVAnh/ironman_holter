import { useMemo } from "react"
import { formatAiResultForDisplay } from "../../strings/ecgAiStrings"

const formatTime = (timestamp) => {
  if (!timestamp) return ""
  return new Date(timestamp).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  })
}

const getHeartRateTone = (heartRate) => {
  const value = Number(heartRate)
  if (!Number.isFinite(value)) return "text-ink-900"
  if (value < 60) return "text-amber-700"
  if (value > 100) return "text-red-700"
  return "text-emerald-700"
}

const EcgShareMessageBubble = ({ messageText, isMine, createdAt, onViewDetail }) => {
  const shareData = useMemo(() => {
    if (!messageText || typeof messageText !== "string") return null
    if (!messageText.startsWith("[[ECG_SHARE]]")) return null

    try {
      const jsonString = messageText.substring("[[ECG_SHARE]]".length)
      return JSON.parse(jsonString)
    } catch (e) {
      console.error("Lỗi parse ECG_SHARE message:", e)
      return null
    }
  }, [messageText])

  if (!shareData) {
    // Render tin nhắn bình thường
    return (
      <div className={`chat-bubble ${isMine ? "is-mine" : "is-peer"}`}>
        <p className="mb-0 whitespace-pre-wrap text-sm leading-6">{messageText}</p>
        <p className="chat-message-time">{formatTime(createdAt)}</p>
      </div>
    )
  }

  // Render thẻ chia sẻ ECG
  const {
    reading_id,
    heart_rate,
    ai_status,
    ai_result,
    timestamp,
    patient_note,
    is_alert,
    alert_type,
    alert_message,
  } = shareData

  const aiStatusDisplay = String(ai_status).toUpperCase() === "PENDING"
    ? "Đang phân tích"
    : String(ai_status).toUpperCase() === "FAILED"
      ? "Phân tích thất bại"
      : formatAiResultForDisplay(ai_result)

  return (
    <div className="flex flex-col gap-2">
      <div className={`rounded-xl border border-brand-200 bg-white p-3 shadow-sm max-w-sm ${isMine ? "ml-auto rounded-tr-sm" : "mr-auto rounded-tl-sm"}`}>
        <div className="mb-2 flex items-center gap-2 border-b border-surface-line pb-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <i className={`fas ${is_alert ? "fa-triangle-exclamation text-amber-600 bg-amber-50" : "fa-heart-pulse"}`}></i>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold uppercase tracking-wider text-brand-700">
              {is_alert ? "Chia sẻ cảnh báo" : "Chia sẻ bản ghi ECG"}
            </p>
            <p className="text-xs text-ink-500">{formatTime(timestamp)}</p>
          </div>
        </div>

        <div className="space-y-2">
          {is_alert ? (
            <>
              <div>
                <span className="text-[11px] text-ink-500">Loại cảnh báo:</span>
                <p className="text-sm font-bold text-ink-900">{alert_type}</p>
              </div>
              <div>
                <span className="text-[11px] text-ink-500">Nội dung:</span>
                <p className="text-sm text-ink-700 line-clamp-2">{alert_message}</p>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-surface-soft p-2">
                <span className="block text-[11px] text-ink-500">Nhịp tim</span>
                <span className={`block text-sm font-bold ${getHeartRateTone(heart_rate)}`}>
                  {heart_rate} BPM
                </span>
              </div>
              <div className="rounded-lg bg-surface-soft p-2">
                <span className="block text-[11px] text-ink-500">AI</span>
                <span className="block truncate text-sm font-bold text-ink-900" title={aiStatusDisplay}>
                  {aiStatusDisplay}
                </span>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          className="ui-btn ui-btn-outline-primary ui-btn-sm mt-3 w-full"
          onClick={() => onViewDetail(reading_id)}
        >
          <i className="fas fa-eye me-1"></i> Xem chi tiết
        </button>
      </div>

      {patient_note && (
        <div className={`chat-bubble ${isMine ? "is-mine" : "is-peer"} mt-1`}>
          <p className="mb-0 whitespace-pre-wrap text-sm leading-6">{patient_note}</p>
          <p className="chat-message-time">{formatTime(createdAt)}</p>
        </div>
      )}
      {!patient_note && (
        <p className={`text-[10px] text-ink-400 mt-0.5 ${isMine ? "text-right" : "text-left"}`}>
          {formatTime(createdAt)}
        </p>
      )}
    </div>
  )
}

export default EcgShareMessageBubble
