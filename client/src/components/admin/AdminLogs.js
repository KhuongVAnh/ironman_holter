"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { toast } from "react-toastify"

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
      const alertsResponse = await axios.get("http://localhost:4000/api/alerts")
      const alerts = alertsResponse.data.alerts

      // Fetch users for statistics
      const usersResponse = await axios.get("http://localhost:4000/api/users")
      const users = usersResponse.data.users

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
        return <span className="badge bg-danger">{level}</span>
      case "WARNING":
        return <span className="badge bg-warning">{level}</span>
      case "INFO":
        return <span className="badge bg-info">{level}</span>
      default:
        return <span className="badge bg-secondary">{level}</span>
    }
  }

  const getAlertTypeIcon = (alertType) => {
    switch (alertType.toLowerCase()) {
      case "nhịp nhanh":
        return "fas fa-arrow-up text-danger"
      case "nhịp chậm":
        return "fas fa-arrow-down text-warning"
      case "rung nhĩ":
        return "fas fa-exclamation-triangle text-danger"
      default:
        return "fas fa-exclamation-circle text-info"
    }
  }

  if (loading) {
    return (
      <div className="container py-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 mb-0">
              <i className="fas fa-chart-bar me-2 text-info"></i>
              Thống kê & Logs
            </h1>
            <button className="btn btn-outline-primary" onClick={fetchLogsData}>
              <i className="fas fa-sync-alt me-1"></i>
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="row g-4 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-primary text-white">
            <div className="card-body text-center">
              <i className="fas fa-heartbeat fa-2x mb-2"></i>
              <h3 className="h4 mb-1">{stats.totalReadings.toLocaleString()}</h3>
              <p className="mb-0 small">Tổng lần đo</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-warning text-white">
            <div className="card-body text-center">
              <i className="fas fa-exclamation-triangle fa-2x mb-2"></i>
              <h3 className="h4 mb-1">{stats.totalAlerts}</h3>
              <p className="mb-0 small">Tổng cảnh báo</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-success text-white">
            <div className="card-body text-center">
              <i className="fas fa-file-medical fa-2x mb-2"></i>
              <h3 className="h4 mb-1">{stats.totalReports}</h3>
              <p className="mb-0 small">Tổng báo cáo</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-info text-white">
            <div className="card-body text-center">
              <i className="fas fa-chart-line fa-2x mb-2"></i>
              <h3 className="h4 mb-1">{stats.avgHeartRate}</h3>
              <p className="mb-0 small">Nhịp tim TB</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Alerts and System Logs */}
      <div className="row g-4">
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom">
              <h5 className="card-title mb-0">
                <i className="fas fa-bell me-2 text-warning"></i>
                Cảnh báo gần đây
              </h5>
            </div>
            <div className="card-body">
              {recentAlerts.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <i className="fas fa-check-circle fa-2x mb-2"></i>
                  <p className="mb-0">Không có cảnh báo nào</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {recentAlerts.map((alert) => (
                    <div key={alert.id} className="list-group-item border-0 px-0">
                      <div className="d-flex align-items-center">
                        <i className={`${getAlertTypeIcon(alert.alert_type)} me-3`}></i>
                        <div className="flex-grow-1">
                          <h6 className="mb-1">{alert.alert_type}</h6>
                          <p className="mb-1 text-muted small">{alert.message}</p>
                          <small className="text-muted">{formatDate(alert.created_at)}</small>
                        </div>
                        <span className={`badge ${alert.status === "resolved" ? "bg-success" : "bg-warning"}`}>
                          {alert.status === "resolved" ? "Đã xử lý" : "Chờ xử lý"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom">
              <h5 className="card-title mb-0">
                <i className="fas fa-server me-2 text-info"></i>
                System Logs
              </h5>
            </div>
            <div className="card-body">
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
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminLogs
