"use client"

import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "react-toastify"
import { useAuth } from "../../contexts/AuthContext"
import { alertsApi, doctorApi, reportsApi } from "../../services/api"
import ReadingDetailModal from "../shared/ReadingDetailModal"
import { DoctorStatCard, EmptyState, PatientAvatar, formatDateTime, getAlertSeverity, getAlertTone, getPatientFromAccess } from "./DoctorUi"

const DoctorDashboard = () => {
  const { user } = useAuth()
  const [patients, setPatients] = useState([])
  const [alerts, setAlerts] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [selectedReadingId, setSelectedReadingId] = useState(null)

  useEffect(() => {
    if (user?.user_id) fetchDashboardData()
  }, [user?.user_id])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const patientsResponse = await doctorApi.getPatients(user.user_id)
      const normalizedPatients = (patientsResponse.data || []).map(getPatientFromAccess).filter(Boolean)

      const [alertResponses, reportsResponse] = await Promise.all([
        Promise.all(normalizedPatients.map((patient) => alertsApi.getByUser(patient.user_id).catch(() => ({ data: { alerts: [] } })))),
        reportsApi.getDoctorReports().catch(() => ({ data: { reports: [] } })),
      ])

      const nextAlerts = alertResponses.flatMap((response, index) => {
        const patient = normalizedPatients[index]
        return (response.data?.alerts || []).map((alert) => ({
          ...alert,
          patient_id: patient.user_id,
          patient_name: patient.name,
          patient_email: patient.email,
        }))
      })

      setPatients(normalizedPatients)
      setAlerts(nextAlerts.sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp)))
      setReports(reportsResponse.data?.reports || [])
      setLastUpdated(new Date())
    } catch (error) {
      console.error("Lỗi tải dashboard bác sĩ:", error)
      toast.error("Không thể tải dữ liệu điều phối")
    } finally {
      setLoading(false)
    }
  }

  const unresolvedAlerts = alerts.filter((alert) => !alert.resolved)
  const highRiskAlerts = unresolvedAlerts.filter((alert) => getAlertSeverity(alert.alert_type) === "high")
  const reportsToday = reports.filter((report) => {
    const created = new Date(report.created_at)
    const now = new Date()
    return created.toDateString() === now.toDateString()
  })

  const watchlist = useMemo(() => {
    return patients
      .map((patient) => {
        const patientAlerts = unresolvedAlerts.filter((alert) => alert.patient_id === patient.user_id)
        const latestAlert = patientAlerts[0]
        return { ...patient, alert_count: patientAlerts.length, latest_alert: latestAlert }
      })
      .sort((left, right) => right.alert_count - left.alert_count)
      .slice(0, 6)
  }, [patients, unresolvedAlerts])

  if (loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="spinner-border"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="app-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand-700">Clinical command center</p>
            <h1 className="mt-1 text-3xl font-bold text-ink-950">Điều phối hôm nay</h1>
            <p className="mt-2 text-sm text-ink-600">Theo dõi bệnh nhân, cảnh báo ECG và báo cáo chuyên môn trong một màn làm việc.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-surface-soft px-4 py-2 text-sm font-medium text-ink-600">
              <i className="far fa-clock me-2"></i>{lastUpdated ? formatDateTime(lastUpdated) : "-"}
            </span>
            <button type="button" className="btn btn-primary" onClick={fetchDashboardData}>
              <i className="fas fa-rotate me-2"></i>Làm mới
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DoctorStatCard icon="fas fa-user-group" label="Bệnh nhân theo dõi" value={patients.length} tone="brand" hint="Đã cấp quyền accepted" />
        <DoctorStatCard icon="fas fa-triangle-exclamation" label="Cảnh báo chưa xử lý" value={unresolvedAlerts.length} tone="red" hint="Cần ưu tiên trong ca trực" />
        <DoctorStatCard icon="fas fa-bolt" label="Nguy cơ cao" value={highRiskAlerts.length} tone="amber" hint="AFIB, rung nhĩ, critical" />
        <DoctorStatCard icon="fas fa-file-lines" label="Báo cáo hôm nay" value={reportsToday.length} tone="emerald" hint={`${reports.length} báo cáo tổng`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.9fr)]">
        <section className="app-card overflow-hidden">
          <div className="app-card-header">
            <div>
              <h2 className="section-title"><i className="fas fa-bell me-2 text-red-600"></i>Hàng đợi cảnh báo</h2>
              <p className="section-subtitle">Cảnh báo mới nhất từ các bệnh nhân đang được theo dõi.</p>
            </div>
            <Link to="/doctor/patients" className="btn btn-outline-primary btn-sm">Mở danh sách</Link>
          </div>
          <div className="app-card-body">
            {alerts.length ? (
              <div className="space-y-3">
                {alerts.slice(0, 8).map((alert) => (
                  <button
                    key={alert.alert_id}
                    type="button"
                    className="w-full rounded-xl border border-surface-line bg-white p-4 text-left shadow-soft transition hover:border-brand-200 hover:shadow-medium disabled:opacity-70"
                    disabled={!alert.reading_id}
                    onClick={() => setSelectedReadingId(alert.reading_id)}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getAlertTone(alert.alert_type, alert.resolved)}`}>{alert.alert_type}</span>
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${alert.resolved ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{alert.resolved ? "Đã xử lý" : "Chưa xử lý"}</span>
                        </div>
                        <p className="mt-2 font-semibold text-ink-900">{alert.patient_name}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-ink-600">{alert.message}</p>
                      </div>
                      <div className="text-right text-xs font-medium text-ink-500">
                        <p>{formatDateTime(alert.timestamp)}</p>
                        <p className="mt-2 text-brand-700">{alert.reading_id ? "Mở ECG" : "Không có reading"}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState icon="fas fa-circle-check" title="Không có cảnh báo" description="Các bệnh nhân đang theo dõi chưa có cảnh báo mới." />
            )}
          </div>
        </section>

        <section className="app-card overflow-hidden">
          <div className="app-card-header">
            <div>
              <h2 className="section-title"><i className="fas fa-users-viewfinder me-2 text-brand-600"></i>Watchlist</h2>
              <p className="section-subtitle">Bệnh nhân cần xem nhanh trong hôm nay.</p>
            </div>
          </div>
          <div className="app-card-body space-y-3">
            {watchlist.length ? watchlist.map((patient) => (
              <div key={patient.user_id} className="rounded-xl border border-surface-line bg-white p-4 shadow-soft">
                <div className="flex items-start gap-3">
                  <PatientAvatar name={patient.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink-900">{patient.name}</p>
                    <p className="truncate text-sm text-ink-500">{patient.email}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${patient.alert_count ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {patient.alert_count ? `${patient.alert_count} cảnh báo` : "Ổn định"}
                      </span>
                      <Link to={`/doctor/patient/${patient.user_id}`} className="btn btn-outline-primary btn-sm">
                        Mở workspace
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <EmptyState icon="fas fa-user-check" title="Chưa có bệnh nhân" description="Khi bệnh nhân cấp quyền, danh sách theo dõi sẽ xuất hiện tại đây." />
            )}
          </div>
        </section>
      </div>

      <ReadingDetailModal show={Boolean(selectedReadingId)} readingId={selectedReadingId} onHide={() => setSelectedReadingId(null)} />
    </div>
  )
}

export default DoctorDashboard
