"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "react-toastify"
import { useAuth } from "../../contexts/AuthContext"
import { alertsApi } from "../../services/api"
import PaginationBar from "../shared/PaginationBar"
import ReadingDetailModal from "../shared/ReadingDetailModal"

const ITEMS_PER_PAGE = 6

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
  const [pageTotal, setPageTotal] = useState(0)
  const [alertSummary, setAlertSummary] = useState({ total: 0, unresolved: 0, resolved: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedReadingId, setSelectedReadingId] = useState(null)

  useEffect(() => {
    if (!user?.user_id) {
      setAlerts([])
      setPageTotal(0)
      setAlertSummary({ total: 0, unresolved: 0, resolved: 0 })
      setLoading(false)
      return
    }
    fetchAlerts()
  }, [filter, currentPage, user?.user_id])

  const fetchAlerts = async (page = currentPage) => {
    try {
      setLoading(true)
      const resolved = filter === "all" ? undefined : filter === "resolved"
      const response = await alertsApi.getByUser(user.user_id, {
        ...(resolved !== undefined ? { resolved } : {}),
        limit: ITEMS_PER_PAGE,
        offset: (page - 1) * ITEMS_PER_PAGE,
      })
      setAlerts(Array.isArray(response.data?.alerts) ? response.data.alerts : [])
      setPageTotal(Number.isInteger(response.data?.total) ? response.data.total : 0)
      setAlertSummary(response.data?.summary || { total: 0, unresolved: 0, resolved: 0 })
    } catch (error) {
      console.error("Lỗi lấy cảnh báo:", error)
      setAlerts([])
      setPageTotal(0)
      setAlertSummary({ total: 0, unresolved: 0, resolved: 0 })
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

  const totalPages = Math.max(1, Math.ceil((pageTotal || 0) / ITEMS_PER_PAGE))
  const visibleStart = pageTotal === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1
  const visibleEnd = pageTotal === 0 ? 0 : Math.min(currentPage * ITEMS_PER_PAGE, pageTotal)

  const summary = useMemo(
    () => ({
      total: alertSummary.total,
      unresolved: alertSummary.unresolved,
      resolved: alertSummary.resolved,
    }),
    [alertSummary]
  )

  const handleViewReading = (alert) => {
    if (!alert?.reading_id) {
      toast.warning("Cảnh báo này không có bản ghi tương ứng để xem đồ thị")
      return
    }
    setSelectedReadingId(alert.reading_id)
  }

  if (loading) {
    return (
      <div className="page-shell">
        <div className="empty-state-rich">
          <div className="empty-state-rich-icon info"><i className="fas fa-spinner fa-spin"></i></div>
          <h3>Đang tải cảnh báo</h3>
          <p>Hệ thống đang lấy các cảnh báo nhịp tim mới nhất.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="page-hero-icon"><i className="fas fa-triangle-exclamation"></i></div>
        <div className="min-w-0 flex-1">
          <p className="panel-eyebrow">Cảnh báo sức khỏe</p>
          <h1 className="page-hero-title">Ưu tiên cảnh báo ECG cần xử lý</h1>
          <p className="page-hero-subtitle">Theo dõi cảnh báo theo mức độ để ưu tiên xử lý và mở nhanh đồ thị ECG liên quan.</p>
        </div>
        <button className="btn btn-outline-primary" onClick={fetchAlerts}>
          <i className="fas fa-rotate-right me-2"></i>
          Làm mới
        </button>
      </section>

      <section className="metric-grid">
        <div className="priority-metric metric-info">
          <div className="metric-icon"><i className="fas fa-list-check"></i></div>
          <p className="metric-label">Tổng cảnh báo</p>
          <p className="metric-value">{summary.total}</p>
          <p className="metric-helper">Theo bộ lọc hiện tại</p>
        </div>
        <div className="priority-metric metric-danger">
          <div className="metric-icon"><i className="fas fa-bell"></i></div>
          <p className="metric-label">Chưa xử lý</p>
          <p className="metric-value">{summary.unresolved}</p>
          <p className="metric-helper">Cần xem trước tiên</p>
        </div>
        <div className="priority-metric metric-success">
          <div className="metric-icon"><i className="fas fa-circle-check"></i></div>
          <p className="metric-label">Đã xử lý</p>
          <p className="metric-value">{summary.resolved}</p>
          <p className="metric-helper">Đã được ghi nhận</p>
        </div>
      </section>

      <section className="clinical-panel overflow-hidden">
        <div className="clinical-panel-header">
          <div>
            <p className="panel-eyebrow">Bộ lọc</p>
            <h2 className="section-title">Danh sách cảnh báo</h2>
            <p className="section-subtitle">Nhấn một cảnh báo để xem chi tiết bản ghi ECG.</p>
          </div>
          <div className="alert-filter-group" role="tablist" aria-label="Lọc cảnh báo">
            {FILTER_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`alert-filter-pill ${filter === item.key ? "is-active" : ""}`}
                onClick={() => {
                  setFilter(item.key)
                  setCurrentPage(1)
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="clinical-panel-body">

          {alerts.length === 0 ? (
            <div className="empty-state-rich">
              <div className="empty-state-rich-icon success"><i className="fas fa-shield-heart"></i></div>
              <h3>
                {filter === "all"
                  ? "Hiện chưa có cảnh báo"
                  : filter === "resolved"
                    ? "Không có cảnh báo đã xử lý"
                    : "Không có cảnh báo chờ xử lý"}
              </h3>
              <p>Dữ liệu cảnh báo sẽ xuất hiện tại đây khi có biến động nhịp tim.</p>
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
                  <div className="grid gap-3 lg:grid-cols-2">
                    {items.map((alert) => {
                      const hasReading = Boolean(alert.reading_id)
                      return (
                        <div key={alert.alert_id} className="space-y-2">
                          <button
                            type="button"
                            className={`alert-clinical-card ${meta.className} ${!hasReading ? "alert-card-disabled" : ""}`}
                            onClick={() => handleViewReading(alert)}
                            disabled={!hasReading}
                            title={hasReading ? "Nhấn để xem đồ thị ECG" : "Không có bản ghi tương ứng"}
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
                                {hasReading ? "Nhấn để xem đồ thị ECG" : "Không có bản ghi"}
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
        </div>
      </section>

      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        summaryText={
          pageTotal > 0
            ? `Hiển thị ${visibleStart}-${visibleEnd} / ${pageTotal} cảnh báo`
            : "Chưa có cảnh báo để phân trang"
        }
        className="mt-4"
      />

      <ReadingDetailModal
        show={Boolean(selectedReadingId)}
        readingId={selectedReadingId}
        onHide={() => setSelectedReadingId(null)}
      />
    </div>
  )
}

export default PatientAlerts
