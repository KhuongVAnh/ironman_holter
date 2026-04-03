"use client"

import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "react-toastify"
import io from "socket.io-client"
import { API_BASE_URL } from "../../config/env"
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

  const fetchRecentAlerts = async (members = familyMembers) => {
    try {
      if (!members || members.length === 0) {
        setRecentAlerts([])
        return
      }

      const alertPromises = members.map((member) => alertsApi.getByUser(member.user_id, false))
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
      await fetchRecentAlerts(patients)
    } catch (error) {
      console.error("Lỗi tải dashboard:", error)
      toast.error("Không thể tải dữ liệu dashboard")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const socketClient = io(API_BASE_URL)

    socketClient.on("connect", () => {
      socketClient.emit("join-user-room", user.user_id)
    })

    socketClient.on("alert", (alertData) => {
      const isFamilyMemberAlert = familyMembers.some((member) => member.user_id === alertData.user_id)
      if (isFamilyMemberAlert) {
        toast.warning(`Cảnh báo từ người thân: ${alertData.message}`)
        fetchRecentAlerts()
      }
    })

    fetchDashboardData()

    return () => {
      socketClient.close()
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

      <div className="row g-4">
        <div className="col-md-8">
          <RecentAlertsPanel
            title="Cảnh báo gần nhất"
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
              if (disabled) return "Không có reading"
              if (canClick) return "Nhấn để xem đồ thị ECG"
              return ""
            }}
            emptyText="Không có cảnh báo nào"
          />
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">
                <i className="fas fa-users me-2 text-primary"></i>
                Người thân đang theo dõi
              </h5>
              <Link to="/family/monitoring" className="btn btn-outline-primary btn-sm">
                Xem chi tiết
              </Link>
            </div>
            <div className="card-body">
              {familyMembers.length > 0 ? (
                <div className="row g-3">
                  {familyMembers.map((member) => (
                    <div key={member.user_id} className="col-md-12">
                      <div className="card border-0 bg-light">
                        <div className="card-body d-flex align-items-center">
                          <div className="avatar-circle bg-primary text-white me-3">{member.name.charAt(0).toUpperCase()}</div>
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
      </div>

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

      <ReadingDetailModal
        show={Boolean(selectedReadingId)}
        onHide={() => setSelectedReadingId(null)}
        readingId={selectedReadingId}
      />
    </div>
  )
}

export default FamilyDashboard
