"use client"

import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import { useAuth } from "../../contexts/AuthContext"
import ECGChart from "../patient/ECGChart"
import RecentAlertsPanel, { getAlertTypeLabel } from "../shared/RecentAlertsPanel"
import ReadingDetailModal from "../shared/ReadingDetailModal"
import { alertsApi, familyApi, readingsApi } from "../../services/api"
import PaginationBar from "../shared/PaginationBar"

const READINGS_PER_PAGE = 6

const FamilyMonitoring = () => {
  const { user } = useAuth()
  const [familyMembers, setFamilyMembers] = useState([])
  const [selectedMember, setSelectedMember] = useState(null)
  const [memberReadings, setMemberReadings] = useState([])
  const [memberAlerts, setMemberAlerts] = useState([])
  const [selectedReadingId, setSelectedReadingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [readingPage, setReadingPage] = useState(1)

  useEffect(() => {
    if (user?.user_id) {
      fetchFamilyMembers()
    }
  }, [user?.user_id])

  useEffect(() => {
    if (selectedMember?.user_id) {
      fetchMemberData(selectedMember.user_id)
    }
  }, [selectedMember?.user_id])

  useEffect(() => {
    setReadingPage(1)
  }, [selectedMember?.user_id])

  const fetchFamilyMembers = async () => {
    try {
      setLoading(true)
      const response = await familyApi.getPatients(user.user_id)

      const patients = (response.data || []).map((item) => ({
        user_id: item.patient?.user_id,
        name: item.patient?.name || "Không rõ",
        email: item.patient?.email || "-",
        is_active: item.status === "accepted",
      }))

      setFamilyMembers(patients)

      if (patients.length > 0) {
        setSelectedMember(patients[0])
      } else {
        setSelectedMember(null)
        setMemberReadings([])
        setMemberAlerts([])
      }
    } catch (error) {
      console.error("Lỗi lấy danh sách người thân:", error)
      toast.error("Không thể tải danh sách người thân")
    } finally {
      setLoading(false)
    }
  }

  const fetchMemberData = async (memberId) => {
    try {
      if (!memberId) return

      const readingsResponse = await readingsApi.getHistory(memberId, { limit: 10 })
      setMemberReadings(readingsResponse.data?.readings || [])

      const alertsResponse = await alertsApi.getByUser(memberId, { limit: 5, offset: 0 })
      setMemberAlerts(alertsResponse.data?.alerts || [])
      setSelectedReadingId(null)
    } catch (error) {
      console.error("Lỗi lấy dữ liệu người thân:", error)
      toast.error("Không thể tải dữ liệu người thân")
    }
  }

  const formatDate = (dateString) => new Date(dateString).toLocaleString("vi-VN")

  const latestReading = memberReadings.length > 0 ? memberReadings[0] : null
  const readingTotalPages = Math.max(1, Math.ceil(memberReadings.length / READINGS_PER_PAGE))
  const visibleReadings = memberReadings.slice((readingPage - 1) * READINGS_PER_PAGE, readingPage * READINGS_PER_PAGE)

  useEffect(() => {
    if (readingPage > readingTotalPages) setReadingPage(readingTotalPages)
  }, [readingPage, readingTotalPages])

  if (loading) {
    return (
      <div className="page-shell">
        <div className="empty-state-rich">
          <div className="empty-state-rich-icon info"><i className="fas fa-spinner fa-spin"></i></div>
          <h3>Đang tải dữ liệu người thân</h3>
          <p>Hệ thống đang đồng bộ danh sách theo dõi và dữ liệu ECG mới nhất.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="page-hero-icon"><i className="fas fa-heart-pulse"></i></div>
        <div className="min-w-0 flex-1">
          <p className="panel-eyebrow">Family monitoring</p>
          <h1 className="page-hero-title">Theo dõi người thân</h1>
          <p className="page-hero-subtitle">Xem nhanh trạng thái, cảnh báo và bản ghi ECG mới nhất của bệnh nhân đã cấp quyền.</p>
        </div>
        <button type="button" className="btn btn-outline-primary" onClick={fetchFamilyMembers}>
          <i className="fas fa-rotate-right me-2"></i>Làm mới
        </button>
      </section>

      <section className="metric-grid">
        <div className="priority-metric metric-info">
          <div className="metric-icon"><i className="fas fa-users"></i></div>
          <p className="metric-label">Người thân</p>
          <p className="metric-value">{familyMembers.length}</p>
          <p className="metric-helper">Đã cấp quyền theo dõi</p>
        </div>
        <div className="priority-metric metric-danger">
          <div className="metric-icon"><i className="fas fa-triangle-exclamation"></i></div>
          <p className="metric-label">Cảnh báo gần đây</p>
          <p className="metric-value">{memberAlerts.length}</p>
          <p className="metric-helper">Của người đang chọn</p>
        </div>
        <div className="priority-metric metric-success">
          <div className="metric-icon"><i className="fas fa-heartbeat"></i></div>
          <p className="metric-label">Nhịp tim mới nhất</p>
          <p className="metric-value">{latestReading ? latestReading.heart_rate : "--"}</p>
          <p className="metric-helper">{latestReading ? "BPM" : "Chưa có bản ghi"}</p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <section className="clinical-panel overflow-hidden">
            <div className="clinical-panel-header">
              <div>
                <p className="panel-eyebrow">Danh sách</p>
                <h2 className="section-title">Người thân</h2>
                <p className="section-subtitle">Chọn một hồ sơ để xem ECG và cảnh báo.</p>
              </div>
            </div>
            <div className="clinical-panel-body p-3">
              {familyMembers.length > 0 ? (
                <div className="space-y-2">
                  {familyMembers.map((member) => (
                    <button
                      key={member.user_id}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${selectedMember?.user_id === member.user_id ? "border-brand-200 bg-brand-50 text-brand-900 shadow-soft" : "border-surface-line bg-white hover:bg-surface-soft"}`}
                      onClick={() => setSelectedMember(member)}
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 font-bold text-sky-700">{member.name.charAt(0).toUpperCase()}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{member.name}</p>
                        <p className="truncate text-xs text-ink-500">{member.email}</p>
                      </div>
                      <span className={`status-chip ${member.is_active ? "is-success" : "is-neutral"}`}>{member.is_active ? "Hoạt động" : "Ngưng"}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="empty-state-rich">
                  <div className="empty-state-rich-icon info"><i className="fas fa-user-plus"></i></div>
                  <h3>Chưa có người thân nào</h3>
                  <p>Khi bệnh nhân cấp quyền, hồ sơ sẽ xuất hiện tại đây.</p>
                </div>
              )}
            </div>
          </section>

          <RecentAlertsPanel
            title="Cảnh báo gần nhất"
            subtitle="Theo dõi cảnh báo mới nhất của người thân được chọn."
            alerts={memberAlerts}
            onAlertClick={(alert) => setSelectedReadingId(alert?.reading_id || null)}
            isAlertDisabled={(alert) => !alert?.reading_id}
            getAlertTitle={(alert) => getAlertTypeLabel(alert.alert_type)}
            getAlertStatus={(alert) =>
              alert?.resolved
                ? { label: "Đã xử lý", variant: "is-resolved" }
                : { label: "Mới", variant: "is-pending" }
            }
            getAlertTimestamp={(alert) => alert.timestamp}
            formatDate={formatDate}
            getAlertHint={(_alert, disabled, canClick) => {
              if (disabled) return "Không có bản ghi"
              if (canClick) return "Nhấn để xem đồ thị ECG"
              return ""
            }}
            emptyText="Không có cảnh báo"
          />
        </aside>

        <main className="min-w-0">
          {selectedMember ? (
            <div className="space-y-5">
              <section className="clinical-panel overflow-hidden">
                <div className="clinical-panel-body">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-2xl font-bold text-brand-700">
                        {selectedMember.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate text-2xl font-bold text-ink-900">{selectedMember.name}</h2>
                        <p className="truncate text-sm text-ink-500">{selectedMember.email}</p>
                        <span className={`mt-2 status-chip ${selectedMember.is_active ? "is-success" : "is-neutral"}`}>
                          {selectedMember.is_active ? "Đang hoạt động" : "Ngưng hoạt động"}
                        </span>
                      </div>
                    </div>
                    {latestReading ? (
                      <div className={`rounded-2xl border p-5 text-right ${latestReading.abnormal_detected ? "border-red-100 bg-red-50" : "border-emerald-100 bg-emerald-50"}`}>
                        <p className="text-xs font-bold uppercase tracking-[0.1em] text-ink-500">Nhịp tim gần nhất</p>
                        <p className="mt-2 text-4xl font-bold text-ink-900">{latestReading.heart_rate} <span className="text-lg">BPM</span></p>
                        <span className={`mt-3 status-chip ${latestReading.abnormal_detected ? "is-danger" : "is-success"}`}>
                          {latestReading.abnormal_detected ? "Bất thường" : "Bình thường"}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="clinical-panel overflow-hidden">
                <div className="clinical-panel-header">
                  <div>
                    <p className="panel-eyebrow">ECG mới nhất</p>
                    <h2 className="section-title">Biểu đồ ECG</h2>
                    <p className="section-subtitle">Vùng ưu tiên để kiểm tra dạng sóng của bản ghi gần nhất.</p>
                  </div>
                </div>
                <div className="clinical-panel-body">
                  {latestReading ? (
                    <ECGChart data={latestReading.ecg_signal || []} />
                  ) : (
                    <div className="empty-state-rich">
                      <div className="empty-state-rich-icon info"><i className="fas fa-chart-line"></i></div>
                      <h3>Chưa có dữ liệu ECG</h3>
                      <p>Bản ghi mới nhất sẽ được hiển thị tại đây khi thiết bị gửi dữ liệu.</p>
                    </div>
                  )}
                </div>
              </section>

              <section className="clinical-panel overflow-hidden">
                <div className="clinical-panel-header">
                  <div>
                    <p className="panel-eyebrow">Lịch sử gần đây</p>
                    <h2 className="section-title">Các lần đo mới nhất</h2>
                    <p className="section-subtitle">Nhấn vào bản ghi để mở cửa sổ chi tiết ECG.</p>
                  </div>
                </div>
                <div className="clinical-panel-body">
                  {visibleReadings.length > 0 ? (
                    <div className="space-y-3">
                      {visibleReadings.map((reading) => (
                        <button key={reading.reading_id} type="button" className="grid w-full gap-3 rounded-2xl border border-surface-line bg-white p-4 text-left shadow-soft transition hover:border-brand-200 hover:shadow-medium md:grid-cols-[minmax(0,1fr)_140px_130px]" onClick={() => setSelectedReadingId(reading.reading_id)}>
                          <div>
                            <p className="font-semibold text-ink-900">{formatDate(reading.timestamp)}</p>
                            <p className="text-xs text-ink-500">Mã bản ghi: {reading.reading_id}</p>
                          </div>
                          <div>
                            <p className={`text-lg font-bold ${reading.heart_rate < 60 ? "text-amber-700" : reading.heart_rate > 100 ? "text-red-700" : "text-emerald-700"}`}>{reading.heart_rate} BPM</p>
                            <p className="text-xs text-ink-500">Nhịp tim</p>
                          </div>
                          <div className="md:text-right">
                            <span className={`status-chip ${reading.abnormal_detected ? "is-danger" : "is-success"}`}>
                              {reading.abnormal_detected ? "Bất thường" : "Bình thường"}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state-rich">
                      <div className="empty-state-rich-icon info"><i className="fas fa-heartbeat"></i></div>
                      <h3>Chưa có dữ liệu đo</h3>
                      <p>Lịch sử đo của người thân sẽ xuất hiện tại đây.</p>
                    </div>
                  )}
                  <PaginationBar
                    currentPage={readingPage}
                    totalPages={readingTotalPages}
                    onPageChange={setReadingPage}
                    summaryText={memberReadings.length > 0 ? `Hiển thị ${Math.min((readingPage - 1) * READINGS_PER_PAGE + 1, memberReadings.length)}-${Math.min(readingPage * READINGS_PER_PAGE, memberReadings.length)} / ${memberReadings.length} bản ghi` : "Chưa có bản ghi để phân trang"}
                    className="mt-4"
                  />
                </div>
              </section>
            </div>
          ) : (
            <div className="empty-state-rich">
              <div className="empty-state-rich-icon info"><i className="fas fa-user-friends"></i></div>
              <h3>Chọn người thân để theo dõi</h3>
              <p>Hãy chọn một người thân từ danh sách bên trái để xem thông tin chi tiết.</p>
            </div>
          )}
        </main>
      </div>

      <ReadingDetailModal
        show={Boolean(selectedReadingId)}
        onHide={() => setSelectedReadingId(null)}
        readingId={selectedReadingId}
      />
    </div>
  )
}

export default FamilyMonitoring
