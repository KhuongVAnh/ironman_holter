"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { Link } from "react-router-dom"
import { toast } from "react-toastify"
import { alertsApi, doctorApi } from "../../services/api"
import { ALERT_TYPE } from "../../services/string"

const DoctorDashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalPatients: 0,
    activeAlerts: 0,
    reportsToday: 0,
    criticalPatients: 0,
  })
  const [recentPatients, setRecentPatients] = useState([])
  const [recentAlerts, setRecentAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  // Gọi API khi đăng nhập xong
  useEffect(() => {
    if (user?.user_id) fetchDashboardData()
  }, [user?.user_id])

  // 📊 Lấy dữ liệu dashboard bác sĩ
  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // 🩺 1️⃣ Lấy danh sách bệnh nhân được phép xem
      const patientsRes = await doctorApi.getPatients(user.user_id)
      const accessList = patientsRes.data || []
      const patients = accessList.map((p) => ({
        user_id: p.patient.user_id,
        name: p.patient.name,
        email: p.patient.email,
      }))

      // 🔔 2️⃣ Lấy cảnh báo của từng bệnh nhân song song
      const alertPromises = patients.map((p) =>
        alertsApi.getByUser(p.user_id, false).catch(() => ({ data: { alerts: [] } }))
      )
      const alertResponses = await Promise.all(alertPromises)
      const allAlerts = alertResponses.flatMap((res) => res.data.alerts || [])

      // 🧮 3️⃣ Sắp xếp & lấy 5 cảnh báo mới nhất
      const sortedAlerts = allAlerts
        .filter((a) => a && a.alert_type)
        .sort((a, b) => new Date(b.timestamp || b.created_at) - new Date(a.timestamp || a.created_at))
        .slice(0, 5)

      // 📈 4️⃣ Tính thống kê
      const criticalCount = allAlerts.filter(
        (a) =>
          a.alert_type.toLowerCase().includes("ngưng tim") ||
          a.alert_type.toLowerCase().includes(ALERT_TYPE.RUNG_NHI)
      ).length

      setStats({
        totalPatients: patients.length,
        activeAlerts: allAlerts.length,
        reportsToday: 0,
        criticalPatients: criticalCount,
      })

      setRecentPatients(patients.slice(0, 5))
      setRecentAlerts(sortedAlerts)
    } catch (error) {
      console.error("❌ Lỗi tải dashboard:", error)
      toast.error("Không thể tải dữ liệu dashboard")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => new Date(dateString).toLocaleString("vi-VN")

  const getAlertPriority = (alertType = "") => {
    const t = alertType.toLowerCase()
    if (t.includes("ngưng tim")) return { class: "bg-danger", text: "Khẩn cấp" }
    if (t.includes(ALERT_TYPE.RUNG_NHI)) return { class: "bg-danger", text: "Cao" }
    if (t.includes(ALERT_TYPE.NHIP_NHANH)) return { class: "bg-warning", text: "Trung bình" }
    return { class: "bg-info", text: "Thấp" }
  }

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">
          <i className="fas fa-user-md me-2 text-success"></i>Dashboard Bác sĩ
        </h1>
        <div className="text-muted">
          <i className="fas fa-clock me-1"></i>
          Cập nhật: {new Date().toLocaleString("vi-VN")}
        </div>
      </div>

      {/* Cards thống kê */}
      <div className="row g-4 mb-4">
        <StatCard color="primary" icon="users" value={stats.totalPatients} label="Tổng bệnh nhân" />
        <StatCard color="danger" icon="exclamation-triangle" value={stats.activeAlerts} label="Cảnh báo chưa xử lý" />
        <StatCard color="info" icon="file-medical" value={stats.reportsToday} label="Báo cáo hôm nay" />
        <StatCard color="warning" icon="heartbeat" value={stats.criticalPatients} label="Bệnh nhân nguy hiểm" />
      </div>

      <div className="row g-4">
        {/* 🔔 Cảnh báo gần nhất */}
        <div className="col-md-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">
                <i className="fas fa-bell me-2 text-danger"></i>Cảnh báo gần nhất
              </h5>
              <Link to="/doctor/patients" className="btn btn-outline-primary btn-sm">
                Xem tất cả
              </Link>
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
                              <h6 className="mb-0 me-2">{alert.alert_type || "Không xác định"}</h6>
                              <span className={`badge ${priority.class}`}>{priority.text}</span>
                            </div>
                            <p className="mb-1 text-muted small">{alert.message}</p>
                            <small className="text-muted">{formatDate(alert.timestamp || alert.created_at)}</small>
                          </div>
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

        {/* ⚡ Thao tác nhanh + Bệnh nhân gần đây */}
        <div className="col-md-4">
          <QuickActions refresh={fetchDashboardData} />

          <div className="card border-0 shadow-sm mt-4">
            <div className="card-header bg-white border-0">
              <h5 className="card-title mb-0">
                <i className="fas fa-user-friends me-2 text-info"></i>Bệnh nhân gần đây
              </h5>
            </div>
            <div className="card-body">
              {recentPatients.length > 0 ? (
                recentPatients.map((p) => (
                  <div key={p.user_id} className="d-flex justify-content-between align-items-center mb-2">
                    <div>
                      <h6 className="mb-0">{p.name}</h6>
                      <small className="text-muted">{p.email}</small>
                    </div>
                    <Link to={`/doctor/history/${p.user_id}`} className="btn btn-outline-primary btn-sm">
                      <i className="fas fa-eye"></i>
                    </Link>
                  </div>
                ))
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

// 🔢 Component thống kê
const StatCard = ({ color, icon, value, label }) => (
  <div className="col-md-3">
    <div className={`card border-0 shadow-sm bg-${color} text-white`}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h2 className="h3 mb-1">{value}</h2>
            <p className="mb-0">{label}</p>
          </div>
          <i className={`fas fa-${icon} fa-2x opacity-75`}></i>
        </div>
      </div>
    </div>
  </div>
)

// ⚡ Component thao tác nhanh
const QuickActions = ({ refresh }) => (
  <div className="card border-0 shadow-sm">
    <div className="card-header bg-white border-0">
      <h5 className="card-title mb-0">
        <i className="fas fa-bolt me-2 text-warning"></i>Thao tác nhanh
      </h5>
    </div>
    <div className="card-body d-grid gap-2">
      <Link to="/doctor/patients" className="btn btn-outline-primary">
        <i className="fas fa-users me-2"></i>Quản lý bệnh nhân
      </Link>
      <Link to="/doctor/reports" className="btn btn-outline-success">
        <i className="fas fa-file-medical me-2"></i>Tạo báo cáo mới
      </Link>
      <button onClick={refresh} className="btn btn-outline-info">
        <i className="fas fa-sync-alt me-2"></i>Làm mới dữ liệu
      </button>
    </div>
  </div>
)

export default DoctorDashboard
