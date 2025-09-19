"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { Link } from "react-router-dom"
import axios from "axios"
import { toast } from "react-toastify"
import io from "socket.io-client"

const FamilyDashboard = () => {
  const { user } = useAuth()
  const [familyMembers, setFamilyMembers] = useState([])
  const [recentAlerts, setRecentAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [socket, setSocket] = useState(null)

  const fetchRecentAlerts = async () => {
    try {
      const alertPromises = familyMembers.map((patient) =>
        axios.get(`http://localhost:4000/api/alerts/${patient.user_id}?resolved=false`),
      )
      const alertResponses = await Promise.all(alertPromises)
      const allAlerts = alertResponses.flatMap((response) => response.data.alerts)
      setRecentAlerts(allAlerts.slice(0, 5))
    } catch (error) {
      console.error("Lỗi tải cảnh báo gần nhất:", error)
      toast.error("Không thể tải cảnh báo gần nhất")
    }
  }

  useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io("http://localhost:4000")
    setSocket(newSocket)

    newSocket.on("connect", () => {
      newSocket.emit("join-user-room", user.user_id)
    })

    // Listen for alerts from family members
    newSocket.on("alert", (alertData) => {
      // Check if this alert is for a family member we're monitoring
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

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // For demo purposes, we'll get all patients as potential family members
      // In a real app, there would be a family relationship table
      const usersResponse = await axios.get("http://localhost:4000/api/users")
      const patients = usersResponse.data.users.filter((u) => u.role === "bệnh nhân").slice(0, 3) // Limit to 3 for demo
      setFamilyMembers(patients)

      // Get alerts for family members
      await fetchRecentAlerts()
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
    if (alertType.includes("ngưng tim")) return { class: "bg-danger", priority: "Khẩn cấp" }
    if (alertType.includes("rung nhĩ")) return { class: "bg-danger", priority: "Cao" }
    if (alertType.includes("nhịp nhanh")) return { class: "bg-warning", priority: "Trung bình" }
    return { class: "bg-info", priority: "Thấp" }
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
              <i className="fas fa-users me-2 text-info"></i>
              Dashboard Gia đình
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
          <div className="card border-0 shadow-sm bg-info text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="h3 mb-1">{familyMembers.length}</h2>
                  <p className="mb-0">Người thân theo dõi</p>
                </div>
                <i className="fas fa-heart fa-2x opacity-75"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-warning text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="h3 mb-1">{recentAlerts.length}</h2>
                  <p className="mb-0">Cảnh báo chưa xử lý</p>
                </div>
                <i className="fas fa-exclamation-triangle fa-2x opacity-75"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-success text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="h3 mb-1">{familyMembers.filter((member) => member.is_active).length}</h2>
                  <p className="mb-0">Đang hoạt động</p>
                </div>
                <i className="fas fa-check-circle fa-2x opacity-75"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-primary text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="h3 mb-1">24/7</h2>
                  <p className="mb-0">Theo dõi liên tục</p>
                </div>
                <i className="fas fa-shield-alt fa-2x opacity-75"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Family Members */}
        <div className="col-md-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">
                  <i className="fas fa-users me-2 text-primary"></i>
                  Người thân đang theo dõi
                </h5>
                <Link to="/family/monitoring" className="btn btn-outline-primary btn-sm">
                  Xem chi tiết
                </Link>
              </div>
            </div>
            <div className="card-body">
              {familyMembers.length > 0 ? (
                <div className="row g-3">
                  {familyMembers.map((member) => (
                    <div key={member.user_id} className="col-md-6">
                      <div className="card border-0 bg-light">
                        <div className="card-body">
                          <div className="d-flex align-items-center">
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

        {/* Recent Alerts */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0">
              <h5 className="card-title mb-0">
                <i className="fas fa-bell me-2 text-danger"></i>
                Cảnh báo gần nhất
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
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center mb-1">
                              <h6 className="mb-0 me-2">{member?.name || "Không xác định"}</h6>
                              <span className={`badge ${priority.class}`}>{priority.priority}</span>
                            </div>
                            <p className="mb-1 text-muted small">{alert.message}</p>
                            <small className="text-muted">{formatDate(alert.timestamp)}</small>
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
