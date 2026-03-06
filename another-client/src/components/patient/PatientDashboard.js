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

const PatientDashboard = () => {
  const { user } = useAuth()
  const [currentHeartRate, setCurrentHeartRate] = useState(75)
  const [rawEcgData, setRawEcgData] = useState([])
  const [recentAlerts, setRecentAlerts] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [aiResult, setAiResult] = useState(null)
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
      setCurrentHeartRate(data.heart_rate)
      if (Array.isArray(data.ecg_signal) && data.ecg_signal.length > 0) setRawEcgData(data.ecg_signal)
      const aiResultText = String(data.ai_result || "").trim()
      const abnormal = isAbnormalAiResultText(aiResultText, data.abnormal_detected)
      setAiResult({ result: formatAiResultForDisplay(aiResultText), time: data.timestamp, abnormal })
      if (abnormal) toast.warning(`Phát hiện bất thường: ${data.heart_rate} bpm`)
    }

    const handleAlert = (alertData) => {
      if (alertData.user_id === user.user_id) {
        toast.error(`Cảnh báo: ${alertData.message}`)
        fetchRecentAlerts()
      }
    }

    socketClient.on("reading-update", handleEcgData)
    socketClient.on("fake-reading", handleEcgData)
    socketClient.on("alert", handleAlert)

    fetchRecentAlerts()
    fetchSupervisingDoctors()

    return () => {
      socketClient.off("reading-update", handleEcgData)
      socketClient.off("fake-reading", handleEcgData)
      socketClient.off("alert", handleAlert)
      socketClient.close()
    }
  }, [user.user_id])

  const streamedEcgData = useECGStream(rawEcgData, 250, 0.2)

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
      toast.success("Đã tạo dữ liệu mô phỏng để kiểm tra giao diện")
    } catch (error) {
      console.error("Lỗi tạo dữ liệu giả:", error)
      toast.error("Không thể tạo dữ liệu mô phỏng")
    }
  }

  const aiCard = useMemo(() => {
    if (!aiResult) return { title: "Đang phân tích", detail: "Hệ thống cần thêm dữ liệu để đưa ra kết luận.", tone: "bg-slate-100 text-slate-700" }
    if (aiResult.abnormal) return { title: "Cần lưu ý", detail: aiResult.result, tone: "bg-amber-50 text-amber-700" }
    return { title: "Nhịp xoang bình thường", detail: aiResult.result, tone: "bg-emerald-50 text-emerald-700" }
  }, [aiResult])

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)] xl:items-stretch">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2 content-start">
          <div className="app-card md:col-span-2 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-ink-500">Nhịp tim hiện tại</p>
                <div className="mt-3 flex items-end gap-3">
                  <span className="text-6xl font-black tracking-tighter text-ink-900">{currentHeartRate}</span>
                  <span className="pb-2 text-lg font-bold text-brand-600">BPM</span>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600"></span>
                </span>
                Trực tiếp
              </div>
            </div>
          </div>

          <div className="app-card md:col-span-2 p-5">
            <div className="flex items-center gap-2 text-brand-600">
              <i className="fas fa-link text-sm"></i>
              <p className="text-xs font-bold uppercase tracking-[0.18em]">Thiết bị</p>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className={`inline-flex h-3 w-3 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500"}`}></span>
              <span className="text-base font-bold text-ink-900">{isConnected ? "Đang kết nối" : "Mất kết nối"}</span>
            </div>
            <p className="mt-2 text-xs text-ink-500">Thiết bị cần duy trì kết nối để dữ liệu ECG không bị đứt quãng.</p>
          </div>

          <div className="app-card md:col-span-2 p-5">
            <div className={`flex items-center gap-4 rounded-[22px] px-4 py-4 ${aiCard.tone}`}>
              <div className="rounded-full bg-brand-50 p-3 text-brand-600"><i className="fas fa-brain"></i></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.18em]">Phân tích Ironman AI</p>
                <p className="mt-1 text-base font-bold">{aiCard.title}</p>
                <p className="mt-1 text-sm opacity-80">{aiCard.detail}</p>
              </div>
              <i className="fas fa-badge-check opacity-60"></i>
            </div>
          </div>
        </div>

        <div className="app-card flex min-h-[430px] flex-col overflow-hidden xl:min-h-[470px]">
          <div className="flex items-center justify-between border-b border-surface-line px-5 py-4">
            <div className="flex items-center gap-3">
              <i className="fas fa-heart-pulse text-brand-600"></i>
              <h3 className="text-lg font-bold">Biểu đồ điện tâm đồ (ECG)</h3>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em]">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-white shadow-soft transition hover:bg-brand-700"
                onClick={generateFakeData}
              >
                <i className="fas fa-play text-[10px]"></i>
                Dữ liệu mô phỏng
              </button>
              <span className="rounded-md bg-brand-50 px-3 py-1 text-brand-700">25 mm/s</span>
              <span className="rounded-md bg-surface px-3 py-1 text-ink-500">10 mm/mV</span>
            </div>
          </div>
          <div className="flex-1 p-4">
            <div className="h-full rounded-[28px] border border-brand-100/80 bg-[linear-gradient(rgba(253,164,175,0.7)_1px,transparent_1px),linear-gradient(90deg,rgba(253,164,175,0.7)_1px,transparent_1px),linear-gradient(rgba(254,202,202,0.6)_0.5px,transparent_0.5px),linear-gradient(90deg,rgba(254,202,202,0.6)_0.5px,transparent_0.5px)] bg-[size:50px_50px,50px_50px,10px_10px,10px_10px]">
              <ECGChart data={streamedEcgData} height={360} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="app-card">
          <div className="app-card-header">
            <div>
              <h2 className="section-title">Cảnh báo gần nhất</h2>
              <p className="section-subtitle">Ưu tiên xử lý cảnh báo nguy cơ cao trước, sau đó kiểm tra bản ghi ECG liên quan.</p>
            </div>
          </div>
          <div className="app-card-body">
            <RecentAlertsPanel
              title=""
              subtitle=""
              alerts={recentAlerts}
              onAlertClick={(alert) => setSelectedReadingId(alert?.reading_id || null)}
              getAlertTitle={(alert) => getAlertTypeLabel(alert.alert_type)}
              getAlertStatus={(alert) => alert?.resolved ? { label: "Đã xử lý", variant: "is-resolved" } : { label: "Mới", variant: "is-pending" }}
              getAlertHint={(_alert, disabled) => (disabled ? "Không có reading" : "Nhấn để xem đồ thị ECG")}
              emptyText="Không có cảnh báo nào"
            />
          </div>
        </div>

        <div className="app-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-ink-900">Bác sĩ phụ trách</h3>
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">{supervisingDoctors.length} người</span>
          </div>
          <div className="mt-5 space-y-4">
            {supervisingDoctors.length > 0 ? supervisingDoctors.map((doctor) => (
              <div key={doctor.id} className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                  <i className="fas fa-user-doctor"></i>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink-900">{doctor.name}</p>
                  <p className="text-xs text-ink-500">{doctor.specialty}</p>
                </div>
                <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600 hover:bg-brand-100">
                  <i className="fas fa-comment-medical"></i>
                </button>
              </div>
            )) : <p className="rounded-[20px] bg-surface px-4 py-4 text-sm text-ink-600">Chưa có bác sĩ nào đang theo dõi dữ liệu của bạn.</p>}
          </div>
        </div>
      </section>

      <ReadingDetailModal show={Boolean(selectedReadingId)} readingId={selectedReadingId} onHide={() => setSelectedReadingId(null)} />
    </div>
  )
}

export default PatientDashboard



