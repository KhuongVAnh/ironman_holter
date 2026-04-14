import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { toast } from "react-toastify"
import { useAuth } from "../../contexts/AuthContext"
import MedicalHistoryList from "../shared/MedicalHistoryList"
import MedicalHistoryForm from "../shared/MedicalHistoryForm"
import ReadingDetailModal from "../shared/ReadingDetailModal"
import { alertsApi, historyApi } from "../../services/api"
import { ALERT_TYPE, ROLE } from "../../services/string"

const DoctorHistoryPanel = () => {
  const { patientId } = useParams()
  const { user } = useAuth()
  const [histories, setHistories] = useState([])
  const [alerts, setAlerts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [loadingAlerts, setLoadingAlerts] = useState(true)
  const [editData, setEditData] = useState(null)
  const [selectedReadingId, setSelectedReadingId] = useState(null)

  useEffect(() => {
    if (!patientId) return
    fetchHistory()
    fetchAlerts()
  }, [patientId])

  const fetchHistory = async () => {
    try {
      const response = await historyApi.getByUser(patientId)
      setHistories(response.data || [])
    } catch (error) {
      console.error(error)
      toast.error("Không thể tải bệnh sử")
    }
  }

  const fetchAlerts = async () => {
    try {
      setLoadingAlerts(true)
      const response = await alertsApi.getByUser(patientId)
      setAlerts(response.data.alerts || [])
    } catch (error) {
      console.error("Lỗi tải cảnh báo:", error)
      toast.error("Không thể tải danh sách cảnh báo")
    } finally {
      setLoadingAlerts(false)
    }
  }

  const handleCreate = async (data) => {
    try {
      const payload = { ...data, user_id: Number(patientId) }
      const response = await historyApi.create(payload)
      toast.success(response.data.message)
      setShowForm(false)
      setEditData(null)
      fetchHistory()
    } catch (error) {
      console.error(error)
      toast.error("Lỗi khi thêm bệnh sử")
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa bản ghi này?")) return
    try {
      await historyApi.delete(id)
      toast.warning("Đã xóa bản ghi")
      fetchHistory()
    } catch (error) {
      console.error(error)
      toast.error("Không thể xóa")
    }
  }

  const handleUpdate = async (data) => {
    try {
      const response = await historyApi.update(data.history_id, data)
      toast.info(response.data.message)
      setShowForm(false)
      setEditData(null)
      fetchHistory()
    } catch (error) {
      console.error(error)
      toast.error("Không thể cập nhật bệnh sử")
    }
  }

  const handleResolve = async (alertId) => {
    if (!window.confirm("Xác nhận xử lý cảnh báo này?")) return
    try {
      await alertsApi.resolve(alertId)
      toast.success("Đã đánh dấu cảnh báo đã xử lý")
      fetchAlerts()
    } catch (error) {
      console.error("Lỗi xử lý cảnh báo:", error)
      toast.error("Không thể xử lý cảnh báo")
    }
  }

  const getAlertPriority = (type) => {
    if (!type) return "bg-slate-100 text-slate-700"
    const normalized = String(type).toLowerCase()
    if (normalized.includes("ngung tim") || normalized.includes(ALERT_TYPE.RUNG_NHI)) return "bg-red-100 text-red-700"
    if (normalized.includes(ALERT_TYPE.NGOAI_TAM_THU)) return "bg-amber-100 text-amber-700"
    if (normalized.includes(ALERT_TYPE.NHIP_NHANH)) return "bg-sky-100 text-sky-700"
    return "bg-slate-100 text-slate-700"
  }

  return (
    <div className="space-y-6">
      <section className="app-card">
        <div className="app-card-header">
          <div>
            <h1 className="section-title"><i className="fas fa-notes-medical me-2 text-brand-600"></i>Bệnh sử bệnh nhân #{patientId}</h1>
            <p className="section-subtitle">Theo dõi ghi chú lâm sàng, cập nhật chẩn đoán và đơn thuốc.</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => { setEditData(null); setShowForm(true) }}><i className="fas fa-plus me-2"></i>Thêm bệnh sử</button>
        </div>
        <div className="app-card-body">
          <MedicalHistoryList histories={histories} onEdit={(record) => { setEditData(record); setShowForm(true) }} onDelete={handleDelete} role={ROLE.BAC_SI} />
          <MedicalHistoryForm show={showForm} handleClose={() => { setShowForm(false); setEditData(null) }} onSubmit={editData ? handleUpdate : handleCreate} initialData={editData} role={ROLE.BAC_SI} />
        </div>
      </section>

      <section className="app-card">
        <div className="app-card-header">
          <div>
            <h2 className="section-title"><i className="fas fa-bell me-2 text-red-600"></i>Cảnh báo bệnh nhân</h2>
            <p className="section-subtitle">Mở reading ECG tương ứng và đánh dấu xử lý khi cần.</p>
          </div>
          <button type="button" className="btn btn-outline-primary btn-sm" onClick={fetchAlerts}><i className="fas fa-rotate me-1"></i>Làm mới</button>
        </div>
        <div className="app-card-body">
          {loadingAlerts ? (
            <div className="flex justify-center py-6"><div className="spinner-border"></div></div>
          ) : alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert) => {
                const isDisabled = !alert.reading_id
                return (
                  <button key={alert.alert_id} type="button" className={`alert-clickable-surface w-100 rounded-[24px] p-5 text-start ${isDisabled ? "is-disabled" : ""}`} disabled={isDisabled} onClick={() => setSelectedReadingId(alert.reading_id)}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getAlertPriority(alert.alert_type)}`}>{alert.alert_type}</span>
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${alert.resolved ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{alert.resolved ? "Đã xử lý" : "Chưa xử lý"}</span>
                        </div>
                        <p className="mb-2 text-sm text-ink-700">{alert.message}</p>
                        <p className="text-xs text-ink-500">{new Date(alert.timestamp).toLocaleString("vi-VN")}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isDisabled ? <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Không có reading</span> : null}
                        {!alert.resolved ? <span onClick={(event) => { event.stopPropagation(); handleResolve(alert.alert_id) }} className="btn btn-outline-success btn-sm"><i className="fas fa-check me-1"></i>Xử lý</span> : <i className="fas fa-circle-check text-emerald-600"></i>}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-ink-600">Không có cảnh báo nào.</div>
          )}
        </div>
      </section>

      <ReadingDetailModal show={Boolean(selectedReadingId)} readingId={selectedReadingId} onHide={() => setSelectedReadingId(null)} />
    </div>
  )
}

export default DoctorHistoryPanel
