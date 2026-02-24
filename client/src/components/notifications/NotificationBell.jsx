"use client"

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
    let isMounted = true

    const fetchUnreadCount = async () => {
      if (!user?.user_id) return
      try {
        const response = await notificationsApi.getUnreadCount()
        if (!isMounted) return
        setUnreadCount(Number(response.data?.unread_count || 0))
      } catch (error) {
        console.error("Lỗi lấy số thông báo chưa đọc:", error)
      }
    }

    fetchUnreadCount()

    const handleNewNotification = () => {
      setUnreadCount((prev) => prev + 1)
    }

    const handleReadNotification = (event) => {
      const count = Number(event.detail?.count || 0)
      setUnreadCount((prev) => Math.max(prev - count, 0))
    }

    const handleSyncUnread = (event) => {
      const count = Number(event.detail?.count || 0)
      setUnreadCount(Math.max(count, 0))
    }

    window.addEventListener("appNotificationNew", handleNewNotification)
    window.addEventListener("appNotificationRead", handleReadNotification)
    window.addEventListener("appNotificationSyncUnread", handleSyncUnread)

    return () => {
      isMounted = false
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
      className={`btn btn-link nav-link custom-link position-relative d-flex align-items-center ${isActive ? "active" : ""}`}
      onClick={() => navigate("/notifications")}
      aria-label="Mở thông báo"
      title="Thông báo"
    >
      <i className="fas fa-bell fs-5"></i>
      {unreadCount > 0 && (
        <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  )
}

export default NotificationBell
