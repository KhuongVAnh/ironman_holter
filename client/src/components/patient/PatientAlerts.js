"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import axios from "axios"
import { toast } from "react-toastify"

const PatientAlerts = () => {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all") // all, resolved, unresolved

  useEffect(() => {
    fetchAlerts()
  }, [filter])

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      let url = `http://localhost:4000/api/alerts/${user.user_id}`
      if (filter !== "all") {
        url += `?resolved=${filter === "resolved"}`
      }
      const response = await axios.get(url)
      setAlerts(response.data.alerts)
    } catch (error) {
      console.error("Lỗi lấy cảnh báo:", error)
      toast.error("Không thể tải danh sách cảnh báo")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => new Date(dateString).toLocaleString("vi-VN")

  const getAlertIcon = (alertType) => {
    switch (alertType.toLowerCase()) {
      case "nhịp nhanh":
        return "fas fa-arrow-up text-primary"
      case "nhịp chậm":
        return "fas fa-arrow-down text-primary"
      case "rung nhĩ":
        return "fas fa-heart-crack text-danger"
      case "ngoại tâm thu":
        return "fas fa-bolt text-warning"
      case "normal":
      case "bình thường":
        return "fas fa-check-circle text-success"
      default:
        return "fas fa-heartbeat text-danger"
    }
  }

  const getAlertColor = (alertType) => {
    switch (alertType.toLowerCase()) {
      case "nhịp nhanh":
        return "border-secondary"
      case "rung nhĩ":
        return "border-danger"
      case "ngoại tâm thu":
        return "border-warning"
      case "nhịp chậm":
        return "border-secondary"
      case "normal":
      case "bình thường":
        return "border-success"
      default:
        return "border-danger"
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
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">
          <i className="fas fa-exclamation-triangle me-2 text-warning"></i>
          Cảnh báo sức khỏe
        </h1>
        <button className="btn btn-outline-primary" onClick={fetchAlerts}>
          <i className="fas fa-sync-alt me-1"></i>Làm mới
        </button>
      </div>

      {/* Filter buttons */}
      <div className="btn-group mb-4" role="group">
        <button
          type="button"
          className={`btn ${filter === "all" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setFilter("all")}
        >
          Tất cả
        </button>
        <button
          type="button"
          className={`btn ${filter === "unresolved" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setFilter("unresolved")}
        >
          Chưa xử lý
        </button>
        <button
          type="button"
          className={`btn ${filter === "resolved" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setFilter("resolved")}
        >
          Đã xử lý
        </button>
      </div>

      {/* Alerts list */}
      {alerts.length > 0 ? (
        <div className="row g-3">
          {alerts.map((alert) => (
            <div key={alert.alert_id} className="col-md-6 col-lg-4">
              <div className={`card h-100 border-start border-3 ${getAlertColor(alert.alert_type)}`}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div className="d-flex align-items-center">
                      <i className={`${getAlertIcon(alert.alert_type)} me-2`}></i>
                      <h6 className="card-title mb-0">{alert.alert_type}</h6>
                    </div>
                    {alert.resolved ? (
                      <span className="badge bg-success">Đã xử lý</span>
                    ) : (
                      <span className="badge bg-danger">Chưa xử lý</span>
                    )}
                  </div>

                  <p className="card-text text-muted mb-3">{alert.message}</p>

                  <div className="d-flex justify-content-between align-items-center">
                    <small className="text-muted">{formatDate(alert.timestamp)}</small>

                    {/* 👇 Thay nút xử lý bằng dòng thông báo */}
                    {!alert.resolved && (
                      <span className="text-secondary small fst-italic">
                        ⏳ Đang chờ bác sĩ xử lý...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <i className="fas fa-check-circle fa-3x text-success mb-3"></i>
            <h5 className="text-muted">
              {filter === "all"
                ? "Không có cảnh báo nào"
                : filter === "resolved"
                  ? "Không có cảnh báo đã xử lý"
                  : "Không có cảnh báo chưa xử lý"}
            </h5>
            <p className="text-muted">
              {filter === "all"
                ? "Tuyệt vời! Sức khỏe tim mạch của bạn đang ổn định."
                : "Hãy kiểm tra các bộ lọc khác để xem cảnh báo."}
            </p>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="card bg-light border-0 mt-4">
        <div className="card-body">
          <h6 className="card-title">
            <i className="fas fa-chart-pie me-2 text-info"></i>
            Thống kê cảnh báo
          </h6>
          <div className="row text-center">
            <div className="col-3 border-end">
              <h5 className="text-primary mb-1">{alerts.length}</h5>
              <small className="text-muted">Tổng số</small>
            </div>
            <div className="col-3 border-end">
              <h5 className="text-danger mb-1">{alerts.filter((a) => !a.resolved).length}</h5>
              <small className="text-muted">Chưa xử lý</small>
            </div>
            <div className="col-3 border-end">
              <h5 className="text-success mb-1">{alerts.filter((a) => a.resolved).length}</h5>
              <small className="text-muted">Đã xử lý</small>
            </div>
            <div className="col-3">
              <h5 className="text-warning mb-1">{alerts.filter((a) => a.alert_type.includes("nhịp")).length}</h5>
              <small className="text-muted">Nhịp tim</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PatientAlerts
