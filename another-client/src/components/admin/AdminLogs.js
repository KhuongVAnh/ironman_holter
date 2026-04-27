"use client"

import { useState, useEffect } from "react"
import { toast } from "react-toastify"
import { alertsApi, devicesApi, reportsApi } from "../../services/api"
import { ALERT_TYPE } from "../../services/string"
import PaginationBar from "../shared/PaginationBar"

const ITEMS_PER_PAGE = 5

const AdminLogs = () => {
  const [stats, setStats] = useState({
    totalDevices: 0,
    totalAlerts: 0,
    totalReports: 0,
    avgHeartRate: null,
  })
  const [recentAlerts, setRecentAlerts] = useState([])
  const [systemLogs, setSystemLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [alertPage, setAlertPage] = useState(1)
  const [logPage, setLogPage] = useState(1)

  useEffect(() => {
    fetchLogsData()
  }, [])

  useEffect(() => {
    setAlertPage(1)
    setLogPage(1)
  }, [recentAlerts.length, systemLogs.length])

  const fetchLogsData = async () => {
    try {
      setLoading(true)

      const [alertsResponse, devicesResponse, reportsResponse] = await Promise.all([
        alertsApi.getAll({ limit: 100, offset: 0 }),
        devicesApi.getAll(),
        reportsApi.getDoctorReports(),
      ])

      const alerts = alertsResponse.data.alerts || []
      const alertSummary = alertsResponse.data.summary || { total: alerts.length, unresolved: 0, resolved: 0 }
      const devices = devicesResponse.data.devices || []
      const reports = reportsResponse.data.reports || []

      setStats({
        totalDevices: devices.length,
        totalAlerts: alertSummary.total,
        totalReports: reports.length,
        avgHeartRate: null,
      })

      setRecentAlerts(alerts.slice(0, 10))
      setSystemLogs(
        alerts.slice(0, 10).map((alert) => ({
          id: alert.alert_id,
          timestamp: alert.timestamp,
          level: alert.resolved ? "INFO" : "WARNING",
          message: alert.message,
          source: `Alert #${alert.alert_id}`,
        }))
      )
    } catch (error) {
      console.error("Lỗi tải dữ liệu logs:", error)
      toast.error("Không thể tải dữ liệu thống kê")
    } finally {
      setLoading(false)
    }
  }

  const alertTotalPages = Math.max(1, Math.ceil(recentAlerts.length / ITEMS_PER_PAGE))
  const logTotalPages = Math.max(1, Math.ceil(systemLogs.length / ITEMS_PER_PAGE))
  const visibleAlerts = recentAlerts.slice((alertPage - 1) * ITEMS_PER_PAGE, alertPage * ITEMS_PER_PAGE)
  const visibleLogs = systemLogs.slice((logPage - 1) * ITEMS_PER_PAGE, logPage * ITEMS_PER_PAGE)

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("vi-VN")
  }

  const getLogLevelBadge = (level) => {
    switch (level) {
      case "ERROR":
        return <span className="status-chip is-danger">Lỗi</span>
      case "WARNING":
        return <span className="status-chip is-warning">Cảnh báo</span>
      case "INFO":
        return <span className="status-chip is-info">Thông tin</span>
      default:
        return <span className="status-chip is-neutral">{level}</span>
    }
  }

  const getAlertTypeIcon = (alertType) => {
    switch ((alertType || "").toLowerCase()) {
      case ALERT_TYPE.NHIP_NHANH:
        return "fas fa-arrow-up text-danger"
      case ALERT_TYPE.NHIP_CHAM:
        return "fas fa-arrow-down text-warning"
      case ALERT_TYPE.RUNG_NHI:
        return "fas fa-exclamation-triangle text-danger"
      default:
        return "fas fa-exclamation-circle text-info"
    }
  }

  if (loading) {
    return (
      <div className="page-shell">
        <div className="empty-state-rich">
          <div className="empty-state-rich-icon info"><i className="fas fa-spinner fa-spin"></i></div>
          <h3>Đang tải thống kê</h3>
          <p>Hệ thống đang tổng hợp cảnh báo và log vận hành.</p>
        </div>
      </div>
    )
  }

  const resolveAlert = async (alertId) => {
    try {
      await alertsApi.resolve(alertId)
      toast.success("Đã đánh dấu cảnh báo đã xử lý")
      await fetchLogsData()
    } catch (error) {
      console.error("Lỗi xử lý cảnh báo:", error)
      toast.error(error.response?.data?.message || "Không thể xử lý cảnh báo")
    }
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="page-hero-icon"><i className="fas fa-chart-bar"></i></div>
        <div className="min-w-0 flex-1">
          <p className="panel-eyebrow">System logs</p>
          <h1 className="page-hero-title">Thống kê & nhật ký hệ thống</h1>
          <p className="page-hero-subtitle">Theo dõi sức khỏe vận hành, cảnh báo mới và nhật ký hệ thống quan trọng.</p>
        </div>
        <button className="btn btn-outline-primary" onClick={fetchLogsData}>
          <i className="fas fa-sync-alt me-1"></i>
          Làm mới
        </button>
      </section>

      {/* Statistics Cards */}
      <section className="metric-grid">
        <div className="priority-metric metric-info"><div className="metric-icon"><i className="fas fa-microchip"></i></div><p className="metric-label">Tổng thiết bị</p><p className="metric-value">{stats.totalDevices.toLocaleString()}</p><p className="metric-helper">Nguồn từ API thiết bị</p></div>
        <div className="priority-metric metric-warning"><div className="metric-icon"><i className="fas fa-exclamation-triangle"></i></div><p className="metric-label">Tổng cảnh báo</p><p className="metric-value">{stats.totalAlerts}</p><p className="metric-helper">Cần theo dõi vận hành</p></div>
        <div className="priority-metric metric-success"><div className="metric-icon"><i className="fas fa-file-medical"></i></div><p className="metric-label">Tổng báo cáo</p><p className="metric-value">{stats.totalReports}</p><p className="metric-helper">Báo cáo chuyên môn</p></div>
        <div className="priority-metric metric-brand"><div className="metric-icon"><i className="fas fa-chart-line"></i></div><p className="metric-label">Nhịp tim TB</p><p className="metric-value">--</p><p className="metric-helper">Chưa có API aggregate</p></div>
      </section>

      {/* Recent Alerts and System Logs */}
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="clinical-panel overflow-hidden">
          <div className="clinical-panel-header">
            <h2 className="section-title"><i className="fas fa-bell me-2 text-warning"></i>Cảnh báo gần đây</h2>
          </div>
          <div className="clinical-panel-body">
            {visibleAlerts.length === 0 ? (
              <div className="empty-state-rich">
                <div className="empty-state-rich-icon success"><i className="fas fa-check-circle"></i></div>
                <h3>Không có cảnh báo nào</h3>
                <p>Hệ thống chưa ghi nhận cảnh báo gần đây.</p>
              </div>
            ) : (
              <div className="list-group list-group-flush">
                {visibleAlerts.map((alert) => (
                  <div key={alert.alert_id || alert.id} className="list-group-item border-0 px-0">
                    <div className="d-flex align-items-center">
                      <i className={`${getAlertTypeIcon(alert.alert_type)} me-3`}></i>
                      <div className="flex-grow-1">
                        <h6 className="mb-1">{alert.alert_type}</h6>
                        <p className="mb-1 text-muted small">{alert.message}</p>
                        <small className="text-muted">{formatDate(alert.timestamp || alert.created_at)}</small>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`status-chip ${alert.resolved ? "is-success" : "is-warning"}`}>
                          {alert.resolved ? "Đã xử lý" : "Chờ xử lý"}
                        </span>
                        {!alert.resolved ? (
                          <button type="button" className="btn btn-outline-success btn-sm" onClick={() => resolveAlert(alert.alert_id)}>
                            Xử lý
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <PaginationBar
              currentPage={alertPage}
              totalPages={alertTotalPages}
              onPageChange={setAlertPage}
              summaryText={recentAlerts.length > 0 ? `Hiển thị ${Math.min((alertPage - 1) * ITEMS_PER_PAGE + 1, recentAlerts.length)}-${Math.min(alertPage * ITEMS_PER_PAGE, recentAlerts.length)} / ${recentAlerts.length} cảnh báo` : "Chưa có cảnh báo để phân trang"}
              className="mt-4 px-0"
            />
          </div>
        </section>

        <section className="clinical-panel overflow-hidden">
          <div className="clinical-panel-header">
            <h2 className="section-title"><i className="fas fa-server me-2 text-info"></i>Nhật ký hệ thống</h2>
          </div>
          <div className="clinical-panel-body">
            <div className="list-group list-group-flush">
              {visibleLogs.length ? visibleLogs.map((log) => (
                <div key={log.id} className="list-group-item border-0 px-0">
                  <div className="d-flex align-items-start">
                    <div className="me-3">{getLogLevelBadge(log.level)}</div>
                    <div className="flex-grow-1">
                      <p className="mb-1">{log.message}</p>
                      <div className="d-flex justify-content-between">
                        <small className="text-muted">
                          <i className="fas fa-tag me-1"></i>
                          {log.source}
                        </small>
                        <small className="text-muted">{formatDate(log.timestamp)}</small>
                      </div>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="empty-state-rich">
                  <div className="empty-state-rich-icon info"><i className="fas fa-server"></i></div>
                  <h3>Chưa có API nhật ký hệ thống riêng</h3>
                  <p>Màn này chỉ hiển thị log suy ra từ cảnh báo thật, không dùng dữ liệu mock.</p>
                </div>
              )}
            </div>
            <PaginationBar
              currentPage={logPage}
              totalPages={logTotalPages}
              onPageChange={setLogPage}
              summaryText={systemLogs.length > 0 ? `Hiển thị ${Math.min((logPage - 1) * ITEMS_PER_PAGE + 1, systemLogs.length)}-${Math.min(logPage * ITEMS_PER_PAGE, systemLogs.length)} / ${systemLogs.length} log` : "Chưa có log để phân trang"}
              className="mt-4 px-0"
            />
          </div>
        </section>
      </div>
    </div>
  )
}

export default AdminLogs
