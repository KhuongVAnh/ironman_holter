"use client"

import { useEffect, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { toast } from "react-toastify"
import { useAuth } from "../../contexts/AuthContext"
import { alertsApi, doctorApi, medicalVisitsApi, medicationPlansApi, readingsApi, reportsApi } from "../../services/api"
import { ROLE } from "../../services/string"
import ECGChart from "../patient/ECGChart"
import MedicalVisitForm from "../shared/MedicalVisitForm"
import MedicalVisitList from "../shared/MedicalVisitList"
import MedicationPlanForm from "../shared/MedicationPlanForm"
import MedicationPlanList from "../shared/MedicationPlanList"
import ModalFrame from "../shared/ModalFrame"
import PaginationBar from "../shared/PaginationBar"
import ReadingDetailModal from "../shared/ReadingDetailModal"
import { formatAiResultForDisplay } from "../../strings/ecgAiStrings"
import {
  ClinicalTabs,
  DoctorStatCard,
  EmptyState,
  PatientAvatar,
  formatDateTime,
  getAlertTone,
  getHeartRateTone,
  getPatientFromAccess,
} from "./DoctorUi"

const READINGS_PER_PAGE = 10
const ALERTS_PER_PAGE = 6

const PatientDetail = () => {
  const { user } = useAuth()
  const { patientId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [patient, setPatient] = useState(null)
  const [latestReading, setLatestReading] = useState(null)
  const [readings, setReadings] = useState([])
  const [readingTotal, setReadingTotal] = useState(0)
  const [readingPage, setReadingPage] = useState(1)
  const [alerts, setAlerts] = useState([])
  const [alertTotal, setAlertTotal] = useState(0)
  const [alertSummary, setAlertSummary] = useState({ total: 0, unresolved: 0, resolved: 0 })
  const [reports, setReports] = useState([])
  const [visits, setVisits] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [alertFilter, setAlertFilter] = useState("open")
  const [reportForm, setReportForm] = useState({ summary: "" })
  const [selectedReadingId, setSelectedReadingId] = useState(null)
  const [showVisitForm, setShowVisitForm] = useState(false)
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [editVisit, setEditVisit] = useState(null)
  const [editPlan, setEditPlan] = useState(null)
  const [showAlertForm, setShowAlertForm] = useState(false)
  const [alertPage, setAlertPage] = useState(1)
  const [alertForm, setAlertForm] = useState({
    reading_id: "",
    alert_type: "",
    message: "",
    segment_start_sample: "",
    segment_end_sample: "",
  })

  useEffect(() => {
    if (user?.user_id) {
      setReadingPage(1)
      setAlertPage(1)
      fetchPatientData()
    }
  }, [patientId, user?.user_id])

  useEffect(() => {
    if (location.hash === "#create-report") setActiveTab("reports")
  }, [location.hash])

  useEffect(() => {
    if (patient?.user_id && String(patient.user_id) === String(patientId)) fetchReadingsPage(readingPage)
  }, [patient?.user_id, patientId, readingPage])

  useEffect(() => {
    if (patient?.user_id && String(patient.user_id) === String(patientId)) fetchAlertsPage(alertPage, alertFilter)
  }, [patient?.user_id, patientId, alertPage, alertFilter])

  const fetchPatientData = async () => {
    try {
      setLoading(true)
      const patientsResponse = await doctorApi.getPatients(user.user_id)
      const patientData = (patientsResponse.data || [])
        .map(getPatientFromAccess)
        .find((item) => item?.user_id === Number.parseInt(patientId, 10))
      setPatient(patientData || null)

      if (!patientData) {
        setLatestReading(null)
        setReadings([])
        setReadingTotal(0)
        setAlerts([])
        setAlertTotal(0)
        setAlertSummary({ total: 0, unresolved: 0, resolved: 0 })
        setReports([])
        setVisits([])
        setPlans([])
        return
      }

      const [reportsResponse, visitsResponse, plansResponse] = await Promise.all([
        reportsApi.getByPatient(patientId),
        medicalVisitsApi.getByUser(patientId),
        medicationPlansApi.getByUser(patientId),
      ])

      setReports(reportsResponse.data?.reports || [])
      setVisits(visitsResponse.data || [])
      setPlans(plansResponse.data || [])
    } catch (error) {
      console.error("Lỗi tải workspace bệnh nhân:", error)
      toast.error("Không thể tải workspace bệnh nhân")
    } finally {
      setLoading(false)
    }
  }

  const fetchReadingsPage = async (page = readingPage) => {
    try {
      const offset = (page - 1) * READINGS_PER_PAGE
      const response = await readingsApi.getHistory(patientId, { limit: READINGS_PER_PAGE, offset })
      const nextReadings = Array.isArray(response.data?.readings) ? response.data.readings : []
      const nextTotal = Number.isInteger(response.data?.total) ? response.data.total : nextReadings.length
      setReadings(nextReadings)
      setReadingTotal(nextTotal)
      if (page === 1) {
        setLatestReading(nextReadings[0] || null)
      }
    } catch (error) {
      console.error("Lỗi tải dữ liệu ECG:", error)
      setReadings([])
      setReadingTotal(0)
      if (page === 1) setLatestReading(null)
      toast.error("Không thể tải dữ liệu ECG")
    }
  }

  const fetchAlertsPage = async (page = alertPage, filterValue = alertFilter) => {
    try {
      const offset = (page - 1) * ALERTS_PER_PAGE
      const resolved = filterValue === "all" ? undefined : filterValue === "resolved"
      const response = await alertsApi.getByUser(patientId, {
        ...(resolved !== undefined ? { resolved } : {}),
        limit: ALERTS_PER_PAGE,
        offset,
      })
      const nextAlerts = Array.isArray(response.data?.alerts) ? response.data.alerts : []
      setAlerts(nextAlerts)
      setAlertTotal(Number.isInteger(response.data?.total) ? response.data.total : nextAlerts.length)
      setAlertSummary(response.data?.summary || { total: 0, unresolved: 0, resolved: 0 })
    } catch (error) {
      console.error("Lỗi tải cảnh báo:", error)
      setAlerts([])
      setAlertTotal(0)
      setAlertSummary({ total: 0, unresolved: 0, resolved: 0 })
      toast.error("Không thể tải cảnh báo")
    }
  }

  const activePlans = plans.filter((plan) => plan.is_active)

  useEffect(() => {
    setAlertPage(1)
  }, [alertFilter, patientId])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(alertTotal / ALERTS_PER_PAGE))
    if (alertPage > totalPages) {
      setAlertPage(totalPages)
    }
  }, [alertPage, alertTotal])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(readingTotal / READINGS_PER_PAGE))
    if (readingPage > totalPages) {
      setReadingPage(totalPages)
    }
  }, [readingPage, readingTotal])

  const readingTotalPages = Math.max(1, Math.ceil(readingTotal / READINGS_PER_PAGE))
  const visibleReadingStart = readingTotal === 0 ? 0 : (readingPage - 1) * READINGS_PER_PAGE + 1
  const visibleReadingEnd = readingTotal === 0 ? 0 : Math.min(readingPage * READINGS_PER_PAGE, readingTotal)
  const alertTotalPages = Math.max(1, Math.ceil(alertTotal / ALERTS_PER_PAGE))
  const visibleAlertStart = alertTotal === 0 ? 0 : (alertPage - 1) * ALERTS_PER_PAGE + 1
  const visibleAlertEnd = alertTotal === 0 ? 0 : Math.min(alertPage * ALERTS_PER_PAGE, alertTotal)

  const tabs = [
    { value: "overview", label: "Tổng quan", icon: "fas fa-table-cells-large" },
    { value: "readings", label: "ECG", icon: "fas fa-wave-square", count: readingTotal },
    { value: "alerts", label: "Cảnh báo", icon: "fas fa-triangle-exclamation", count: alertSummary.unresolved },
    { value: "records", label: "Hồ sơ y tế", icon: "fas fa-notes-medical" },
    { value: "reports", label: "Báo cáo", icon: "fas fa-file-lines", count: reports.length },
  ]

  const createReport = async (event) => {
    event.preventDefault()
    if (!reportForm.summary.trim()) {
      toast.error("Vui lòng nhập nội dung báo cáo")
      return
    }

    try {
      await reportsApi.create(patientId, reportForm)
      toast.success("Tạo báo cáo thành công")
      setReportForm({ summary: "" })
      await fetchPatientData()
    } catch (error) {
      console.error("Lỗi tạo báo cáo:", error)
      toast.error(error.response?.data?.message || "Không thể tạo báo cáo")
    }
  }

  const resolveAlert = async (alertId) => {
    try {
      await alertsApi.resolve(alertId)
      toast.success("Đã xử lý cảnh báo")
      await fetchAlertsPage(alertPage, alertFilter)
    } catch (error) {
      console.error("Lỗi xử lý cảnh báo:", error)
      toast.error("Không thể xử lý cảnh báo")
    }
  }

  const openCreateAlertForm = () => {
    setAlertForm({
      reading_id: latestReading?.reading_id ? String(latestReading.reading_id) : "",
      alert_type: "",
      message: "",
      segment_start_sample: "",
      segment_end_sample: "",
    })
    setShowAlertForm(true)
  }

  const createManualAlert = async (event) => {
    event.preventDefault()
    const payload = {
      user_id: Number(patientId),
      reading_id: Number(alertForm.reading_id),
      alert_type: alertForm.alert_type.trim(),
      message: alertForm.message.trim(),
    }

    if (alertForm.segment_start_sample !== "") {
      payload.segment_start_sample = Number(alertForm.segment_start_sample)
    }
    if (alertForm.segment_end_sample !== "") {
      payload.segment_end_sample = Number(alertForm.segment_end_sample)
    }

    if (!payload.reading_id || !payload.alert_type || !payload.message) {
      toast.error("Vui lòng chọn bản ghi, loại cảnh báo và nội dung")
      return
    }

    try {
      await alertsApi.create(payload)
      toast.success("Đã tạo cảnh báo thủ công")
      setShowAlertForm(false)
      setAlertPage(1)
      await fetchAlertsPage(1, alertFilter)
    } catch (error) {
      console.error("Lỗi tạo cảnh báo thủ công:", error)
      toast.error(error.response?.data?.message || "Không thể tạo cảnh báo")
    }
  }

  const handleVisitSubmit = async (data) => {
    try {
      const payload = { ...data, user_id: Number(patientId) }
      const response = data.visit_id ? await medicalVisitsApi.update(data.visit_id, payload) : await medicalVisitsApi.create(payload)
      toast.success(response.data.message || "Đã lưu lần khám")
      setShowVisitForm(false)
      setEditVisit(null)
      await fetchPatientData()
    } catch (error) {
      console.error(error)
      toast.error(error.response?.data?.error || "Không thể lưu lần khám")
    }
  }

  const handleVisitDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa lần khám này?")) return
    try {
      await medicalVisitsApi.delete(id)
      toast.warning("Đã xóa lần khám")
      await fetchPatientData()
    } catch (error) {
      console.error(error)
      toast.error(error.response?.data?.error || "Không thể xóa lần khám")
    }
  }

  const handlePlanSubmit = async (data) => {
    try {
      const payload = { ...data, user_id: Number(patientId) }
      const response = data.plan_id ? await medicationPlansApi.update(data.plan_id, payload) : await medicationPlansApi.create(payload)
      toast.success(response.data.message || "Đã lưu đơn thuốc")
      setShowPlanForm(false)
      setEditPlan(null)
      await fetchPatientData()
    } catch (error) {
      console.error(error)
      toast.error(error.response?.data?.error || "Không thể lưu đơn thuốc")
    }
  }

  const handlePlanDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa đơn thuốc này?")) return
    try {
      await medicationPlansApi.delete(id)
      toast.warning("Đã xóa đơn thuốc")
      await fetchPatientData()
    } catch (error) {
      console.error(error)
      toast.error(error.response?.data?.error || "Không thể xóa đơn thuốc")
    }
  }

  if (loading) return <div className="flex min-h-[55vh] items-center justify-center"><div className="spinner-border"></div></div>

  if (!patient) {
    return <EmptyState icon="fas fa-user-lock" title="Không tìm thấy bệnh nhân" description="Bệnh nhân không tồn tại hoặc chưa cấp quyền theo dõi cho bác sĩ." />
  }

  return (
    <div className="space-y-6">
      <section className="sticky top-20 z-20 rounded-xl border border-surface-line bg-white/95 p-5 shadow-soft backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <PatientAvatar name={patient.name} size="lg" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand-700">Clinical chart</p>
              <h1 className="truncate text-3xl font-bold text-ink-950">{patient.name}</h1>
              <p className="truncate text-sm text-ink-500">{patient.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {latestReading ? (
              <span className="rounded-xl bg-surface-soft px-4 py-2 text-sm font-semibold text-ink-700">
                Nhịp gần nhất: <span className={`text-lg ${getHeartRateTone(latestReading.heart_rate)}`}>{latestReading.heart_rate} BPM</span>
              </span>
            ) : null}
            <button type="button" className="btn btn-outline-primary" onClick={() => navigate("/doctor/chat", { state: { patientId: patient.user_id } })}>
              <i className="fas fa-message me-2"></i>Nhắn tin
            </button>
            <button type="button" className="btn btn-outline-success" onClick={() => setActiveTab("reports")}>
              <i className="fas fa-file-medical me-2"></i>Tạo báo cáo
            </button>
            <button type="button" className="btn btn-primary" onClick={() => { setActiveTab("records"); setShowVisitForm(true) }}>
              <i className="fas fa-plus me-2"></i>Thêm lần khám
            </button>
          </div>
        </div>
      </section>

      <ClinicalTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "overview" ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <DoctorStatCard icon="fas fa-wave-square" label="Lần đo ECG" value={readingTotal} tone="brand" />
            <DoctorStatCard icon="fas fa-triangle-exclamation" label="Cảnh báo mở" value={alertSummary.unresolved} tone="red" />
            <DoctorStatCard icon="fas fa-pills" label="Đơn thuốc đang dùng" value={activePlans.length} tone="emerald" />
            <DoctorStatCard icon="fas fa-file-lines" label="Báo cáo" value={reports.length} tone="sky" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.85fr)]">
            <section className="clinical-panel overflow-hidden">
              <div className="clinical-panel-header">
                <div>
                  <h2 className="section-title">ECG gần nhất</h2>
                  <p className="section-subtitle">{latestReading ? formatDateTime(latestReading.timestamp) : "Chưa có dữ liệu đo"}</p>
                </div>
                {latestReading ? <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setSelectedReadingId(latestReading.reading_id)}>Mở chi tiết</button> : null}
              </div>
              <div className="clinical-panel-body">
                {latestReading ? <ECGChart data={latestReading.ecg_signal || []} /> : <EmptyState icon="fas fa-wave-square" title="Chưa có dữ liệu ECG" />}
              </div>
            </section>

            <div className="space-y-6">
              <section className="clinical-panel overflow-hidden">
                <div className="clinical-panel-header"><div><h2 className="section-title">Cảnh báo gần đây</h2><p className="section-subtitle">Ưu tiên cảnh báo chưa xử lý.</p></div></div>
                <div className="clinical-panel-body space-y-3">
                  {alerts.slice(0, 4).map((alert) => (
                    <button key={alert.alert_id} type="button" className="w-full rounded-xl border border-surface-line bg-white p-4 text-left shadow-soft" onClick={() => alert.reading_id && setSelectedReadingId(alert.reading_id)}>
                      <div className="flex items-center justify-between gap-3">
                        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getAlertTone(alert.alert_type, alert.resolved)}`}>{alert.alert_type}</span>
                        <span className="text-xs text-ink-500">{formatDateTime(alert.timestamp)}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-ink-700">{alert.message}</p>
                    </button>
                  ))}
                  {!alerts.length ? <EmptyState icon="fas fa-circle-check" title="Không có cảnh báo" /> : null}
                </div>
              </section>

              <section className="clinical-panel overflow-hidden">
                <div className="clinical-panel-header"><div><h2 className="section-title">Thuốc đang dùng</h2><p className="section-subtitle">Kế hoạch thuốc đang hoạt động.</p></div></div>
                <div className="clinical-panel-body space-y-3">
                  {activePlans.slice(0, 3).map((plan) => (
                    <div key={plan.plan_id} className="rounded-xl border border-surface-line bg-surface-soft p-4">
                      <p className="font-bold text-ink-900">{plan.title}</p>
                      <p className="mt-1 text-sm text-ink-600">{plan.medications?.length || 0} thuốc · bắt đầu {formatDateTime(plan.start_date)}</p>
                    </div>
                  ))}
                  {!activePlans.length ? <EmptyState icon="fas fa-pills" title="Không có đơn thuốc đang dùng" /> : null}
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "readings" ? (
        <section className="clinical-panel overflow-hidden">
          <div className="clinical-panel-header"><div><h2 className="section-title">Dữ liệu ECG</h2><p className="section-subtitle">Nhấn từng lần đo để xem đồ thị và segment cảnh báo.</p></div></div>
          <div className="clinical-panel-body">
            {readings.length ? (
              <>
                <div className="overflow-x-auto">
                  <table className="table align-middle">
                    <thead><tr><th>Thời gian</th><th>Nhịp tim</th><th>AI</th><th>Trạng thái</th><th className="text-end">Chi tiết</th></tr></thead>
                    <tbody>
                      {readings.map((reading) => (
                        <tr key={reading.reading_id}>
                          <td>{formatDateTime(reading.timestamp)}</td>
                          <td className={`font-bold ${getHeartRateTone(reading.heart_rate)}`}>{reading.heart_rate} BPM</td>
                          <td>
                            {String(reading.ai_status || "").toUpperCase() === "PENDING"
                              ? "Đang phân tích"
                              : String(reading.ai_status || "").toUpperCase() === "FAILED"
                                ? (reading.ai_error || "Phân tích thất bại")
                                : formatAiResultForDisplay(reading.ai_result)}
                          </td>
                          <td><span className={`rounded-full px-3 py-1 text-xs font-bold ${reading.abnormal_detected ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{reading.abnormal_detected ? "Bất thường" : "Bình thường"}</span></td>
                          <td className="text-end"><button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setSelectedReadingId(reading.reading_id)}><i className="fas fa-eye me-1"></i>Xem</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <PaginationBar
                  currentPage={readingPage}
                  totalPages={readingTotalPages}
                  onPageChange={setReadingPage}
                  summaryText={`Hiển thị ${visibleReadingStart}-${visibleReadingEnd} / ${readingTotal} ECG`}
                  className="mt-4"
                />
              </>
            ) : <EmptyState icon="fas fa-wave-square" title="Chưa có dữ liệu ECG" />}
          </div>
        </section>
      ) : null}

      {activeTab === "alerts" ? (
        <section className="clinical-panel overflow-hidden">
          <div className="clinical-panel-header">
            <div><h2 className="section-title">Cảnh báo</h2><p className="section-subtitle">Lọc, mở ECG và đánh dấu xử lý.</p></div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary btn-sm" onClick={openCreateAlertForm} disabled={!readingTotal}>
                <i className="fas fa-plus me-1"></i>Tạo cảnh báo
              </button>
              <select className="form-select w-auto" value={alertFilter} onChange={(event) => setAlertFilter(event.target.value)}>
                <option value="open">Chưa xử lý</option>
                <option value="resolved">Đã xử lý</option>
                <option value="all">Tất cả</option>
              </select>
            </div>
          </div>
          <div className="clinical-panel-body space-y-3">
            {alerts.length ? alerts.map((alert) => (
              <article key={alert.alert_id} className="rounded-xl border border-surface-line bg-white p-4 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getAlertTone(alert.alert_type, alert.resolved)}`}>{alert.alert_type}</span>
                    <p className="mt-3 text-sm text-ink-700">{alert.message}</p>
                    <p className="mt-2 text-xs text-ink-500">{formatDateTime(alert.timestamp)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {alert.reading_id ? <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setSelectedReadingId(alert.reading_id)}>Mở ECG</button> : null}
                    {!alert.resolved ? <button type="button" className="btn btn-outline-success btn-sm" onClick={() => resolveAlert(alert.alert_id)}>Đánh dấu đã xử lý</button> : null}
                  </div>
                </div>
              </article>
            )) : <EmptyState icon="fas fa-circle-check" title="Không có cảnh báo trong bộ lọc này" />}
            <PaginationBar
              currentPage={alertPage}
              totalPages={alertTotalPages}
              onPageChange={setAlertPage}
              summaryText={alertTotal > 0 ? `Hiển thị ${visibleAlertStart}-${visibleAlertEnd} / ${alertTotal} cảnh báo` : "Chưa có cảnh báo để phân trang"}
              className="mt-4"
            />
          </div>
        </section>
      ) : null}

      {activeTab === "records" ? (
        <div className="space-y-6">
          <section className="clinical-panel"><div className="clinical-panel-body"><MedicalVisitList visits={visits} onCreate={() => setShowVisitForm(true)} onEdit={(record) => { setEditVisit(record); setShowVisitForm(true) }} onDelete={handleVisitDelete} role={ROLE.BAC_SI} /></div></section>
          <section className="clinical-panel overflow-hidden">
            <div className="clinical-panel-header">
              <div><h2 className="section-title">Đơn thuốc và kế hoạch thuốc</h2><p className="section-subtitle">Quản lý thuốc đang dùng và các đợt điều trị cũ.</p></div>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowPlanForm(true)}><i className="fas fa-plus me-1"></i>Thêm đơn thuốc</button>
            </div>
            <div className="clinical-panel-body"><MedicationPlanList plans={plans} role={ROLE.BAC_SI} onEdit={(record) => { setEditPlan(record); setShowPlanForm(true) }} onDelete={handlePlanDelete} /></div>
          </section>
        </div>
      ) : null}

      {activeTab === "reports" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="clinical-panel overflow-hidden">
            <div className="clinical-panel-header"><div><h2 className="section-title">Báo cáo đã tạo</h2><p className="section-subtitle">Lịch sử nhận định chuyên môn cho bệnh nhân.</p></div></div>
            <div className="clinical-panel-body space-y-3">
              {reports.length ? reports.map((report) => (
                <article key={report.report_id} className="rounded-xl border border-surface-line bg-white p-4 shadow-soft">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="font-bold text-ink-900">Báo cáo #{report.report_id}</h3>
                    <span className="text-xs font-medium text-ink-500">{formatDateTime(report.created_at)}</span>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm text-ink-700">{report.summary}</p>
                  {report.doctor?.name ? <p className="mt-3 text-xs font-semibold text-ink-500">Bác sĩ: {report.doctor.name}</p> : null}
                </article>
              )) : <EmptyState icon="fas fa-file-lines" title="Chưa có báo cáo" />}
            </div>
          </section>

          <aside className="clinical-panel overflow-hidden" id="create-report">
            <div className="clinical-panel-header"><div><h2 className="section-title">Tạo báo cáo</h2><p className="section-subtitle">Ghi nhận nhận định và khuyến nghị chuyên môn.</p></div></div>
            <div className="clinical-panel-body">
              <form className="space-y-4" onSubmit={createReport}>
                <textarea className="form-control min-h-[220px]" value={reportForm.summary} onChange={(event) => setReportForm({ summary: event.target.value })} placeholder="Nhập nội dung báo cáo..." />
                <button type="submit" className="btn btn-primary w-100"><i className="fas fa-plus me-2"></i>Tạo báo cáo</button>
              </form>
            </div>
          </aside>
        </div>
      ) : null}

      <MedicalVisitForm show={showVisitForm} handleClose={() => { setShowVisitForm(false); setEditVisit(null) }} onSubmit={handleVisitSubmit} initialData={editVisit} />
      <MedicationPlanForm show={showPlanForm} handleClose={() => { setShowPlanForm(false); setEditPlan(null) }} onSubmit={handlePlanSubmit} initialData={editPlan} />
      <ReadingDetailModal show={Boolean(selectedReadingId)} readingId={selectedReadingId} onHide={() => setSelectedReadingId(null)} />
      <ModalFrame
        show={showAlertForm}
        onClose={() => setShowAlertForm(false)}
        title="Tạo cảnh báo thủ công"
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAlertForm(false)}>Hủy</button>
            <button type="submit" form="manual-alert-form" className="btn btn-primary">Tạo cảnh báo</button>
          </>
        }
      >
        <form id="manual-alert-form" className="space-y-4" onSubmit={createManualAlert}>
          <div>
            <label className="form-label">Bản ghi ECG</label>
            <select className="form-select" value={alertForm.reading_id} onChange={(event) => setAlertForm((prev) => ({ ...prev, reading_id: event.target.value }))} required>
              <option value="">Chọn bản ghi</option>
              {readings.map((reading) => (
                <option key={reading.reading_id} value={reading.reading_id}>
                  #{reading.reading_id} - {formatDateTime(reading.timestamp)} - {reading.heart_rate} BPM
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Loại cảnh báo</label>
            <input className="form-control" value={alertForm.alert_type} onChange={(event) => setAlertForm((prev) => ({ ...prev, alert_type: event.target.value }))} placeholder="VD: Rung nhĩ, Nhịp nhanh, Ngoại tâm thu" required />
          </div>
          <div>
            <label className="form-label">Nội dung</label>
            <textarea className="form-control min-h-[120px]" value={alertForm.message} onChange={(event) => setAlertForm((prev) => ({ ...prev, message: event.target.value }))} placeholder="Mô tả dấu hiệu bất thường hoặc ghi chú xử lý..." required />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="form-label">Segment bắt đầu</label>
              <input className="form-control" type="number" min="0" value={alertForm.segment_start_sample} onChange={(event) => setAlertForm((prev) => ({ ...prev, segment_start_sample: event.target.value }))} placeholder="Tùy chọn" />
            </div>
            <div>
              <label className="form-label">Segment kết thúc</label>
              <input className="form-control" type="number" min="0" value={alertForm.segment_end_sample} onChange={(event) => setAlertForm((prev) => ({ ...prev, segment_end_sample: event.target.value }))} placeholder="Tùy chọn" />
            </div>
          </div>
        </form>
      </ModalFrame>
    </div>
  )
}

export default PatientDetail
