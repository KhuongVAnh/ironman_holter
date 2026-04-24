import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useRef } from "react"
import { toast } from "react-toastify"
import { useAuth } from "../../contexts/AuthContext"
import { notificationsApi } from "../../services/api"
import { ROLE } from "../../services/string"
import { buildNotificationKey } from "../../utils/realtimeDedupe"

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
  const handledRealtimeKeysRef = useRef(new Set())

  const unreadOnPage = useMemo(() => notifications.filter((item) => !item.is_read).length, [notifications])

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
    const handleRealtimeNotification = (event) => {
      if (offset !== 0) return
      const notificationKey = buildNotificationKey(event.detail || {})
      if (handledRealtimeKeysRef.current.has(notificationKey)) return
      handledRealtimeKeysRef.current.add(notificationKey)
      fetchNotifications()
    }
    window.addEventListener("appNotificationNew", handleRealtimeNotification)
    return () => window.removeEventListener("appNotificationNew", handleRealtimeNotification)
  }, [offset, filterRead, filterType])

  const markRead = async (notification) => {
    if (!notification || notification.is_read || processingIds.has(notification.notification_id)) return
    try {
      setProcessingIds((prev) => new Set([...prev, notification.notification_id]))
      await notificationsApi.markRead(notification.notification_id)
      setNotifications((prev) => prev.map((item) => item.notification_id === notification.notification_id ? { ...item, is_read: true, read_at: new Date().toISOString() } : item))
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
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true, read_at: item.read_at || new Date().toISOString() })))
      window.dispatchEvent(new CustomEvent("appNotificationRead", { detail: { count: updated } }))
      toast.success("Đã đánh dấu đọc toàn bộ thông báo")
    } catch (error) {
      console.error("Lỗi đánh dấu tất cả đã đọc:", error)
      toast.error("Không thể đánh dấu tất cả đã đọc")
    }
  }

  const getTypeLabel = (type) => TYPE_OPTIONS.find((item) => item.value === type)?.label || type

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

  const formatDateTime = (value) => (value ? new Date(value).toLocaleString("vi-VN") : "-")

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="page-hero-icon"><i className="fas fa-bell"></i></div>
        <div className="min-w-0 flex-1">
          <p className="panel-eyebrow">Inbox</p>
          <h1 className="page-hero-title">Thông báo hệ thống</h1>
          <p className="page-hero-subtitle">Theo dõi cảnh báo, yêu cầu truy cập và tin nhắn mới trong một hộp thư thống nhất.</p>
        </div>
        <button type="button" className="btn btn-outline-primary" onClick={markAllRead} disabled={unreadOnPage === 0}>
          <i className="fas fa-check-double"></i>
          Đánh dấu đọc tất cả
        </button>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="priority-metric metric-info"><div className="metric-icon"><i className="fas fa-list"></i></div><p className="metric-label">Tổng trên trang</p><p className="metric-value">{notifications.length}</p><p className="metric-helper">Thông báo đang hiển thị</p></div>
        <div className="priority-metric metric-danger"><div className="metric-icon"><i className="fas fa-envelope"></i></div><p className="metric-label">Chưa đọc</p><p className="metric-value">{unreadOnPage}</p><p className="metric-helper">Cần xem trước</p></div>
        <div className="priority-metric metric-warning"><div className="metric-icon"><i className="fas fa-filter"></i></div><p className="metric-label">Bộ lọc hiện tại</p><p className="metric-value text-2xl">{TYPE_OPTIONS.find((item) => item.value === filterType)?.label || "Tất cả"}</p><p className="metric-helper">Loại thông báo</p></div>
      </section>

      <section className="clinical-panel p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="form-label">Trạng thái</label>
            <select className="form-select" value={filterRead} onChange={(event) => { setOffset(0); setFilterRead(event.target.value) }}>
              <option value="all">Tất cả</option>
              <option value="false">Chưa đọc</option>
              <option value="true">Đã đọc</option>
            </select>
          </div>
          <div>
            <label className="form-label">Loại thông báo</label>
            <select className="form-select" value={filterType} onChange={(event) => { setOffset(0); setFilterType(event.target.value) }}>
              {TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button type="button" className="btn btn-outline-secondary w-full" onClick={fetchNotifications}>Làm mới danh sách</button>
          </div>
        </div>
      </section>

      <section className="clinical-panel overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-14"><div className="spinner-border" role="status" /></div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center">
            <i className="fas fa-bell-slash fa-3x text-slate-300"></i>
            <h3 className="mt-5 text-xl font-bold text-ink-700">Không có thông báo nào</h3>
            <p className="mt-2 text-sm text-ink-500">Khi có cảnh báo hoặc hoạt động mới, hệ thống sẽ hiển thị tại đây.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-line">
            {notifications.map((notification) => {
              const isProcessing = processingIds.has(notification.notification_id)
              return (
                <div key={notification.notification_id} className={`flex flex-col gap-4 px-6 py-5 transition sm:flex-row sm:items-start sm:justify-between ${notification.is_read ? "bg-white" : "bg-brand-50/40"}`}>
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => handleOpenNotification(notification)}>
                    <div className="flex flex-wrap items-center gap-2">
                      {!notification.is_read ? <span className="inline-flex rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white">Mới</span> : null}
                      <span className="inline-flex rounded-full bg-category-50 px-3 py-1 text-xs font-bold text-category-500">{getTypeLabel(notification.type)}</span>
                    </div>
                    <h3 className="mt-3 text-base font-bold text-ink-900">{notification.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink-600">{notification.message}</p>
                    <p className="mt-3 text-xs font-medium text-ink-500">{formatDateTime(notification.created_at)}</p>
                  </button>
                  {!notification.is_read ? (
                    <button type="button" className="btn btn-outline-success btn-sm self-start" onClick={() => markRead(notification)} disabled={isProcessing}>Đánh dấu đã đọc</button>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <div className="flex items-center justify-between gap-4">
        <button type="button" className="btn btn-outline-secondary" onClick={() => setOffset((prev) => Math.max(prev - limit, 0))} disabled={offset === 0}>Trang trước</button>
        <button type="button" className="btn btn-outline-secondary" onClick={() => setOffset((prev) => prev + limit)} disabled={!hasMore}>Trang sau</button>
      </div>
    </div>
  )
}

export default NotificationsPage
