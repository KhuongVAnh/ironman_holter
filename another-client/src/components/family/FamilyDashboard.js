"use client"

import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "react-toastify"
import { useAuth } from "../../contexts/AuthContext"
import { alertsApi, familyApi } from "../../services/api"
import { ACCESS_STATUS } from "../../services/string"
import RecentAlertsPanel, { getAlertTypeLabel } from "../shared/RecentAlertsPanel"
import ReadingDetailModal from "../shared/ReadingDetailModal"

const FamilyDashboard = () => {
  const { user } = useAuth()
  const [familyMembers, setFamilyMembers] = useState([])
  const [recentAlerts, setRecentAlerts] = useState([])
  const [selectedReadingId, setSelectedReadingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const familyMembersRef = useRef([])
  const familyMemberIdsRef = useRef(new Set())

  const fetchRecentAlerts = async (members = familyMembers) => {
    try {
      if (!members || members.length === 0) {
        setRecentAlerts([])
        return
      }

      const alertPromises = members.map((member) => alertsApi.getByUser(member.user_id, { resolved: false, limit: 5, offset: 0 }))
      const alertResponses = await Promise.all(alertPromises)

      const allAlerts = alertResponses.flatMap((res, index) => {
        const member = members[index]
        const alerts = res.data?.alerts || []
        return alerts.map((alert) => ({
          ...alert,
          patient_name: member?.name || "Người thân",
        }))
      })

      const sortedAlerts = allAlerts
        .filter((a) => a && a.alert_type)
        .sort((a, b) => new Date(b.timestamp || b.created_at) - new Date(a.timestamp || a.created_at))
        .slice(0, 5)

      setRecentAlerts(sortedAlerts)
    } catch (error) {
      console.error("Lỗi tải cảnh báo gần nhất:", error)
      toast.error("Không thể tải cảnh báo gần nhất")
    }
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const usersResponse = await familyApi.getPatients(user.user_id)

      const patients = (usersResponse.data || []).map((item) => ({
        user_id: item.patient.user_id,
        name: item.patient.name,
        email: item.patient.email,
        is_active: item.status === ACCESS_STATUS.ACCEPTED,
      }))

      setFamilyMembers(patients)
      familyMembersRef.current = patients
      familyMemberIdsRef.current = new Set(patients.map((patient) => String(patient.user_id)))
      await fetchRecentAlerts(patients)
    } catch (error) {
      console.error("Lỗi tải dashboard:", error)
      toast.error("Không thể tải dữ liệu dashboard")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const handleAlert = (event) => {
      const alertData = event.detail || {}
      const isFamilyMemberAlert = familyMemberIdsRef.current.has(String(alertData.user_id))
      if (isFamilyMemberAlert) {
        toast.warning(`Cảnh báo từ người thân: ${alertData.message}`)
        fetchRecentAlerts(familyMembersRef.current)
      }
    }

    fetchDashboardData()
    window.addEventListener("appAlert", handleAlert)

    return () => {
      window.removeEventListener("appAlert", handleAlert)
    }
  }, [user.user_id])

  const getAlertPriority = (alertType = "") => {
    const type = String(alertType)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()

    if (type.includes("ngung tim") || type.includes("tim ngung")) {
      return { className: "badge bg-danger", label: "Khẩn cấp" }
    }
    if (type.includes("afib") || type.includes("rung nhi") || type.includes("rung tim")) {
      return { className: "badge bg-danger", label: "Cao" }
    }
    if (type.includes("nhip nhanh") || type.includes("tang nhip")) {
      return { className: "badge bg-warning", label: "Trung bình" }
    }
    if (type.includes("nhip cham") || type.includes("giam nhip")) {
      return { className: "badge bg-info", label: "Thấp" }
    }
    if (type.includes("ngoai tam thu")) {
      return { className: "badge bg-secondary", label: "Theo dõi" }
    }

    return { className: "badge bg-danger", label: "Chú ý" }
  }

  if (loading) {
    return (
      <div className="page-shell">
        <div className="empty-state-rich">
          <div className="empty-state-rich-icon info"><i className="fas fa-spinner fa-spin"></i></div>
          <h3>Đang tải dashboard gia đình</h3>
          <p>Hệ thống đang đồng bộ người thân và cảnh báo mới nhất.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="panel-eyebrow">Family monitoring</p>
            <h1 className="page-hero-title">Tổng quan người thân</h1>
            <p className="page-hero-subtitle">Theo dõi cảnh báo, trạng thái cấp quyền và mở nhanh dữ liệu ECG của người thân đang được giám sát.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="status-chip is-info"><i className="fas fa-clock"></i>{new Date().toLocaleString("vi-VN")}</span>
            <button className="btn btn-outline-primary btn-sm" onClick={fetchDashboardData}>
              <i className="fas fa-sync-alt"></i>
              Làm mới
            </button>
          </div>
        </div>
      </section>

      <section className="metric-grid">
        <div className="priority-metric metric-info">
          <div className="flex items-start justify-between gap-3">
            <div><p className="metric-label">Người thân</p><p className="metric-value">{familyMembers.length}</p><p className="metric-helper">Được cấp quyền theo dõi</p></div>
            <span className="metric-icon bg-sky-50 text-sky-700"><i className="fas fa-users"></i></span>
          </div>
        </div>
        <div className="priority-metric metric-danger">
          <div className="flex items-start justify-between gap-3">
            <div><p className="metric-label">Cảnh báo mới</p><p className="metric-value">{recentAlerts.length}</p><p className="metric-helper">Ưu tiên mở ECG liên quan</p></div>
            <span className="metric-icon bg-red-50 text-red-700"><i className="fas fa-triangle-exclamation"></i></span>
          </div>
        </div>
        <div className="priority-metric metric-success">
          <div className="flex items-start justify-between gap-3">
            <div><p className="metric-label">Đang hoạt động</p><p className="metric-value">{familyMembers.filter((m) => m.is_active).length}</p><p className="metric-helper">Có thể nhận cảnh báo</p></div>
            <span className="metric-icon bg-emerald-50 text-emerald-700"><i className="fas fa-circle-check"></i></span>
          </div>
        </div>
        <div className="priority-metric metric-brand">
          <div className="flex items-start justify-between gap-3">
            <div><p className="metric-label">Giám sát</p><p className="metric-value">24/7</p><p className="metric-helper">Theo dõi liên tục</p></div>
            <span className="metric-icon bg-brand-50 text-brand-700"><i className="fas fa-heart-pulse"></i></span>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <RecentAlertsPanel
          title="Cảnh báo cần chú ý"
          subtitle="Tổng hợp cảnh báo mới nhất của người thân được cấp quyền."
          alerts={recentAlerts}
          onAlertClick={(alert) => setSelectedReadingId(alert?.reading_id || null)}
          isAlertDisabled={(alert) => !alert?.reading_id}
          getAlertTitle={(alert) => {
            const typeLabel = getAlertTypeLabel(alert.alert_type)
            return alert.patient_name ? `${alert.patient_name} - ${typeLabel}` : typeLabel
          }}
          getAlertStatus={(alert) => {
            const priority = getAlertPriority(alert.alert_type)
            return { label: priority.label, className: priority.className }
          }}
          getAlertHint={(_alert, disabled, canClick) => {
            if (disabled) return "Không có bản ghi"
            if (canClick) return "Mở đồ thị ECG"
            return ""
          }}
          emptyText="Không có cảnh báo nào"
        />

        <aside className="clinical-panel">
          <div className="clinical-panel-header">
            <div>
              <p className="panel-eyebrow">Danh sách theo dõi</p>
              <h2 className="section-title">Người thân</h2>
            </div>
            <Link to="/family/monitoring" className="btn btn-outline-primary btn-sm">Chi tiết</Link>
          </div>
          <div className="clinical-panel-body space-y-3">
            {familyMembers.length > 0 ? familyMembers.map((member) => (
              <div key={member.user_id} className="flex items-center gap-3 rounded-2xl border border-surface-line bg-white p-3 shadow-soft">
                <div className="avatar-circle bg-primary text-white">{member.name.charAt(0).toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink-900">{member.name}</p>
                  <p className="truncate text-xs text-ink-500">{member.email}</p>
                </div>
                <span className={`status-chip ${member.is_active ? "is-success" : "is-neutral"}`}>
                  {member.is_active ? "Hoạt động" : "Ngưng"}
                </span>
              </div>
            )) : (
              <div className="empty-state-rich py-8">
                <div className="empty-state-rich-icon"><i className="fas fa-user-plus"></i></div>
                <p className="mt-3 font-semibold text-ink-800">Chưa có người thân nào được theo dõi</p>
              </div>
            )}
          </div>
        </aside>
      </section>

      <section className="action-strip">
        <Link to="/family/monitoring" className="action-card">
          <span className="metric-icon bg-brand-50 text-brand-700"><i className="fas fa-chart-line"></i></span>
          <span><strong className="block text-ink-900">Theo dõi chi tiết</strong><small className="text-ink-500">Mở monitoring từng người thân</small></span>
        </Link>
        <button className="action-card" onClick={fetchDashboardData}>
          <span className="metric-icon bg-emerald-50 text-emerald-700"><i className="fas fa-sync-alt"></i></span>
          <span><strong className="block text-ink-900">Làm mới dữ liệu</strong><small className="text-ink-500">Cập nhật cảnh báo mới nhất</small></span>
        </button>
        <button className="action-card">
          <span className="metric-icon bg-red-50 text-red-700"><i className="fas fa-phone"></i></span>
          <span><strong className="block text-ink-900">Liên hệ khẩn cấp</strong><small className="text-ink-500">Ưu tiên khi có dấu hiệu nguy cấp</small></span>
        </button>
        <Link to="/family/access-requests" className="action-card">
          <span className="metric-icon bg-sky-50 text-sky-700"><i className="fas fa-user-shield"></i></span>
          <span><strong className="block text-ink-900">Yêu cầu truy cập</strong><small className="text-ink-500">Quản lý quyền theo dõi</small></span>
        </Link>
      </section>

      <ReadingDetailModal
        show={Boolean(selectedReadingId)}
        onHide={() => setSelectedReadingId(null)}
        readingId={selectedReadingId}
      />
    </div>
  )
}

export default FamilyDashboard
