"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { toast } from "react-toastify"
import { usersApi, devicesApi, alertsApi, reportsApi } from "../../services/api"
import { ROLE } from "../../services/string"

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPatients: 0,
    totalDoctors: 0,
    totalDevices: 0,
    activeAlerts: 0,
    totalReports: 0,
  })
  const [recentUsers, setRecentUsers] = useState([])
  const [systemHealth, setSystemHealth] = useState({
    database: "healthy",
    server: "healthy",
    alerts: "healthy",
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Fetch users
      const usersResponse = await usersApi.getAll()
      const users = usersResponse.data.users

      // Fetch devices
      const devicesResponse = await devicesApi.getAll()
      const devices = devicesResponse.data.devices

      // Fetch alerts
      const alertsResponse = await alertsApi.getAll({ limit: 100, offset: 0 })
      const alerts = alertsResponse.data.alerts || []
      const alertSummary = alertsResponse.data.summary || { total: alerts.length, unresolved: 0, resolved: 0 }

      // Fetch reports
      const reportsResponse = await reportsApi.getDoctorReports()
      const reports = reportsResponse.data.reports

      // Calculate stats
      setStats({
        totalUsers: users.length,
        totalPatients: users.filter((u) => u.role === ROLE.BENH_NHAN).length,
        totalDoctors: users.filter((u) => u.role === ROLE.BAC_SI).length,
        totalDevices: devices.length,
        activeAlerts: alertSummary.unresolved,
        totalReports: reports.length,
      })

      // Get recent users (last 5)
      setRecentUsers(users.slice(0, 5))

      // System health check (simplified)
      setSystemHealth({
        database: users.length > 0 ? "healthy" : "warning",
        server: "healthy",
        alerts: alertSummary.unresolved > 10 ? "warning" : "healthy",
      })
    } catch (error) {
      console.error("Lỗi tải dashboard admin:", error)
      toast.error("Không thể tải dữ liệu dashboard")
      setSystemHealth({
        database: "error",
        server: "error",
        alerts: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const getHealthMeta = (status) => {
    switch (status) {
      case "healthy":
        return { label: "Ổn định", className: "is-success", icon: "fas fa-check-circle" }
      case "warning":
        return { label: "Cần theo dõi", className: "is-warning", icon: "fas fa-exclamation-triangle" }
      case "error":
        return { label: "Lỗi", className: "is-danger", icon: "fas fa-times-circle" }
      default:
        return { label: "Không rõ", className: "is-neutral", icon: "fas fa-question-circle" }
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("vi-VN")
  }

  if (loading) {
    return (
      <div className="page-shell">
        <div className="empty-state-rich">
          <div className="empty-state-rich-icon info"><i className="fas fa-spinner fa-spin"></i></div>
          <h3>Đang tải dashboard quản trị</h3>
          <p>Hệ thống đang tổng hợp người dùng, thiết bị và cảnh báo.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="panel-eyebrow">System operations</p>
            <h1 className="page-hero-title">Điều hành hệ thống</h1>
            <p className="page-hero-subtitle">Theo dõi người dùng, thiết bị, cảnh báo và tình trạng vận hành trong một màn quản trị.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="status-chip is-info"><i className="fas fa-clock"></i>{new Date().toLocaleString("vi-VN")}</span>
            <button className="btn btn-primary btn-sm" onClick={fetchDashboardData}>
              <i className="fas fa-sync-alt"></i>
              Làm mới
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="metric-grid">
          <div className="priority-metric metric-brand"><div className="flex items-start justify-between gap-3"><div><p className="metric-label">Tổng người dùng</p><p className="metric-value">{stats.totalUsers}</p><p className="metric-helper">{stats.totalPatients} bệnh nhân, {stats.totalDoctors} bác sĩ</p></div><span className="metric-icon bg-brand-50 text-brand-700"><i className="fas fa-users"></i></span></div></div>
          <div className="priority-metric metric-info"><div className="flex items-start justify-between gap-3"><div><p className="metric-label">Thiết bị</p><p className="metric-value">{stats.totalDevices}</p><p className="metric-helper">Đã đăng ký trong hệ thống</p></div><span className="metric-icon bg-sky-50 text-sky-700"><i className="fas fa-microchip"></i></span></div></div>
          <div className="priority-metric metric-danger"><div className="flex items-start justify-between gap-3"><div><p className="metric-label">Cảnh báo mở</p><p className="metric-value">{stats.activeAlerts}</p><p className="metric-helper">Chưa được xử lý</p></div><span className="metric-icon bg-red-50 text-red-700"><i className="fas fa-triangle-exclamation"></i></span></div></div>
          <div className="priority-metric metric-success"><div className="flex items-start justify-between gap-3"><div><p className="metric-label">Báo cáo</p><p className="metric-value">{stats.totalReports}</p><p className="metric-helper">Báo cáo chuyên môn</p></div><span className="metric-icon bg-emerald-50 text-emerald-700"><i className="fas fa-file-medical"></i></span></div></div>
        </div>

        <aside className="clinical-panel">
          <div className="clinical-panel-header">
            <div>
              <p className="panel-eyebrow">Health check</p>
              <h2 className="section-title">Tình trạng hệ thống</h2>
            </div>
          </div>
          <div className="clinical-panel-body space-y-3">
            {[
              ["Cơ sở dữ liệu", systemHealth.database],
              ["Máy chủ", systemHealth.server],
              ["Hệ thống cảnh báo", systemHealth.alerts],
            ].map(([label, status]) => {
              const meta = getHealthMeta(status)
              return (
                <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-surface-line bg-white px-4 py-3 shadow-soft">
                  <span className="font-semibold text-ink-800">{label}</span>
                  <span className={`status-chip ${meta.className}`}><i className={meta.icon}></i>{meta.label}</span>
                </div>
              )
            })}
          </div>
        </aside>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="clinical-panel">
          <div className="clinical-panel-header">
            <div>
              <p className="panel-eyebrow">New accounts</p>
              <h2 className="section-title">Người dùng mới</h2>
            </div>
            <Link to="/admin/users" className="btn btn-outline-primary btn-sm">Xem tất cả</Link>
          </div>
          <div className="clinical-panel-body">
            {recentUsers.length > 0 ? (
              <div className="space-y-3">
                {recentUsers.map((user) => (
                  <div key={user.user_id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-surface-line bg-white p-4 shadow-soft">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="avatar-circle bg-primary text-white">{user.name.charAt(0).toUpperCase()}</div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-ink-900">{user.name}</p>
                        <p className="truncate text-sm text-ink-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`badge bg-${user.role === ROLE.ADMIN ? "danger" : "primary"}`}>{user.role}</span>
                      <p className="mt-1 text-xs text-ink-500">{formatDate(user.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-rich"><div className="empty-state-rich-icon"><i className="fas fa-user-plus"></i></div><p className="mt-3 font-semibold text-ink-800">Chưa có người dùng mới</p></div>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="clinical-panel">
            <div className="clinical-panel-header">
              <h2 className="section-title">Thao tác nhanh</h2>
            </div>
            <div className="clinical-panel-body space-y-3">
              <Link to="/admin/users" className="action-card"><span className="metric-icon bg-brand-50 text-brand-700"><i className="fas fa-users-cog"></i></span><span><strong className="block text-ink-900">Quản lý người dùng</strong><small className="text-ink-500">Vai trò, trạng thái tài khoản</small></span></Link>
              <Link to="/admin/devices" className="action-card"><span className="metric-icon bg-sky-50 text-sky-700"><i className="fas fa-microchip"></i></span><span><strong className="block text-ink-900">Quản lý thiết bị</strong><small className="text-ink-500">Serial và trạng thái hoạt động</small></span></Link>
              <Link to="/admin/logs" className="action-card"><span className="metric-icon bg-amber-50 text-amber-700"><i className="fas fa-chart-bar"></i></span><span><strong className="block text-ink-900">Nhật ký hệ thống</strong><small className="text-ink-500">Cảnh báo và hoạt động gần đây</small></span></Link>
            </div>
          </div>

          <div className="clinical-panel">
            <div className="clinical-panel-body grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-emerald-50 px-4 py-4"><p className="text-xs font-bold uppercase text-emerald-700">Uptime</p><p className="mt-1 text-2xl font-bold text-emerald-800">99.9%</p></div>
              <div className="rounded-xl bg-sky-50 px-4 py-4"><p className="text-xs font-bold uppercase text-sky-700">Version</p><p className="mt-1 text-2xl font-bold text-sky-800">v1.0</p></div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}

export default AdminDashboard
