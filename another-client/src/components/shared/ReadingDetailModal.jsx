import { useEffect, useMemo, useState } from "react"
import { toast } from "react-toastify"
import ECGChart from "../patient/ECGChart"
import { readingsApi } from "../../services/api"
import {
  formatAiResultForDisplay,
  isAbnormalAiResultText,
  getAiColorByCode,
  getAiLabelFromCode,
  resolveAiCodeFromLabel,
} from "../../strings/ecgAiStrings"
import ModalFrame from "./ModalFrame"

const normalizeAiStatus = (value) => {
  const normalized = String(value || "").trim().toUpperCase()
  if (normalized === "DONE" || normalized === "FAILED" || normalized === "PENDING") {
    return normalized
  }
  return "PENDING"
}

const normalizeEcgSignal = (signal) => {
  if (Array.isArray(signal)) return signal
  if (typeof signal === "string") {
    try {
      const parsed = JSON.parse(signal)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

const normalizeHighlightSegments = (alerts = [], signalLength = 0) => {
  if (!Array.isArray(alerts)) return []
  return alerts.map((alert) => {
    const start = Number.parseInt(alert?.segment_start_sample, 10)
    const end = Number.parseInt(alert?.segment_end_sample, 10)
    if (!Number.isInteger(start) || !Number.isInteger(end) || end <= start) return null
    const safeStart = Math.max(0, start)
    const safeEnd = signalLength > 0 ? Math.min(signalLength - 1, end) : end
    if (safeEnd <= safeStart) return null
    const labelCode = String(alert?.label_code || resolveAiCodeFromLabel(alert?.label_text || alert?.alert_type || "")).trim().toUpperCase()
    return {
      alert_id: alert?.alert_id || null,
      alert_type: alert?.alert_type || "",
      start_sample: safeStart,
      end_sample: safeEnd,
      label_code: labelCode || "Q",
      label_text: alert?.label_text || getAiLabelFromCode(labelCode || "Q"),
    }
  }).filter(Boolean)
}

const ReadingDetailModal = ({ show, onHide, readingId }) => {
  const [loading, setLoading] = useState(false)
  const [reading, setReading] = useState(null)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    if (!show) {
      setLoading(false)
      setReading(null)
      setErrorMessage("")
      return
    }
    if (!readingId) {
      setReading(null)
      setErrorMessage("Khong co reading de hien thi")
      return
    }

    const fetchDetail = async () => {
      try {
        setLoading(true)
        setReading(null)
        setErrorMessage("")
        const response = await readingsApi.getDetail(readingId)
        setReading(response.data?.reading || null)
      } catch (error) {
        console.error("Loi tai chi tiet reading:", error)
        const message = error.response?.data?.message || "Khong the tai chi tiet reading"
        setErrorMessage(message)
        toast.error(message)
      } finally {
        setLoading(false)
      }
    }

    fetchDetail()
  }, [show, readingId])

  useEffect(() => {
    if (!show || !readingId) return

    const handleReadingAiUpdated = async (event) => {
      const payload = event.detail || {}
      const updatedReadingId = Number.parseInt(payload?.reading_id, 10)

      if (!Number.isInteger(updatedReadingId) || updatedReadingId !== Number(readingId)) {
        return
      }

      const nextStatus = normalizeAiStatus(payload.ai_status)

      if (nextStatus === "DONE") {
        try {
          const response = await readingsApi.getDetail(readingId)
          setReading(response.data?.reading || null)
          setErrorMessage("")
        } catch (error) {
          console.error("Loi tai lai reading sau khi AI hoan tat:", error)
        }
        return
      }

      setReading((currentReading) => {
        if (!currentReading) return currentReading

        return {
          ...currentReading,
          ai_status: nextStatus,
          ai_result: payload.ai_result !== undefined ? payload.ai_result : currentReading.ai_result,
          abnormal_detected:
            payload.abnormal_detected !== undefined
              ? Boolean(payload.abnormal_detected)
              : currentReading.abnormal_detected,
          ai_error: payload.ai_error !== undefined ? payload.ai_error : currentReading.ai_error,
          ai_completed_at: payload.timestamp || currentReading.ai_completed_at,
        }
      })
    }

    window.addEventListener("readingAiUpdated", handleReadingAiUpdated)
    return () => window.removeEventListener("readingAiUpdated", handleReadingAiUpdated)
  }, [show, readingId])

  const aiStatus = useMemo(() => normalizeAiStatus(reading?.ai_status), [reading?.ai_status])
  const ecgSignal = useMemo(() => normalizeEcgSignal(reading?.ecg_signal), [reading?.ecg_signal])
  const aiResultDisplay = useMemo(() => formatAiResultForDisplay(reading?.ai_result), [reading?.ai_result])
  const aiAbnormal = useMemo(
    () => aiStatus === "DONE" && isAbnormalAiResultText(reading?.ai_result, reading?.abnormal_detected),
    [aiStatus, reading?.ai_result, reading?.abnormal_detected]
  )
  const highlightSegments = useMemo(
    () => aiStatus === "DONE" ? normalizeHighlightSegments(reading?.alerts, ecgSignal.length) : [],
    [aiStatus, reading?.alerts, ecgSignal.length]
  )
  const highlightLegend = useMemo(() => {
    const countByCode = new Map()
    highlightSegments.forEach((segment) => {
      const code = segment.label_code || "Q"
      countByCode.set(code, (countByCode.get(code) || 0) + 1)
    })
    return Array.from(countByCode.entries()).map(([code, count]) => ({
      code,
      label: getAiLabelFromCode(code),
      color: getAiColorByCode(code),
      count,
    }))
  }, [highlightSegments])

  const analysisSummary = useMemo(() => {
    if (aiStatus === "PENDING") {
      return {
        result: "Dang phan tich",
        status: "Dang cho AI hoan tat",
      }
    }

    if (aiStatus === "FAILED") {
      return {
        result: "Phan tich that bai",
        status: reading?.ai_error || "Khong the hoan tat suy luan AI",
      }
    }

    return {
      result: aiResultDisplay,
      status: aiAbnormal ? "Bat thuong" : "Binh thuong",
    }
  }, [aiStatus, aiResultDisplay, aiAbnormal, reading?.ai_error])

  return (
    <ModalFrame
      show={show}
      onClose={onHide}
      title="Chi tiet reading ECG"
      size="xl"
      footer={<button type="button" className="btn btn-outline-secondary" onClick={onHide}>Dong</button>}
    >
      {loading ? (
        <div className="flex justify-center py-8"><div className="spinner-border" /></div>
      ) : errorMessage ? (
        <div className="alert alert-danger">{errorMessage}</div>
      ) : reading ? (
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="rounded-xl bg-surface-soft p-5 text-sm text-ink-700">
            <p className="mb-2"><strong className="text-ink-900">Reading ID:</strong> {reading.reading_id}</p>
            <p className="mb-2"><strong className="text-ink-900">Thoi gian:</strong> {new Date(reading.timestamp).toLocaleString("vi-VN")}</p>
            <p className="mb-2"><strong className="text-ink-900">Nhip tim:</strong> {reading.heart_rate} BPM</p>
            <p className="mb-2"><strong className="text-ink-900">AI status:</strong> {aiStatus}</p>
            <p className="mb-2"><strong className="text-ink-900">Ket qua AI:</strong> {analysisSummary.result}</p>
            <p className="mb-2"><strong className="text-ink-900">Trang thai:</strong> {analysisSummary.status}</p>
            <p className="mb-2"><strong className="text-ink-900">AI completed:</strong> {reading?.ai_completed_at ? new Date(reading.ai_completed_at).toLocaleString("vi-VN") : "-"}</p>
            <p className="mb-2"><strong className="text-ink-900">Serial:</strong> {reading.device?.serial_number || "-"}</p>
            <p className="mb-0"><strong className="text-ink-900">Benh nhan:</strong> {reading.patient?.name || "-"}</p>
            <small className="text-muted">{reading.patient?.email || ""}</small>
          </div>
          <div className="space-y-4">
            <div className="rounded-xl border border-surface-line bg-white p-4 shadow-soft">
              <ECGChart data={ecgSignal} highlights={highlightSegments} />
            </div>
            <div className="rounded-xl border border-surface-line bg-surface-soft p-4">
              <h4 className="mb-3 text-base font-bold text-ink-900">Chú thích bất thường</h4>
              {aiStatus === "PENDING" ? (
                <p className="text-sm text-ink-600">Đang chờ AI hoàn tất.</p>
              ) : aiStatus === "FAILED" ? (
                <p className="text-sm text-ink-600">không có dữ liệu bất thường vì quá trình phân tích đã thất bại.</p>
              ) : highlightLegend.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {highlightLegend.map((item) => (
                    <div key={item.code} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-ink-700">{item.label}</span>
                      </div>
                      <span className="text-xs font-semibold text-ink-500">{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-600">Không có segment bất thường</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-sm text-ink-600">Không tìm thấy dữ liệu reading</div>
      )}
    </ModalFrame>
  )
}

export default ReadingDetailModal
