"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { Link } from "react-router-dom"
import { toast } from "react-toastify"
import io from "socket.io-client"
import { alertsApi, familyApi } from "../../services/api"
import { ACCESS_STATUS, ALERT_TYPE } from "../../services/string"

const FamilyDashboard = () => {
  const { user } = useAuth()
  const [familyMembers, setFamilyMembers] = useState([])
  const [recentAlerts, setRecentAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [socket, setSocket] = useState(null)

  // 🧠 Lấy 5 cảnh báo gần nhất của các người thân
  const fetchRecentAlerts = async () => {
    try {
      if (familyMembers.length === 0) return

      const alertPromises = familyMembers.map((p) =>
        alertsApi.getByUser(p.user_id, false)
      )

      const alertResponses = await Promise.all(alertPromises)
      const allAlerts = alertResponses.flatMap((res) => res.data.alerts || [])

      const sortedAlerts = allAlerts
        .filter((a) => a && a.alert_type)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5)

      console.log("📢 Cảnh báo gần nhất:", sortedAlerts)
      setRecentAlerts(sortedAlerts)
    } catch (error) {
      console.error("❌ Lỗi tải cảnh báo gần nhất:", error)
      toast.error("Không thể tải cảnh báo gần nhất")
    }
  }

  // ⚡ Kết nối socket + tải dashboard
  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_API_BASE_URL || "http://localhost:4000")
    setSocket(newSocket)

    newSocket.on("connect", () => {
      newSocket.emit("join-user-room", user.user_id)
    })

    newSocket.on("alert", (alertData) => {
      const isFamilyMemberAlert = familyMembers.some((member) => member.user_id === alertData.user_id)
      if (isFamilyMemberAlert) {
        toast.warning(`Cảnh báo từ người thân: ${alertData.message}`)
        fetchRecentAlerts()
      }
    })

    fetchDashboardData()

    return () => {
      newSocket.close()
    }
  }, [user.user_id])

  // ✅ Khi familyMembers thay đổi và có dữ liệu → load cảnh báo
  useEffect(() => {
    if (familyMembers.length > 0) {
      fetchRecentAlerts()
    }
  }, [familyMembers])

  // 📊 Tải danh sách người thân
  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const usersResponse = await familyApi.getPatients(user.user_id)

      // Chuẩn hóa dữ liệu
      const patients = usersResponse.data.map((item) => ({
        user_id: item.patient.user_id,
        name: item.patient.name,
        email: item.patient.email,
        is_active: item.status === ACCESS_STATUS.ACCEPTED,
      }))

      setFamilyMembers(patients)

    } catch (error) {
      console.error("Lỗi tải dashboard:", error)
      toast.error("Không thể tải dữ liệu dashboard")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => new Date(dateString).toLocaleString("vi-VN")

  const getAlertPriority = (alertType = "") => {
    const type = alertType.toLowerCase().trim()

    if (type.includes("ngưng tim") || type.includes("tim ngừng"))
      return { class: "bg-danger", priority: "Khẩn cấp" }

    if (type.includes(ALERT_TYPE.RUNG_NHI) || type.includes("rung tim"))
      return { class: "bg-danger", priority: "Cao" }

    if (type.includes(ALERT_TYPE.NHIP_NHANH) || type.includes("tăng nhịp"))
      return { class: "bg-warning", priority: "Trung bình" }

    if (type.includes(ALERT_TYPE.NHIP_CHAM) || type.includes("giảm nhịp"))
      return { class: "bg-info", priority: "Thấp" }

    if (type.includes(ALERT_TYPE.NGOAI_TAM_THU))
      return { class: "bg-secondary", priority: "Theo dõi" }

    // Mặc định
    return { class: "bg-danger", priority: "Chú ý" }
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

  // ✅ JSX hiển thị người thân và cảnh báo
  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">
          <i className="fas fa-users me-2 text-info"></i>
          Dashboard Gia đình
        </h1>
        <div className="text-muted">
          <i className="fas fa-clock me-1"></i>
          Cập nhật: {new Date().toLocaleString("vi-VN")}
        </div>
      </div>

      {/* Thống kê tổng quan */}
      <div className="row g-4 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-info text-white">
            <div className="card-body">
              <h2 className="h3 mb-1">{familyMembers.length}</h2>
              <p className="mb-0">Người thân theo dõi</p>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-warning text-white">
            <div className="card-body">
              <h2 className="h3 mb-1">{recentAlerts.length}</h2>
              <p className="mb-0">Cảnh báo chưa xử lý</p>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-success text-white">
            <div className="card-body">
              <h2 className="h3 mb-1">{familyMembers.filter((m) => m.is_active).length}</h2>
              <p className="mb-0">Đang hoạt động</p>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-primary text-white">
            <div className="card-body">
              <h2 className="h3 mb-1">24/7</h2>
              <p className="mb-0">Theo dõi liên tục</p>
            </div>
          </div>
        </div>
      </div>

      {/* Người thân */}
      <div className="row g-4">
        <div className="col-md-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">
                <i className="fas fa-users me-2 text-primary"></i>Người thân đang theo dõi
              </h5>
              <Link to="/family/monitoring" className="btn btn-outline-primary btn-sm">Xem chi tiết</Link>
            </div>
            <div className="card-body">
              {familyMembers.length > 0 ? (
                <div className="row g-3">
                  {familyMembers.map((member) => (
                    <div key={member.user_id} className="col-md-6">
                      <div className="card border-0 bg-light">
                        <div className="card-body d-flex align-items-center">
                          <div className="avatar-circle bg-primary text-white me-3">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-grow-1">
                            <h6 className="mb-1">{member.name}</h6>
                            <small className="text-muted">{member.email}</small>
                            <div className="mt-1">
                              {member.is_active ? (
                                <span className="badge bg-success">Hoạt động</span>
                              ) : (
                                <span className="badge bg-secondary">Ngưng</span>
                              )}
                            </div>
                          </div>
                          <div className="text-end">
                            <div className="text-success">
                              <i className="fas fa-heartbeat"></i>
                              <small className="ms-1">75 BPM</small>
                            </div>
                            <small className="text-muted">5 phút trước</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-user-plus fa-3x text-muted mb-3"></i>
                  <p className="text-muted">Chưa có người thân nào được theo dõi</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cảnh báo gần nhất */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0">
              <h5 className="card-title mb-0">
                <i className="fas fa-bell me-2 text-danger"></i>Cảnh báo gần nhất
              </h5>
            </div>
            <div className="card-body">
              {recentAlerts.length > 0 ? (
                <div className="list-group list-group-flush">
                  {recentAlerts.map((alert) => {
                    const priority = getAlertPriority(alert.alert_type)
                    const member = familyMembers.find((m) => m.user_id === alert.user_id)
                    return (
                      <div key={alert.alert_id} className="list-group-item px-0 border-0">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center mb-1">
                            <h6 className="mb-0 me-2">{member?.name || "Không xác định"}</h6>
                            <span className={`badge ${priority.class}`}>{priority.priority}</span>
                          </div>
                          <p className="mb-1 text-muted small">{alert.message}</p>
                          <small className="text-muted">{formatDate(alert.timestamp)}</small>
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

      </div>

      {/* Quick Actions */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card bg-light border-0">
            <div className="card-body">
              <h6 className="card-title">
                <i className="fas fa-bolt me-2 text-warning"></i>
                Thao tác nhanh
              </h6>
              <div className="row">
                <div className="col-md-3">
                  <Link to="/family/monitoring" className="btn btn-outline-primary w-100">
                    <i className="fas fa-chart-line me-2"></i>
                    Theo dõi chi tiết
                  </Link>
                </div>
                <div className="col-md-3">
                  <button className="btn btn-outline-success w-100" onClick={fetchDashboardData}>
                    <i className="fas fa-sync-alt me-2"></i>
                    Làm mới dữ liệu
                  </button>
                </div>
                <div className="col-md-3">
                  <button className="btn btn-outline-info w-100">
                    <i className="fas fa-phone me-2"></i>
                    Liên hệ khẩn cấp
                  </button>
                </div>
                <div className="col-md-3">
                  <button className="btn btn-outline-warning w-100">
                    <i className="fas fa-cog me-2"></i>
                    Cài đặt thông báo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FamilyDashboard
