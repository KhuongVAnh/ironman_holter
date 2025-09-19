"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import axios from "axios"
import { toast } from "react-toastify"

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
      const usersResponse = await axios.get("http://localhost:4000/api/users")
      const users = usersResponse.data.users

      // Fetch devices
      const devicesResponse = await axios.get("http://localhost:4000/api/devices")
      const devices = devicesResponse.data.devices

      // Fetch alerts
      const alertsResponse = await axios.get("http://localhost:4000/api/alerts")
      const alerts = alertsResponse.data.alerts

      // Fetch reports
      const reportsResponse = await axios.get("http://localhost:4000/api/reports/doctor/my-reports")
      const reports = reportsResponse.data.reports

      // Calculate stats
      setStats({
        totalUsers: users.length,
        totalPatients: users.filter((u) => u.role === "bệnh nhân").length,
        totalDoctors: users.filter((u) => u.role === "bác sĩ").length,
        totalDevices: devices.length,
        activeAlerts: alerts.filter((a) => !a.resolved).length,
        totalReports: reports.length,
      })

      // Get recent users (last 5)
      setRecentUsers(users.slice(0, 5))

      // System health check (simplified)
      setSystemHealth({
        database: users.length > 0 ? "healthy" : "warning",
        server: "healthy",
        alerts: alerts.filter((a) => !a.resolved).length > 10 ? "warning" : "healthy",
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

  const getHealthIcon = (status) => {
    switch (status) {
      case "healthy":
        return <i className="fas fa-check-circle text-success"></i>
      case "warning":
        return <i className="fas fa-exclamation-triangle text-warning"></i>
      case "error":
        return <i className="fas fa-times-circle text-danger"></i>
      default:
        return <i className="fas fa-question-circle text-muted"></i>
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("vi-VN")
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
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 mb-0">
              <i className="fas fa-user-shield me-2 text-danger"></i>
              Dashboard Quản trị
            </h1>
            <div className="text-muted">
              <i className="fas fa-clock me-1"></i>
              Cập nhật: {new Date().toLocaleString("vi-VN")}
            </div>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="card-title mb-3">
                <i className="fas fa-heartbeat me-2 text-success"></i>
                Tình trạng hệ thống
              </h5>
              <div className="row">
                <div className="col-md-4">
                  <div className="d-flex align-items-center">
                    {getHealthIcon(systemHealth.database)}
                    <span className="ms-2">Cơ sở dữ liệu</span>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="d-flex align-items-center">
                    {getHealthIcon(systemHealth.server)}
                    <span className="ms-2">Máy chủ</span>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="d-flex align-items-center">
                    {getHealthIcon(systemHealth.alerts)}
                    <span className="ms-2">Hệ thống cảnh báo</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="row g-4 mb-4">
        <div className="col-md-2">
          <div className="card border-0 shadow-sm bg-primary text-white">
            <div className="card-body text-center">
              <i className="fas fa-users fa-2x mb-2"></i>
              <h3 className="h4 mb-1">{stats.totalUsers}</h3>
              <p className="mb-0 small">Tổng người dùng</p>
            </div>
          </div>
        </div>

        <div className="col-md-2">
          <div className="card border-0 shadow-sm bg-info text-white">
            <div className="card-body text-center">
              <i className="fas fa-user-injured fa-2x mb-2"></i>
              <h3 className="h4 mb-1">{stats.totalPatients}</h3>
              <p className="mb-0 small">Bệnh nhân</p>
            </div>
          </div>
        </div>

        <div className="col-md-2">
          <div className="card border-0 shadow-sm bg-success text-white">
            <div className="card-body text-center">
              <i className="fas fa-user-md fa-2x mb-2"></i>
              <h3 className="h4 mb-1">{stats.totalDoctors}</h3>
              <p className="mb-0 small">Bác sĩ</p>
            </div>
          </div>
        </div>

        <div className="col-md-2">
          <div className="card border-0 shadow-sm bg-secondary text-white">
            <div className="card-body text-center">
              <i className="fas fa-microchip fa-2x mb-2"></i>
              <h3 className="h4 mb-1">{stats.totalDevices}</h3>
              <p className="mb-0 small">Thiết bị</p>
            </div>
          </div>
        </div>

        <div className="col-md-2">
          <div className="card border-0 shadow-sm bg-warning text-white">
            <div className="card-body text-center">
              <i className="fas fa-exclamation-triangle fa-2x mb-2"></i>
              <h3 className="h4 mb-1">{stats.activeAlerts}</h3>
              <p className="mb-0 small">Cảnh báo</p>
            </div>
          </div>
        </div>

        <div className="col-md-2">
          <div className="card border-0 shadow-sm bg-dark text-white">
            <div className="card-body text-center">
              <i className="fas fa-file-medical fa-2x mb-2"></i>
              <h3 className="h4 mb-1">{stats.totalReports}</h3>
              <p className="mb-0 small">Báo cáo</p>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Recent Users */}
        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">
                  <i className="fas fa-user-plus me-2 text-primary"></i>
                  Người dùng mới
                </h5>
                <Link to="/admin/users" className="btn btn-outline-primary btn-sm">
                  Xem tất cả
                </Link>
              </div>
            </div>
            <div className="card-body">
              {recentUsers.length > 0 ? (
                <div className="list-group list-group-flush">
                  {recentUsers.map((user) => (
                    <div key={user.user_id} className="list-group-item px-0 border-0">
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center">
                          <div className="avatar-circle bg-primary text-white me-3">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h6 className="mb-1">{user.name}</h6>
                            <small className="text-muted">{user.email}</small>
                          </div>
                        </div>
                        <div className="text-end">
                          <span className={`badge bg-${user.role === "admin" ? "danger" : "primary"}`}>
                            {user.role}
                          </span>
                          <div>
                            <small className="text-muted">{formatDate(user.created_at)}</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted text-center">Chưa có người dùng mới</p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0">
              <h5 className="card-title mb-0">
                <i className="fas fa-bolt me-2 text-warning"></i>
                Thao tác nhanh
              </h5>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <Link to="/admin/users" className="btn btn-outline-primary">
                  <i className="fas fa-users-cog me-2"></i>
                  Quản lý người dùng
                </Link>
                <Link to="/admin/devices" className="btn btn-outline-success">
                  <i className="fas fa-microchip me-2"></i>
                  Quản lý thiết bị
                </Link>
                <Link to="/admin/logs" className="btn btn-outline-info">
                  <i className="fas fa-chart-bar me-2"></i>
                  Xem thống kê
                </Link>
                <button className="btn btn-outline-warning" onClick={fetchDashboardData}>
                  <i className="fas fa-sync-alt me-2"></i>
                  Làm mới dữ liệu
                </button>
              </div>
            </div>
          </div>

          {/* System Info */}
          <div className="card border-0 shadow-sm mt-4">
            <div className="card-header bg-white border-0">
              <h5 className="card-title mb-0">
                <i className="fas fa-info-circle me-2 text-info"></i>
                Thông tin hệ thống
              </h5>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col-6 border-end">
                  <h6 className="text-success">Uptime</h6>
                  <small className="text-muted">99.9%</small>
                </div>
                <div className="col-6">
                  <h6 className="text-info">Version</h6>
                  <small className="text-muted">v1.0.0</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
