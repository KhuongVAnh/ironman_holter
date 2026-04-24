"use client"

import { useState, useEffect } from "react"
import { toast } from "react-toastify"
import { alertsApi } from "../../services/api"
import { ALERT_TYPE } from "../../services/string"

const AdminLogs = () => {
  const [stats, setStats] = useState({
    totalReadings: 0,
    totalAlerts: 0,
    totalReports: 0,
    avgHeartRate: 0,
  })
  const [recentAlerts, setRecentAlerts] = useState([])
  const [systemLogs, setSystemLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLogsData()
  }, [])

  const fetchLogsData = async () => {
    try {
      setLoading(true)

      // Fetch alerts for statistics
      const alertsResponse = await alertsApi.getAll()
      const alerts = alertsResponse.data.alerts

      // Mock system logs (in a real app, these would come from a logging service)
      const mockSystemLogs = [
        {
          id: 1,
          timestamp: new Date(Date.now() - 1000 * 60 * 5),
          level: "INFO",
          message: "Hệ thống khởi động thành công",
          source: "System",
        },
        {
          id: 2,
          timestamp: new Date(Date.now() - 1000 * 60 * 15),
          level: "WARNING",
          message: "Phát hiện 3 cảnh báo chưa xử lý",
          source: "AlertSystem",
        },
        {
          id: 3,
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          level: "INFO",
          message: "Backup dữ liệu hoàn tất",
          source: "Database",
        },
        {
          id: 4,
          timestamp: new Date(Date.now() - 1000 * 60 * 45),
          level: "ERROR",
          message: "Lỗi kết nối thiết bị HOLTER_001",
          source: "DeviceManager",
        },
        {
          id: 5,
          timestamp: new Date(Date.now() - 1000 * 60 * 60),
          level: "INFO",
          message: "Người dùng mới đăng ký: test@example.com",
          source: "AuthSystem",
        },
      ]

      setStats({
        totalReadings: 1250, // Mock data
        totalAlerts: alerts.length,
        totalReports: 45, // Mock data
        avgHeartRate: 78, // Mock data
      })

      setRecentAlerts(alerts.slice(0, 10))
      setSystemLogs(mockSystemLogs)
    } catch (error) {
      console.error("Lỗi tải dữ liệu logs:", error)
      toast.error("Không thể tải dữ liệu thống kê")
    } finally {
      setLoading(false)
    }
  }

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
        <div className="priority-metric metric-info"><div className="metric-icon"><i className="fas fa-heartbeat"></i></div><p className="metric-label">Tổng lần đo</p><p className="metric-value">{stats.totalReadings.toLocaleString()}</p><p className="metric-helper">Bản ghi ECG</p></div>
        <div className="priority-metric metric-warning"><div className="metric-icon"><i className="fas fa-exclamation-triangle"></i></div><p className="metric-label">Tổng cảnh báo</p><p className="metric-value">{stats.totalAlerts}</p><p className="metric-helper">Cần theo dõi vận hành</p></div>
        <div className="priority-metric metric-success"><div className="metric-icon"><i className="fas fa-file-medical"></i></div><p className="metric-label">Tổng báo cáo</p><p className="metric-value">{stats.totalReports}</p><p className="metric-helper">Báo cáo chuyên môn</p></div>
        <div className="priority-metric metric-brand"><div className="metric-icon"><i className="fas fa-chart-line"></i></div><p className="metric-label">Nhịp tim TB</p><p className="metric-value">{stats.avgHeartRate}</p><p className="metric-helper">BPM trung bình</p></div>
      </section>

      {/* Recent Alerts and System Logs */}
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="clinical-panel overflow-hidden">
            <div className="clinical-panel-header">
              <h2 className="section-title"><i className="fas fa-bell me-2 text-warning"></i>Cảnh báo gần đây</h2>
            </div>
            <div className="clinical-panel-body">
              {recentAlerts.length === 0 ? (
                <div className="empty-state-rich">
                  <div className="empty-state-rich-icon success"><i className="fas fa-check-circle"></i></div>
                  <h3>Không có cảnh báo nào</h3>
                  <p>Hệ thống chưa ghi nhận cảnh báo gần đây.</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {recentAlerts.map((alert) => (
                    <div key={alert.alert_id || alert.id} className="list-group-item border-0 px-0">
                      <div className="d-flex align-items-center">
                        <i className={`${getAlertTypeIcon(alert.alert_type)} me-3`}></i>
                        <div className="flex-grow-1">
                          <h6 className="mb-1">{alert.alert_type}</h6>
                          <p className="mb-1 text-muted small">{alert.message}</p>
                          <small className="text-muted">{formatDate(alert.timestamp || alert.created_at)}</small>
                        </div>
                        <span className={`status-chip ${alert.resolved ? "is-success" : "is-warning"}`}>
                          {alert.resolved ? "Đã xử lý" : "Chờ xử lý"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
        </section>

        <section className="clinical-panel overflow-hidden">
            <div className="clinical-panel-header">
              <h2 className="section-title"><i className="fas fa-server me-2 text-info"></i>Nhật ký hệ thống</h2>
            </div>
            <div className="clinical-panel-body">
              <div className="list-group list-group-flush">
                {systemLogs.map((log) => (
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
                ))}
              </div>
            </div>
        </section>
      </div>
    </div>
  )
}

export default AdminLogs
