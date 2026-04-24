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

const formatDateTime = (value) => {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString("vi-VN")
}

const getAiStatusMeta = (aiStatus, aiAbnormal) => {
  if (aiStatus === "PENDING") {
    return {
      label: "Đang phân tích",
      icon: "fas fa-spinner",
      className: "border-amber-200 bg-amber-50 text-amber-700",
      dotClassName: "bg-amber-500",
    }
  }

  if (aiStatus === "FAILED") {
    return {
      label: "Phân tích thất bại",
      icon: "fas fa-circle-exclamation",
      className: "border-red-200 bg-red-50 text-red-700",
      dotClassName: "bg-red-500",
    }
  }

  if (aiAbnormal) {
    return {
      label: "Phát hiện bất thường",
      icon: "fas fa-triangle-exclamation",
      className: "border-brand-200 bg-brand-50 text-brand-700",
      dotClassName: "bg-brand-600",
    }
  }

  return {
    label: "Bình thường",
    icon: "fas fa-circle-check",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dotClassName: "bg-emerald-500",
  }
}

const getHeartRateMeta = (heartRate) => {
  const value = Number(heartRate)
  if (!Number.isFinite(value)) {
    return { label: "-", tone: "text-ink-900", helper: "Chưa có dữ liệu" }
  }
  if (value < 60) return { label: `${Math.round(value)} BPM`, tone: "text-amber-700", helper: "Thấp hơn khoảng nghỉ thường gặp" }
  if (value > 100) return { label: `${Math.round(value)} BPM`, tone: "text-brand-700", helper: "Cao hơn khoảng nghỉ thường gặp" }
  return { label: `${Math.round(value)} BPM`, tone: "text-emerald-700", helper: "Trong khoảng nghỉ thường gặp" }
}

const SummaryChip = ({ icon, label, value, tone = "text-ink-900", className = "bg-white" }) => (
  <div className={`flex min-w-0 items-center gap-3 rounded-xl border border-surface-line px-3 py-2 ${className}`}>
    <span className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-surface-soft text-brand-700">
      <i className={`${icon} text-sm`}></i>
    </span>
    <span className="min-w-0">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">{label}</span>
      <span className={`block truncate text-sm font-bold ${tone}`}>{value || "-"}</span>
    </span>
  </div>
)

const DetailLine = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 border-b border-surface-line py-2.5 last:border-b-0">
    <span className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-500">{label}</span>
    <span className="max-w-[62%] break-words text-right text-sm font-semibold text-ink-900">{value || "-"}</span>
  </div>
)

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
      setErrorMessage("Không có bản ghi để hiển thị")
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
        console.error("Lỗi tải chi tiết bản ghi:", error)
        const message = error.response?.data?.message || "Không thể tải chi tiết bản ghi ECG"
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
          console.error("Lỗi tải lại bản ghi sau khi AI hoàn tất:", error)
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
        result: "Đang phân tích",
        status: "Đang chờ AI hoàn tất",
      }
    }

    if (aiStatus === "FAILED") {
      return {
        result: "Phân tích thất bại",
        status: reading?.ai_error || "Không thể hoàn tất suy luận AI",
      }
    }

    return {
      result: aiResultDisplay,
      status: aiAbnormal ? "Bất thường" : "Bình thường",
    }
  }, [aiStatus, aiResultDisplay, aiAbnormal, reading?.ai_error])

  const aiStatusMeta = useMemo(() => getAiStatusMeta(aiStatus, aiAbnormal), [aiStatus, aiAbnormal])
  const heartRateMeta = useMemo(() => getHeartRateMeta(reading?.heart_rate), [reading?.heart_rate])
  const durationSeconds = ecgSignal.length > 0 ? (ecgSignal.length / 250).toFixed(1) : "-"

  return (
    <ModalFrame
      show={show}
      onClose={onHide}
      title="Chi tiết bản ghi ECG"
      size="xl"
      footer={<button type="button" className="btn btn-outline-secondary" onClick={onHide}>Đóng</button>}
    >
      {loading ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="h-16 animate-pulse rounded-xl bg-surface-soft"></div>
            <div className="h-16 animate-pulse rounded-xl bg-surface-soft"></div>
            <div className="h-16 animate-pulse rounded-xl bg-surface-soft"></div>
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="h-[330px] animate-pulse rounded-xl bg-surface-soft"></div>
            <div className="h-[330px] animate-pulse rounded-xl bg-surface-soft"></div>
          </div>
        </div>
      ) : errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
          <i className="fas fa-circle-exclamation mr-2"></i>
          {errorMessage}
        </div>
      ) : reading ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-surface-line bg-white p-3 shadow-soft">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-700">Chi tiết ECG</p>
                <h4 className="truncate text-base font-bold text-ink-900">Bản ghi #{reading.reading_id}</h4>
              </div>
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${aiStatusMeta.className}`}>
                <span className={`h-2 w-2 rounded-full ${aiStatusMeta.dotClassName}`}></span>
                <i className={`${aiStatusMeta.icon} ${aiStatus === "PENDING" ? "animate-spin" : ""}`}></i>
                {aiStatusMeta.label}
              </span>
            </div>
            <div className="grid gap-2 md:grid-cols-[170px_minmax(0,1fr)_150px]">
              <SummaryChip
                icon="fas fa-heart-pulse"
                label="Nhịp tim"
                value={heartRateMeta.label}
                tone={heartRateMeta.tone}
                className="bg-brand-50/60"
              />
              <SummaryChip
                icon="fas fa-brain"
                label="Kết luận AI"
                value={analysisSummary.result}
                tone={aiAbnormal ? "text-brand-700" : aiStatus === "FAILED" ? "text-red-700" : "text-emerald-700"}
              />
              <SummaryChip
                icon="fas fa-location-crosshairs"
                label="Segment"
                value={highlightSegments.length.toLocaleString("vi-VN")}
                tone={highlightSegments.length > 0 ? "text-brand-700" : "text-ink-900"}
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <section className="rounded-xl border border-surface-line bg-white p-3 shadow-soft">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-base font-bold text-ink-900">Đồ thị điện tâm đồ</h4>
                  <p className="text-xs text-ink-600">Cửa sổ 5 giây gần nhất, vùng bất thường được tô màu theo lớp AI.</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-lg bg-surface-soft px-2.5 py-1.5 text-xs font-semibold text-ink-600">
                  <i className="fas fa-chart-line text-brand-600"></i>
                  {ecgSignal.length.toLocaleString("vi-VN")} mẫu · {durationSeconds}s
                </span>
              </div>
              <ECGChart data={ecgSignal} highlights={highlightSegments} height={300} />
            </section>

            <aside className="space-y-3">
              <section className="rounded-xl border border-surface-line bg-white p-4 shadow-soft">
                <h4 className="text-sm font-bold text-ink-900">Thông tin bản ghi</h4>
                <div className="mt-2">
                  <DetailLine label="Thời gian" value={formatDateTime(reading.timestamp)} />
                  <DetailLine label="Bệnh nhân" value={reading.patient?.name || "-"} />
                  <DetailLine label="Email" value={reading.patient?.email || "-"} />
                  <DetailLine label="Thiết bị" value={reading.device?.serial_number || "-"} />
                  <DetailLine label="AI hoàn tất" value={formatDateTime(reading?.ai_completed_at)} />
                </div>
              </section>

              <section className="rounded-xl border border-surface-line bg-surface-soft p-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-bold text-ink-900">Chú thích bất thường</h4>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-ink-600 shadow-soft">
                    {highlightLegend.length.toLocaleString("vi-VN")} loại
                  </span>
                </div>
                <div className="mt-3">
                  {aiStatus === "PENDING" ? (
                    <p className="rounded-lg bg-white px-3 py-2 text-sm text-ink-600 shadow-soft">Đang chờ AI hoàn tất phân tích.</p>
                  ) : aiStatus === "FAILED" ? (
                    <p className="rounded-lg bg-white px-3 py-2 text-sm text-ink-600 shadow-soft">Không có dữ liệu bất thường vì quá trình phân tích đã thất bại.</p>
                  ) : highlightLegend.length > 0 ? (
                    <div className="space-y-2">
                      {highlightLegend.map((item) => (
                        <div key={item.code} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 shadow-soft">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="inline-block h-3 w-3 flex-none rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="truncate text-sm font-semibold text-ink-900">{item.label}</span>
                          </div>
                          <span className="text-xs font-bold text-ink-500">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-lg bg-white px-3 py-2 text-sm text-ink-600 shadow-soft">Không có segment bất thường.</p>
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-surface-line bg-white p-4 shadow-soft">
                <h4 className="text-sm font-bold text-ink-900">Diễn giải nhanh</h4>
                <p className="mt-2 text-sm leading-6 text-ink-700">{analysisSummary.status}</p>
                {heartRateMeta.helper ? <p className="mt-1 text-xs leading-5 text-ink-600">{heartRateMeta.helper}</p> : null}
              </section>
            </aside>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-sm text-ink-600">Không tìm thấy dữ liệu bản ghi.</div>
      )}
    </ModalFrame>
  )
}

export default ReadingDetailModal
