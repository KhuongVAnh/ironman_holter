import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useRef } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { notificationsApi } from "../../services/api"
import { buildNotificationKey } from "../../utils/realtimeDedupe"

const NotificationBell = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)
  const handledNotificationKeysRef = useRef(new Set())

  useEffect(() => {
    let mounted = true
    const fetchUnreadCount = async () => {
      if (!user?.user_id) return
      try {
        const response = await notificationsApi.getUnreadCount()
        if (!mounted) return
        setUnreadCount(Number(response.data?.unread_count || 0))
      } catch (error) {
        console.error("Lỗi lấy số thông báo chưa đọc:", error)
      }
    }

    fetchUnreadCount()
    const handleNewNotification = (event) => {
      const notificationKey = buildNotificationKey(event.detail || {})
      if (handledNotificationKeysRef.current.has(notificationKey)) return
      handledNotificationKeysRef.current.add(notificationKey)
      setUnreadCount((prev) => prev + 1)
    }
    const handleReadNotification = (event) => {
      const count = Number(event.detail?.count || 0)
      setUnreadCount((prev) => Math.max(prev - count, 0))
    }
    const handleSyncUnread = (event) => setUnreadCount(Math.max(Number(event.detail?.count || 0), 0))

    window.addEventListener("appNotificationNew", handleNewNotification)
    window.addEventListener("appNotificationRead", handleReadNotification)
    window.addEventListener("appNotificationSyncUnread", handleSyncUnread)

    return () => {
      mounted = false
      window.removeEventListener("appNotificationNew", handleNewNotification)
      window.removeEventListener("appNotificationRead", handleReadNotification)
      window.removeEventListener("appNotificationSyncUnread", handleSyncUnread)
    }
  }, [user?.user_id])

  if (!user) return null

  const isActive = location.pathname === "/notifications"

  return (
    <button
      type="button"
      className={`relative inline-flex h-11 w-11 items-center justify-center rounded-xl ${isActive ? "bg-brand-50 text-brand-700" : "bg-white text-ink-700 hover:bg-surface-soft"}`}
      onClick={() => navigate("/notifications")}
      aria-label="Thông báo"
      title="Thông báo"
    >
      <i className="fas fa-bell text-base"></i>
      {unreadCount > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-accent-400 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </button>
  )
}

export default NotificationBell
