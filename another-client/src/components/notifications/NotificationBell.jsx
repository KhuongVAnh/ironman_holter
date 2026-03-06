import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import { notificationsApi } from "../../services/api"

const NotificationBell = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let mounted = true
    const fetchUnreadCount = async () => {
      if (!user?.user_id) return
      try {
        const response = await notificationsApi.getUnreadCount()
        if (!mounted) return
        setUnreadCount(Number(response.data?.unread_count || 0))
      } catch (error) {
        console.error("Loi lay so thong bao chua doc:", error)
      }
    }

    fetchUnreadCount()
    const handleNewNotification = () => setUnreadCount((prev) => prev + 1)
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
      className={`relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border ${isActive ? "border-brand-200 bg-brand-50 text-brand-700" : "border-surface-line bg-white text-ink-700"}`}
      onClick={() => navigate("/notifications")}
      aria-label="Thong bao"
      title="Thong bao"
    >
      <i className="fas fa-bell text-lg"></i>
      {unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-w-6 items-center justify-center rounded-full bg-clinical-danger px-1.5 py-0.5 text-[10px] font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </button>
  )
}

export default NotificationBell
