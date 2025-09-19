"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { Link } from "react-router-dom"
import axios from "axios"
import { toast } from "react-toastify"

const DoctorDashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalPatients: 0,
    activeAlerts: 0,
    reportsToday: 0,
    criticalPatients: 0,
  })
  const [recentAlerts, setRecentAlerts] = useState([])
  const [recentPatients, setRecentPatients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Fetch alerts
      const alertsResponse = await axios.get("http://localhost:4000/api/alerts?resolved=false")
      const alerts = alertsResponse.data.alerts

      // Fetch patients (assuming we get all users with role "bệnh nhân")
      const usersResponse = await axios.get("http://localhost:4000/api/users")
      const patients = usersResponse.data.users.filter((u) => u.role === "bệnh nhân")

      // Fetch doctor's reports
      const reportsResponse = await axios.get("http://localhost:4000/api/reports/doctor/my-reports")
      const reports = reportsResponse.data.reports

      // Calculate stats
      setStats({
        totalPatients: patients.length,
        activeAlerts: alerts.length,
        reportsToday: reports.filter((r) => {
          const today = new Date().toDateString()
          return new Date(r.created_at).toDateString() === today
        }).length,
        criticalPatients: alerts.filter((a) => a.alert_type.includes("ngưng tim") || a.alert_type.includes("rung nhĩ"))
          .length,
      })

      setRecentAlerts(alerts.slice(0, 5))
      setRecentPatients(patients.slice(0, 5))
    } catch (error) {
      console.error("Lỗi tải dashboard:", error)
      toast.error("Không thể tải dữ liệu dashboard")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("vi-VN")
  }

  const getAlertPriority = (alertType) => {
    if (alertType.includes("ngưng tim")) return { class: "text-danger", priority: "Khẩn cấp" }
    if (alertType.includes("rung nhĩ")) return { class: "text-danger", priority: "Cao" }
    if (alertType.includes("nhịp nhanh")) return { class: "text-warning", priority: "Trung bình" }
    return { class: "text-info", priority: "Thấp" }
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
              <i className="fas fa-user-md me-2 text-success"></i>
              Dashboard Bác sĩ
            </h1>
            <div className="text-muted">
              <i className="fas fa-clock me-1"></i>
              Cập nhật: {new Date().toLocaleString("vi-VN")}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="row g-4 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-primary text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="h3 mb-1">{stats.totalPatients}</h2>
                  <p className="mb-0">Tổng bệnh nhân</p>
                </div>
                <i className="fas fa-users fa-2x opacity-75"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-danger text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="h3 mb-1">{stats.activeAlerts}</h2>
                  <p className="mb-0">Cảnh báo chưa xử lý</p>
                </div>
                <i className="fas fa-exclamation-triangle fa-2x opacity-75"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-info text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="h3 mb-1">{stats.reportsToday}</h2>
                  <p className="mb-0">Báo cáo hôm nay</p>
                </div>
                <i className="fas fa-file-medical fa-2x opacity-75"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-warning text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="h3 mb-1">{stats.criticalPatients}</h2>
                  <p className="mb-0">Bệnh nhân nguy hiểm</p>
                </div>
                <i className="fas fa-heartbeat fa-2x opacity-75"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Recent Alerts */}
        <div className="col-md-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">
                  <i className="fas fa-bell me-2 text-danger"></i>
                  Cảnh báo gần nhất
                </h5>
                <Link to="/doctor/patients" className="btn btn-outline-primary btn-sm">
                  Xem tất cả
                </Link>
              </div>
            </div>
            <div className="card-body">
              {recentAlerts.length > 0 ? (
                <div className="list-group list-group-flush">
                  {recentAlerts.map((alert) => {
                    const priority = getAlertPriority(alert.alert_type)
                    return (
                      <div key={alert.alert_id} className="list-group-item px-0 border-0">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center mb-1">
                              <h6 className="mb-0 me-2">{alert.User?.name}</h6>
                              <span className={`badge bg-${priority.class.replace("text-", "")}`}>
                                {priority.priority}
                              </span>
                            </div>
                            <p className="mb-1 text-muted">{alert.message}</p>
                            <small className="text-muted">{formatDate(alert.timestamp)}</small>
                          </div>
                          <Link to={`/doctor/patient/${alert.user_id}`} className="btn btn-outline-primary btn-sm ms-2">
                            Xem chi tiết
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-check-circle fa-3x text-success mb-3"></i>
                  <p className="text-muted">Không có cảnh báo nào</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0">
              <h5 className="card-title mb-0">
                <i className="fas fa-bolt me-2 text-warning"></i>
                Thao tác nhanh
              </h5>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <Link to="/doctor/patients" className="btn btn-outline-primary">
                  <i className="fas fa-users me-2"></i>
                  Quản lý bệnh nhân
                </Link>
                <Link to="/doctor/reports" className="btn btn-outline-success">
                  <i className="fas fa-file-medical me-2"></i>
                  Tạo báo cáo mới
                </Link>
                <button className="btn btn-outline-info" onClick={fetchDashboardData}>
                  <i className="fas fa-sync-alt me-2"></i>
                  Làm mới dữ liệu
                </button>
              </div>
            </div>
          </div>

          {/* Recent Patients */}
          <div className="card border-0 shadow-sm mt-4">
            <div className="card-header bg-white border-0">
              <h5 className="card-title mb-0">
                <i className="fas fa-user-friends me-2 text-info"></i>
                Bệnh nhân gần đây
              </h5>
            </div>
            <div className="card-body">
              {recentPatients.length > 0 ? (
                <div className="list-group list-group-flush">
                  {recentPatients.map((patient) => (
                    <div key={patient.user_id} className="list-group-item px-0 border-0">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1">{patient.name}</h6>
                          <small className="text-muted">{patient.email}</small>
                        </div>
                        <Link to={`/doctor/patient/${patient.user_id}`} className="btn btn-outline-primary btn-sm">
                          <i className="fas fa-eye"></i>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted text-center">Chưa có bệnh nhân nào</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DoctorDashboard
