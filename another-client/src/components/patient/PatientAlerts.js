"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "react-toastify"
import { useAuth } from "../../contexts/AuthContext"
import { alertsApi } from "../../services/api"
import ReadingDetailModal from "../shared/ReadingDetailModal"

const SEVERITY_META = {
  high: {
    key: "high",
    title: "Nguy cơ cao",
    subtitle: "Cần theo dõi và trao đổi với bác sĩ sớm.",
    icon: "fas fa-triangle-exclamation",
    className: "alert-severity-high",
  },
  medium: {
    key: "medium",
    title: "Trung bình",
    subtitle: "Nên theo dõi nhịp tim sát trong ngày.",
    icon: "fas fa-wave-square",
    className: "alert-severity-medium",
  },
  low: {
    key: "low",
    title: "Thấp",
    subtitle: "Tiếp tục theo dõi định kỳ.",
    icon: "fas fa-circle-check",
    className: "alert-severity-low",
  },
}

const FILTER_ITEMS = [
  { key: "all", label: "Tất cả" },
  { key: "unresolved", label: "Chưa xử lý" },
  { key: "resolved", label: "Đã xử lý" },
]

const normalizeText = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()

const getAlertSeverity = (alertType) => {
  const normalized = normalizeText(alertType)
  if (
    normalized.includes("afib") ||
    normalized.includes("rung nhi") ||
    normalized.includes("ngung tim") ||
    normalized.includes("ngung tho") ||
    normalized.includes("critical")
  ) {
    return "high"
  }
  if (normalized.includes("nhip nhanh") || normalized.includes("nhip cham")) {
    return "medium"
  }
  return "low"
}

const getAlertTypeLabel = (alertType) => {
  const normalized = normalizeText(alertType)
  if (normalized.includes("afib") || normalized.includes("rung nhi")) return "AFIB"
  if (normalized.includes("nhip nhanh")) return "Nhịp nhanh"
  if (normalized.includes("nhip cham")) return "Nhịp chậm"
  if (normalized.includes("ngoai tam thu")) return "Ngoại tâm thu"
  if (normalized.includes("binh thuong") || normalized.includes("normal")) return "Bình thường"
  return alertType || "Cảnh báo"
}

const formatDate = (dateString) => new Date(dateString).toLocaleString("vi-VN")

const PatientAlerts = () => {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [selectedReadingId, setSelectedReadingId] = useState(null)

  useEffect(() => {
    if (!user?.user_id) {
      setAlerts([])
      setLoading(false)
      return
    }
    fetchAlerts()
  }, [filter, user?.user_id])

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      const resolved = filter === "all" ? undefined : filter === "resolved"
      const response = await alertsApi.getByUser(user.user_id, resolved)
      setAlerts(Array.isArray(response.data?.alerts) ? response.data.alerts : [])
    } catch (error) {
      console.error("Lỗi lấy cảnh báo:", error)
      setAlerts([])
      toast.error("Không thể tải danh sách cảnh báo")
    } finally {
      setLoading(false)
    }
  }

  const groupedAlerts = useMemo(() => {
    const groups = { high: [], medium: [], low: [] }
    for (const alert of alerts) {
      groups[getAlertSeverity(alert.alert_type)].push(alert)
    }
    return groups
  }, [alerts])

  const summary = useMemo(
    () => ({
      total: alerts.length,
      unresolved: alerts.filter((item) => !item.resolved).length,
      resolved: alerts.filter((item) => item.resolved).length,
    }),
    [alerts]
  )

  const handleViewReading = (alert) => {
    if (!alert?.reading_id) {
      toast.warning("Cảnh báo này không có reading tương ứng để xem đồ thị")
      return
    }
    setSelectedReadingId(alert.reading_id)
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
      <div className="alert-page-header mb-4">
        <div>
          <h1 className="h3 mb-1">
            <i className="fas fa-triangle-exclamation me-2 text-warning"></i>
            Cảnh báo sức khỏe
          </h1>
          <p className="alert-page-subtitle mb-0">
            Theo dõi cảnh báo theo mức độ để ưu tiên xử lý và mở nhanh đồ thị ECG liên quan.
          </p>
        </div>
        <button className="btn btn-outline-primary" onClick={fetchAlerts}>
          <i className="fas fa-rotate-right me-2"></i>
          Làm mới
        </button>
      </div>

      <div className="alert-summary-strip mb-4">
        <div className="alert-summary-item">
          <span className="alert-summary-label">Tổng cảnh báo</span>
          <span className="alert-summary-value">{summary.total}</span>
        </div>
        <div className="alert-summary-item">
          <span className="alert-summary-label">Chưa xử lý</span>
          <span className="alert-summary-value text-danger">{summary.unresolved}</span>
        </div>
        <div className="alert-summary-item">
          <span className="alert-summary-label">Đã xử lý</span>
          <span className="alert-summary-value text-success">{summary.resolved}</span>
        </div>
      </div>

      <div className="alert-filter-row mb-4">
        <div className="alert-filter-group" role="tablist" aria-label="Lọc cảnh báo">
          {FILTER_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`alert-filter-pill ${filter === item.key ? "is-active" : ""}`}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <i className="fas fa-shield-heart fa-3x text-success mb-3"></i>
            <h5 className="text-muted mb-2">
              {filter === "all"
                ? "Hiện chưa có cảnh báo"
                : filter === "resolved"
                  ? "Không có cảnh báo đã xử lý"
                  : "Không có cảnh báo chờ xử lý"}
            </h5>
            <p className="text-muted mb-0">Dữ liệu cảnh báo sẽ xuất hiện tại đây khi có biến động nhịp tim.</p>
          </div>
        </div>
      ) : (
        Object.keys(SEVERITY_META).map((severityKey) => {
          const items = groupedAlerts[severityKey]
          if (!items?.length) return null

          const meta = SEVERITY_META[severityKey]
          return (
            <section key={severityKey} className="alert-group-section mb-4">
              <div className="alert-group-header mb-3">
                <div>
                  <h2 className="alert-group-title mb-1">
                    <i className={`${meta.icon} me-2`}></i>
                    {meta.title}
                    <span className="alert-group-count">{items.length}</span>
                  </h2>
                  <p className="alert-group-subtitle mb-0">{meta.subtitle}</p>
                </div>
              </div>
              <div className="row g-3">
                {items.map((alert) => {
                  const hasReading = Boolean(alert.reading_id)
                  return (
                    <div key={alert.alert_id} className="col-12 col-lg-6">
                      <button
                        type="button"
                        className={`alert-clinical-card ${meta.className} ${!hasReading ? "alert-card-disabled" : ""}`}
                        onClick={() => handleViewReading(alert)}
                        disabled={!hasReading}
                        title={hasReading ? "Nhấn để xem đồ thị ECG" : "Không có reading tương ứng"}
                      >
                        <div className="alert-card-head">
                          <div className="alert-card-type">{getAlertTypeLabel(alert.alert_type)}</div>
                          <span className={`alert-status-chip ${alert.resolved ? "is-resolved" : "is-pending"}`}>
                            {alert.resolved ? "Đã xử lý" : "Chưa xử lý"}
                          </span>
                        </div>
                        <p className="alert-card-message">{alert.message}</p>
                        <div className="alert-meta-row">
                          <span>
                            <i className="far fa-clock me-1"></i>
                            {formatDate(alert.timestamp)}
                          </span>
                          <span className="alert-action-hint">
                            {hasReading ? "Nhấn để xem đồ thị ECG" : "Không có reading"}
                          </span>
                        </div>
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })
      )}

      <ReadingDetailModal
        show={Boolean(selectedReadingId)}
        readingId={selectedReadingId}
        onHide={() => setSelectedReadingId(null)}
      />
    </div>
  )
}

export default PatientAlerts
