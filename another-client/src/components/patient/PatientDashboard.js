import { useEffect, useMemo, useState } from "react"
import { toast } from "react-toastify"
import io from "socket.io-client"
import { API_BASE_URL } from "../../config/env"
import { useAuth } from "../../contexts/AuthContext"
import { accessApi, alertsApi, devicesApi, readingsApi } from "../../services/api"
import { ACCESS_ROLE, ACCESS_STATUS } from "../../services/string"
import { formatAiResultForDisplay, isAbnormalAiResultText } from "../../strings/ecgAiStrings"
import ECGChart from "./ECGChart"
import useECGStream from "./useECGStream"
import ReadingDetailModal from "../shared/ReadingDetailModal"
import RecentAlertsPanel, { getAlertTypeLabel } from "../shared/RecentAlertsPanel"
import { buildAlertKey, showToastOnce } from "../../utils/realtimeDedupe"

const DEFAULT_SAMPLE_RATE_HZ = 250
const DISPLAY_WINDOW_SECONDS = 5
const BUFFER_WINDOW_SECONDS = 10

const normalizeEcgChunk = (signal) => {
  if (!Array.isArray(signal)) return []

  return signal
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item))
}

const normalizeSampleRateHz = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_SAMPLE_RATE_HZ
  return parsed
}

const appendEcgChunk = (currentBuffer, nextChunk, bufferSampleLimit) => {
  const normalizedChunk = normalizeEcgChunk(nextChunk)
  if (normalizedChunk.length === 0) return currentBuffer

  const normalizedBuffer = normalizeEcgChunk(currentBuffer)
  return [...normalizedBuffer, ...normalizedChunk].slice(-bufferSampleLimit)
}

const normalizeAiStatus = (value) => {
  const normalized = String(value || "").trim().toUpperCase()
  if (normalized === "DONE" || normalized === "FAILED" || normalized === "PENDING") {
    return normalized
  }
  return "PENDING"
}

const buildAnalysisStateFromRealtime = (data = {}, currentState = null) => {
  const status = normalizeAiStatus(data.ai_status)
  const aiResultText = String(data.ai_result || "").trim()
  const abnormal = status === "DONE"
    ? isAbnormalAiResultText(aiResultText, data.abnormal_detected)
    : false

  return {
    readingId: Number.isInteger(Number(data.reading_id))
      ? Number(data.reading_id)
      : currentState?.readingId || null,
    status,
    result: status === "DONE" ? formatAiResultForDisplay(aiResultText) : null,
    rawResult: status === "DONE" ? aiResultText : null,
    time: data.timestamp || currentState?.time || null,
    abnormal,
    error: status === "FAILED" ? String(data.ai_error || "Phân tích AI thất bại") : null,
  }
}

const buildAlertToastMessage = (alertData = {}) => {
  const firstAlert = Array.isArray(alertData.alerts) ? alertData.alerts[0] : null

  return (
    firstAlert?.message ||
    alertData.message ||
    (Number.isInteger(Number(alertData.abnormal_count)) && Number(alertData.abnormal_count) > 0
      ? `Phát hiện ${Number(alertData.abnormal_count)} cảnh báo bất thường`
      : "Phát hiện cảnh báo bất thường")
  )
}

const PatientDashboard = () => {
  const { user } = useAuth()
  const [currentHeartRate, setCurrentHeartRate] = useState(null)
  const [ecgRealtimeState, setEcgRealtimeState] = useState({
    sampleRateHz: DEFAULT_SAMPLE_RATE_HZ,
    buffer: [],
  })
  const [recentAlerts, setRecentAlerts] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [analysisState, setAnalysisState] = useState(null)
  const [supervisingDoctors, setSupervisingDoctors] = useState([])
  const [selectedReadingId, setSelectedReadingId] = useState(null)

  useEffect(() => {
    const socketClient = io(API_BASE_URL)

    socketClient.on("connect", () => {
      setIsConnected(true)
      socketClient.emit("join-user-room", user.user_id)
    })

    socketClient.on("disconnect", () => setIsConnected(false))

    const handleEcgData = (data) => {
      const nextRealtimeHeartRate = Number.parseInt(data.heart_rate, 10)
      if (Number.isInteger(nextRealtimeHeartRate) && nextRealtimeHeartRate > 0) {
        setCurrentHeartRate(nextRealtimeHeartRate)
      }
      const nextSampleRateHz = normalizeSampleRateHz(data.sample_rate_hz)
      const bufferSampleLimit = Math.max(1, Math.round(nextSampleRateHz * BUFFER_WINDOW_SECONDS))

      setEcgRealtimeState((currentState) => {
        const shouldResetBuffer = currentState.sampleRateHz !== nextSampleRateHz
        const nextBuffer = appendEcgChunk(
          shouldResetBuffer ? [] : currentState.buffer,
          data.ecg_signal,
          bufferSampleLimit
        )

        return {
          sampleRateHz: nextSampleRateHz,
          buffer: nextBuffer,
        }
      })

      setAnalysisState((currentState) => buildAnalysisStateFromRealtime(data, currentState))
    }

    const handleReadingAiUpdated = (event) => {
      const payload = event.detail || {}
      const nextCompletedHeartRate = Number.parseInt(payload.heart_rate, 10)
      if (Number.isInteger(nextCompletedHeartRate) && nextCompletedHeartRate > 0) {
        setCurrentHeartRate(nextCompletedHeartRate)
      }

      setAnalysisState((currentState) => {
        const latestReadingId = currentState?.readingId
        const incomingReadingId = Number.isInteger(Number(payload.reading_id))
          ? Number(payload.reading_id)
          : null

        if (latestReadingId && incomingReadingId && latestReadingId !== incomingReadingId) {
          return currentState
        }

        return buildAnalysisStateFromRealtime(payload, currentState)
      })
    }

    const handleAlert = (event) => {
      const alertData = event.detail || {}
      if (String(alertData.user_id) === String(user.user_id)) {
        showToastOnce(buildAlertKey(alertData), "error", `Cảnh báo: ${buildAlertToastMessage(alertData)}`, { autoClose: 6000 }, 30000)
        fetchRecentAlerts()
      }
    }

    socketClient.on("reading-update", handleEcgData)
    window.addEventListener("readingAiUpdated", handleReadingAiUpdated)
    window.addEventListener("appAlert", handleAlert)

    fetchRecentAlerts()
    fetchSupervisingDoctors()

    return () => {
      socketClient.off("reading-update", handleEcgData)
      window.removeEventListener("readingAiUpdated", handleReadingAiUpdated)
      window.removeEventListener("appAlert", handleAlert)
      socketClient.close()
    }
  }, [user.user_id])

  const streamedEcgData = useECGStream(
    ecgRealtimeState.buffer,
    ecgRealtimeState.sampleRateHz,
    0.2,
    DISPLAY_WINDOW_SECONDS
  )

  const fetchRecentAlerts = async () => {
    try {
      const response = await alertsApi.getByUser(user.user_id, false)
      const nextAlerts = Array.isArray(response.data?.alerts) ? response.data.alerts : []
      setRecentAlerts(nextAlerts.slice(0, 4))
    } catch (error) {
      console.error("Lỗi lấy cảnh báo:", error)
    }
  }

  const fetchSupervisingDoctors = async () => {
    try {
      const response = await accessApi.list(user.user_id)
      const doctors = (response.data || [])
        .filter((item) => item.role === ACCESS_ROLE.BAC_SI && item.status === ACCESS_STATUS.ACCEPTED)
        .map((item) => ({
          id: item.viewer_id,
          name: item.viewer?.name || "Không rõ tên",
          email: item.viewer?.email || "-",
          specialty: item.viewer?.specialty || "Tim mạch",
        }))
      setSupervisingDoctors(doctors)
    } catch (error) {
      console.error("Lỗi tải danh sách bác sĩ:", error)
    }
  }

  const generateFakeData = async () => {
    try {
      const deviceResponse = await devicesApi.getByUser(user.user_id)
      const devices = deviceResponse?.data?.devices || []
      if (devices.length === 0) {
        toast.error("Không tìm thấy thiết bị đã đăng ký")
        return
      }
      await readingsApi.createFake(devices[0].device_id)
      toast.success("Đã gửi dữ liệu mô phỏng lên MQTT")
    } catch (error) {
      console.error("Lỗi tạo dữ liệu giả:", error)
      toast.error("Không thể tạo dữ liệu mô phỏng")
    }
  }

  const aiCard = useMemo(() => {
    if (!analysisState || analysisState.status === "PENDING") {
      return {
        title: "Đang phân tích AI",
        detail: "Tín hiệu ECG đã đến, hệ thống đang chờ AI hoàn tất kết luận.",
        tone: "bg-slate-100 text-slate-700",
      }
    }

    if (analysisState.status === "FAILED") {
      return {
        title: "Phân tích thất bại",
        detail: analysisState.error || "Không thể hoàn tất suy luận AI cho bản ghi này.",
        tone: "bg-rose-50 text-rose-700",
      }
    }

    if (analysisState.abnormal) {
      return {
        title: "Phát hiện bất thường",
        detail: analysisState.result,
        tone: "bg-amber-50 text-amber-700",
      }
    }

    return {
      title: "Nhịp xoang bình thường",
      detail: analysisState.result,
      tone: "bg-emerald-50 text-emerald-700",
    }
  }, [analysisState])

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="page-hero-icon"><i className="fas fa-heart-pulse"></i></div>
        <div className="min-w-0 flex-1">
          <p className="panel-eyebrow">Dashboard bệnh nhân</p>
          <h1 className="page-hero-title">Theo dõi ECG trực tiếp</h1>
          <p className="page-hero-subtitle">Biểu đồ ECG là vùng chính; nhịp tim và kết luận AI được đặt ngay trong cùng khung để đọc nhanh.</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="clinical-panel overflow-hidden">
          <div className="clinical-panel-header py-3">
            <div>
              <p className="panel-eyebrow">ECG realtime</p>
              <h2 className="text-xl font-bold text-ink-900">Biểu đồ điện tâm đồ</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="pointer-events-auto inline-flex min-h-10 items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-float transition hover:bg-brand-700" onClick={generateFakeData}>
                <i className="fas fa-play text-xs"></i>
                Mô phỏng
              </button>
              <span className="status-chip is-info">25 mm/s</span>
              <span className="status-chip is-neutral">10 mm/mV</span>
            </div>
          </div>
          <div className="p-2">
            <div className="relative w-full">
              <div className="pointer-events-none absolute left-2 right-2 top-2 z-10 flex flex-wrap items-start justify-between gap-2">
                <div className="flex max-w-full flex-wrap gap-2">
                  <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-red-100 bg-white/95 px-3 py-2 text-sm shadow-medium backdrop-blur">
                    <i className="fas fa-heartbeat text-red-600"></i>
                    <span className="text-xs font-bold uppercase tracking-[0.08em] text-red-700">Nhịp tim</span>
                    <span className="text-base font-bold text-ink-900">{currentHeartRate ?? "--"}</span>
                    <span className="text-xs font-bold text-red-700">BPM</span>
                  </div>
                  <div className={`pointer-events-auto flex max-w-[min(560px,calc(100vw-3rem))] items-start gap-2 rounded-2xl border bg-white/95 px-3 py-2 text-sm shadow-medium backdrop-blur ${analysisState?.status === "FAILED" ? "border-red-100" : analysisState?.abnormal ? "border-amber-100" : "border-emerald-100"}`}>
                    <i className={`fas fa-brain ${analysisState?.status === "FAILED" ? "text-red-600" : analysisState?.abnormal ? "text-amber-600" : "text-emerald-600"}`}></i>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-[0.08em] text-ink-500">AI</span>
                        <span className="font-bold text-ink-900">{aiCard.title}</span>
                      </div>
                      <p className="mt-0.5 max-w-[min(480px,calc(100vw-8rem))] break-words text-xs leading-5 text-ink-700">{aiCard.detail}</p>
                    </div>
                  </div>
                </div>
              </div>
              <ECGChart
                data={streamedEcgData}
                sampleRate={ecgRealtimeState.sampleRateHz}
                displayWindowSeconds={DISPLAY_WINDOW_SECONDS}
                height={350}
              />
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <section className="clinical-panel overflow-hidden">
            <div className="clinical-panel-header">
              <div>
                <p className="panel-eyebrow">Bác sĩ phụ trách</p>
                <h2 className="section-title">{supervisingDoctors.length} người</h2>
              </div>
            </div>
            <div className="clinical-panel-body space-y-3">
              {supervisingDoctors.length > 0 ? supervisingDoctors.map((doctor) => (
                <div key={doctor.id} className="flex items-center gap-3 rounded-2xl border border-surface-line bg-white p-3 shadow-soft">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
                    <i className="fas fa-user-doctor"></i>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink-900">{doctor.name}</p>
                    <p className="truncate text-xs text-ink-500">{doctor.specialty}</p>
                  </div>
                </div>
              )) : (
                <div className="empty-state-rich py-6">
                  <div className="empty-state-rich-icon info"><i className="fas fa-user-doctor"></i></div>
                  <p className="mt-3 text-sm text-ink-600">Chưa có bác sĩ nào đang theo dõi dữ liệu của bạn.</p>
                </div>
              )}
            </div>
          </section>
        </aside>
      </section>

      <RecentAlertsPanel
        title="Cảnh báo gần nhất"
        subtitle="Ưu tiên xử lý cảnh báo nguy cơ cao trước, sau đó kiểm tra bản ghi ECG liên quan."
        alerts={recentAlerts}
        viewAllLink={{ to: "/alerts", label: "Xem tất cả" }}
        onAlertClick={(alert) => setSelectedReadingId(alert?.reading_id || null)}
        getAlertTitle={(alert) => getAlertTypeLabel(alert.alert_type)}
        getAlertStatus={(alert) => alert?.resolved ? { label: "Đã xử lý", variant: "is-resolved" } : { label: "Mới", variant: "is-pending" }}
        getAlertHint={(_alert, disabled) => (disabled ? "Không có bản ghi" : "Nhấn để xem đồ thị ECG")}
        emptyText="Không có cảnh báo nào"
      />

      <ReadingDetailModal show={Boolean(selectedReadingId)} readingId={selectedReadingId} onHide={() => setSelectedReadingId(null)} />
    </div>
  )
}

export default PatientDashboard
