"use client"

import { Link } from "react-router-dom"

const normalizeText = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()

export const getAlertSeverity = (alertType) => {
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

export const getAlertTypeLabel = (alertType) => {
  const normalized = normalizeText(alertType)
  if (normalized.includes("afib") || normalized.includes("rung nhi")) return "AFIB"
  if (normalized.includes("nhip nhanh")) return "Nhịp nhanh"
  if (normalized.includes("nhip cham")) return "Nhịp chậm"
  if (normalized.includes("ngoai tam thu")) return "Ngoại tâm thu"
  if (normalized.includes("binh thuong") || normalized.includes("normal")) return "Bình thường"
  return alertType || "Cảnh báo"
}

const DEFAULT_SEVERITY_META = {
  high: { className: "alert-severity-high", icon: "fas fa-triangle-exclamation" },
  medium: { className: "alert-severity-medium", icon: "fas fa-wave-square" },
  low: { className: "alert-severity-low", icon: "fas fa-circle-check" },
}

const truncateMessage = (message, limit = 96) => {
  if (!message) return ""
  if (message.length <= limit) return message
  return `${message.slice(0, limit).trim()}...`
}

const defaultFormatDate = (value) => {
  if (!value) return "-"
  return new Date(value).toLocaleString("vi-VN")
}

const defaultStatus = (alert) =>
  alert?.resolved
    ? { label: "Đã xử lý", variant: "is-resolved" }
    : { label: "Mới", variant: "is-pending" }

const RecentAlertsPanel = ({
  title = "Cảnh báo gần nhất",
  subtitle = "",
  iconClass = "fas fa-triangle-exclamation me-2 text-warning",
  alerts = [],
  viewAllLink = null,
  emptyText = "Không có cảnh báo nào",
  onAlertClick = null,
  isAlertDisabled = (alert) => !alert?.reading_id,
  getAlertTitle = (alert) => getAlertTypeLabel(alert?.alert_type),
  getAlertMessage = (alert) => alert?.message || "",
  getAlertTimestamp = (alert) => alert?.timestamp || alert?.created_at,
  getAlertSeverityByItem = (alert) => getAlertSeverity(alert?.alert_type),
  getAlertStatus = defaultStatus,
  getAlertHint = (_alert, disabled, canClick) => {
    if (disabled) return "Không có reading"
    if (canClick) return "Nhấn để xem đồ thị ECG"
    return ""
  },
  formatDate = defaultFormatDate,
}) => {
  const shouldRenderHeader = Boolean(title || subtitle || viewAllLink)

  return (
    <div className="card border-0 shadow-sm">
      {shouldRenderHeader ? (
        <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center">
          <div>
            {title ? (
              <h5 className="card-title mb-1">
                <i className={iconClass}></i>
                {title}
              </h5>
            ) : null}
            {subtitle ? <small className="text-muted">{subtitle}</small> : null}
          </div>
          {viewAllLink ? (
            <Link to={viewAllLink.to} className="btn btn-outline-primary btn-sm">
              {viewAllLink.label || "Xem tất cả"}
            </Link>
          ) : null}
        </div>
      ) : null}
      <div className="card-body">
        {alerts.length > 0 ? (
          <div className="alert-rail-list">
            {alerts.map((alert) => {
              const severity = getAlertSeverityByItem(alert)
              const severityMeta = DEFAULT_SEVERITY_META[severity] || DEFAULT_SEVERITY_META.low
              const disabled = isAlertDisabled(alert)
              const canClick = typeof onAlertClick === "function"
              const status = getAlertStatus(alert) || defaultStatus(alert)
              const statusClass = status.className || `alert-status-chip ${status.variant || "is-pending"}`
              const date = formatDate(getAlertTimestamp(alert))
              const hint = getAlertHint(alert, disabled, canClick)
              const cardClasses = `alert-clinical-card alert-rail-card ${severityMeta.className} ${
                disabled ? "alert-card-disabled" : ""
              }`

              if (canClick) {
                return (
                  <button
                    key={alert.alert_id}
                    type="button"
                    className={cardClasses}
                    disabled={disabled}
                    onClick={() => onAlertClick(alert)}
                    title={hint}
                  >
                    <div className="alert-card-head">
                      <div className="alert-card-type">
                        <i className={`${severityMeta.icon} me-2`}></i>
                        {getAlertTitle(alert)}
                      </div>
                      <span className={statusClass}>{status.label}</span>
                    </div>
                    <p className="alert-card-message mb-2">{truncateMessage(getAlertMessage(alert))}</p>
                    <div className="alert-meta-row">
                      <span>
                        <i className="far fa-clock me-1"></i>
                        {date}
                      </span>
                      {hint ? <span className="alert-action-hint">{hint}</span> : null}
                    </div>
                  </button>
                )
              }

              return (
                <div key={alert.alert_id} className={cardClasses}>
                  <div className="alert-card-head">
                    <div className="alert-card-type">
                      <i className={`${severityMeta.icon} me-2`}></i>
                      {getAlertTitle(alert)}
                    </div>
                    <span className={statusClass}>{status.label}</span>
                  </div>
                  <p className="alert-card-message mb-2">{truncateMessage(getAlertMessage(alert))}</p>
                  <div className="alert-meta-row">
                    <span>
                      <i className="far fa-clock me-1"></i>
                      {date}
                    </span>
                    {hint ? <span className="alert-action-hint">{hint}</span> : null}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-4">
            <i className="fas fa-check-circle fa-3x text-success mb-3"></i>
            <p className="text-muted mb-0">{emptyText}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default RecentAlertsPanel
