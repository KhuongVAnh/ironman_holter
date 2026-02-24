"use client"

import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import { useAuth } from "../../contexts/AuthContext"
import { notificationsApi } from "../../services/api"
import { ROLE } from "../../services/string"

const TYPE_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "ALERT", label: "Cảnh báo" },
  { value: "ACCESS_REQUEST", label: "Yêu cầu truy cập" },
  { value: "ACCESS_RESPONSE", label: "Phản hồi truy cập" },
  { value: "ACCESS_REVOKE", label: "Thu hồi truy cập" },
  { value: "DIRECT_MESSAGE", label: "Tin nhắn mới" },
]

const NotificationsPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState(new Set())
  const [filterRead, setFilterRead] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [offset, setOffset] = useState(0)
  const [limit] = useState(20)
  const [hasMore, setHasMore] = useState(false)

  const unreadOnPage = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  )

  const buildParams = () => {
    const params = { limit, offset }
    if (filterRead !== "all") params.is_read = filterRead
    if (filterType !== "all") params.type = filterType
    return params
  }

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await notificationsApi.list(buildParams())
      const list = Array.isArray(response.data?.notifications) ? response.data.notifications : []
      setNotifications(list)
      setHasMore(list.length === limit)
    } catch (error) {
      console.error("Lỗi tải thông báo:", error)
      toast.error("Không thể tải danh sách thông báo")
    } finally {
      setLoading(false)
    }
  }

  const syncUnreadCount = async () => {
    try {
      const response = await notificationsApi.getUnreadCount()
      const count = Number(response.data?.unread_count || 0)
      window.dispatchEvent(new CustomEvent("appNotificationSyncUnread", { detail: { count } }))
    } catch (error) {
      console.error("Lỗi đồng bộ số thông báo chưa đọc:", error)
    }
  }

  useEffect(() => {
    fetchNotifications()
    syncUnreadCount()
  }, [offset, filterRead, filterType])

  useEffect(() => {
    const handleRealtimeNotification = () => {
      if (offset !== 0) return
      fetchNotifications()
    }
    window.addEventListener("appNotificationNew", handleRealtimeNotification)
    return () => window.removeEventListener("appNotificationNew", handleRealtimeNotification)
  }, [offset, filterRead, filterType])

  const markRead = async (notification) => {
    if (!notification || notification.is_read) return
    if (processingIds.has(notification.notification_id)) return

    try {
      setProcessingIds((prev) => new Set([...prev, notification.notification_id]))
      await notificationsApi.markRead(notification.notification_id)
      setNotifications((prev) =>
        prev.map((item) =>
          item.notification_id === notification.notification_id
            ? { ...item, is_read: true, read_at: new Date().toISOString() }
            : item
        )
      )
      window.dispatchEvent(new CustomEvent("appNotificationRead", { detail: { count: 1 } }))
    } catch (error) {
      console.error("Lỗi đánh dấu đã đọc:", error)
      toast.error("Không thể đánh dấu đã đọc")
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev)
        next.delete(notification.notification_id)
        return next
      })
    }
  }

  const markAllRead = async () => {
    try {
      const response = await notificationsApi.markAllRead()
      const updated = Number(response.data?.updated || 0)
      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          is_read: true,
          read_at: item.read_at || new Date().toISOString(),
        }))
      )
      window.dispatchEvent(new CustomEvent("appNotificationRead", { detail: { count: updated } }))
      toast.success("Da danh dau doc tat ca thong bao")
    } catch (error) {
      console.error("Lỗi đánh dấu đọc tất cả:", error)
      toast.error("Không thể đánh dấu đọc tất cả")
    }
  }

  const getTypeLabel = (type) => {
    const found = TYPE_OPTIONS.find((item) => item.value === type)
    return found ? found.label : type
  }

  const getNavigatePath = (notification) => {
    const entityType = notification.entity_type
    if (entityType === "direct_message") {
      if (user?.role === ROLE.BAC_SI) return "/doctor/chat"
      if (user?.role === ROLE.BENH_NHAN) return "/chat"
      return null
    }

    if (entityType === "access_permission") {
      if (user?.role === ROLE.BENH_NHAN) return "/patient/access"
      if (user?.role === ROLE.BAC_SI) return "/doctor/access-requests"
      if (user?.role === ROLE.GIA_DINH) return "/family/access-requests"
      return null
    }

    if (entityType === "alert") {
      if (user?.role === ROLE.BENH_NHAN) return "/alerts"
      if (user?.role === ROLE.BAC_SI) return "/doctor/dashboard"
      if (user?.role === ROLE.GIA_DINH) return "/family/dashboard"
      if (user?.role === ROLE.ADMIN) return "/admin/logs"
      return null
    }

    return null
  }

  const handleOpenNotification = async (notification) => {
    await markRead(notification)
    const path = getNavigatePath(notification)
    if (path) navigate(path)
  }

  const formatDateTime = (value) => {
    if (!value) return "-"
    return new Date(value).toLocaleString("vi-VN")
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-1">Thông báo</h4>
          <small className="text-muted">Theo dõi sự kiện quan trọng trong hệ thống</small>
        </div>
        <button
          type="button"
          className="btn btn-outline-primary"
          onClick={markAllRead}
          disabled={unreadOnPage === 0}
        >
          Đánh dấu đọc tất cả
        </button>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body row g-3">
          <div className="col-md-4">
            <label className="form-label">Trạng thái</label>
            <select
              className="form-select"
              value={filterRead}
              onChange={(event) => {
                setOffset(0)
                setFilterRead(event.target.value)
              }}
            >
              <option value="all">Tất cả</option>
              <option value="false">Chưa đọc</option>
              <option value="true">Đã đọc</option>
            </select>
          </div>

          <div className="col-md-4">
            <label className="form-label">Loại thông báo</label>
            <select
              className="form-select"
              value={filterType}
              onChange={(event) => {
                setOffset(0)
                setFilterType(event.target.value)
              }}
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-4 d-flex align-items-end">
            <button type="button" className="btn btn-outline-secondary w-100" onClick={fetchNotifications}>
              Làm mới
            </button>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="list-group list-group-flush">
          {loading ? (
            <div className="list-group-item py-4 text-center text-muted">Đang tải thông báo...</div>
          ) : notifications.length === 0 ? (
            <div className="list-group-item py-4 text-center text-muted">Không có thông báo nào</div>
          ) : (
            notifications.map((notification) => {
              const isProcessing = processingIds.has(notification.notification_id)
              return (
                <div
                  key={notification.notification_id}
                  className={`list-group-item ${notification.is_read ? "" : "list-group-item-light"}`}
                >
                  <div className="d-flex justify-content-between align-items-start gap-3">
                    <div
                      role="button"
                      className="flex-grow-1"
                      onClick={() => handleOpenNotification(notification)}
                    >
                      <div className="d-flex align-items-center gap-2 mb-1">
                        {!notification.is_read && <span className="badge bg-danger">Mới</span>}
                        <span className="badge bg-secondary">{getTypeLabel(notification.type)}</span>
                      </div>
                      <h6 className="mb-1">{notification.title}</h6>
                      <p className="mb-1 text-muted">{notification.message}</p>
                      <small className="text-muted">{formatDateTime(notification.created_at)}</small>
                    </div>
                    <div>
                      {!notification.is_read && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success"
                          onClick={() => markRead(notification)}
                          disabled={isProcessing}
                        >
                          Đã đọc
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="d-flex justify-content-between mt-3">
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => setOffset((prev) => Math.max(prev - limit, 0))}
          disabled={offset === 0}
        >
          Trang trước
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => setOffset((prev) => prev + limit)}
          disabled={!hasMore}
        >
          Trang sau
        </button>
      </div>
    </div>
  )
}

export default NotificationsPage
