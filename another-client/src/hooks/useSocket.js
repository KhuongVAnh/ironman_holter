"use client"

import { useEffect, useRef } from "react"
import io from "socket.io-client"
import { API_BASE_URL } from "../config/env"
import {
  buildAccessEventKey,
  buildAlertKey,
  buildNotificationKey,
  buildReadingAiKey,
  shouldProcessRealtimeEvent,
  showToastOnce,
} from "../utils/realtimeDedupe"

const useSocket = (userId, userRole) => {
  const socketRef = useRef(null)

  useEffect(() => {
    if (!userId) return

    socketRef.current = io(API_BASE_URL)

    const socket = socketRef.current

    const handleConnect = () => {
      console.log("\u0110\u00e3 k\u1ebft n\u1ed1i Socket.IO:", socket.id)

      socket.emit("join-user-room", userId)
      if (userRole) socket.emit("join-role-room", userRole)
      window.dispatchEvent(new CustomEvent("appSocketConnection", { detail: { connected: true } }))
    }
    socket.on("connect", handleConnect)

    const handleConnectionStatus = (data) => {
      if (data?.status === "connected") {
        console.log("Socket.IO room joined:", data)
      }
    }
    socket.on("connection-status", handleConnectionStatus)

    // Event chua duoc su dung trong flow hien tai.
    /*
    socket.on("new-alert", (alertData) => {
      toast.warning(`Cảnh báo: ${alertData.message}`, {
        autoClose: 10000,
        position: "top-center",
      })

      window.dispatchEvent(new CustomEvent("newAlert", { detail: alertData }))
    })

    socket.on("patient-alert", (alertData) => {
      if (userRole === ROLE.BAC_SI) {
        toast.error(`Cảnh báo bệnh nhân: ${alertData.message}`, {
          autoClose: 15000,
          position: "top-center",
        })

        window.dispatchEvent(new CustomEvent("patientAlert", { detail: alertData }))
      }
    })

    socket.on("family-alert", (alertData) => {
      if (userRole === ROLE.GIA_DINH) {
        toast.warning(`Cảnh báo người thân: ${alertData.message}`, {
          autoClose: 12000,
          position: "top-center",
        })

        window.dispatchEvent(new CustomEvent("familyAlert", { detail: alertData }))
      }
    })

    socket.on("emergency-alert", (alertData) => {
      toast.error(`🚨 KHẨN CẤP: ${alertData.message}`, {
        autoClose: false,
        position: "top-center",
        className: "emergency-toast",
      })

      window.dispatchEvent(new CustomEvent("emergencyAlert", { detail: alertData }))
    })

    socket.on("new-chat-message", (messageData) => {
      window.dispatchEvent(new CustomEvent("newChatMessage", { detail: messageData }))
    })
    */

    const handleDirectMessageNew = (messageData) => {
      const messageKey = messageData?.message_id ? `direct-message:${messageData.message_id}` : null
      if (messageKey && !shouldProcessRealtimeEvent(messageKey, 15000)) return
      window.dispatchEvent(new CustomEvent("directChatMessage", { detail: messageData }))
    }
    socket.on("direct-message:new", handleDirectMessageNew)

    const handleNotificationNew = (notification) => {
      const notificationKey = buildNotificationKey(notification)
      if (!shouldProcessRealtimeEvent(notificationKey, 60000)) return

      const title = notification?.title ? `${notification.title}: ` : ""
      const body = notification?.message || "B\u1ea1n c\u00f3 th\u00f4ng b\u00e1o m\u1edbi"
      const socketOwnedToastTypes = new Set(["ALERT", "ACCESS_REQUEST", "ACCESS_RESPONSE", "ACCESS_REVOKE"])
      if (!socketOwnedToastTypes.has(notification?.type)) {
        showToastOnce(notificationKey, "info", `${title}${body}`, { autoClose: 4000 }, 60000)
      }
      window.dispatchEvent(new CustomEvent("appNotificationNew", { detail: notification }))
    }
    socket.on("notification:new", handleNotificationNew)

    const handleReadingAiUpdated = (payload) => {
      if (payload?.ai_status === "FAILED") {
        showToastOnce(
          buildReadingAiKey(payload),
          "error",
          payload?.ai_error || "Phan tich AI that bai",
          { autoClose: 4000 },
          30000
        )
      }

      window.dispatchEvent(new CustomEvent("readingAiUpdated", { detail: payload }))
    }
    socket.on("reading-ai-updated", handleReadingAiUpdated)

    const handleAlert = (alertData) => {
      const alertKey = buildAlertKey(alertData)
      if (!shouldProcessRealtimeEvent(alertKey, 15000)) return
      window.dispatchEvent(new CustomEvent("appAlert", { detail: alertData }))
    }
    socket.on("alert", handleAlert)

    const handleAccessRequest = (payload) => {
      const accessKey = buildAccessEventKey("access-request", payload)
      if (!shouldProcessRealtimeEvent(accessKey, 15000)) return
      showToastOnce(accessKey, "info", "Có yêu cầu truy cập mới", { autoClose: 4000 }, 15000)
      window.dispatchEvent(new CustomEvent("appAccessRequest", { detail: payload }))
    }
    socket.on("access-request", handleAccessRequest)

    const handleAccessResponse = (payload) => {
      const accessKey = buildAccessEventKey("access-response", payload)
      if (!shouldProcessRealtimeEvent(accessKey, 15000)) return
      showToastOnce(accessKey, "info", "Một yêu cầu truy cập đã được phản hồi", { autoClose: 4000 }, 15000)
      window.dispatchEvent(new CustomEvent("appAccessResponse", { detail: payload }))
    }
    socket.on("access-response", handleAccessResponse)

    const handleAccessRevoke = (payload) => {
      const accessKey = buildAccessEventKey("access-revoke", payload)
      if (!shouldProcessRealtimeEvent(accessKey, 15000)) return
      showToastOnce(accessKey, "warning", "Một quyền truy cập đã bị thu hồi", { autoClose: 5000 }, 15000)
      window.dispatchEvent(new CustomEvent("appAccessRevoke", { detail: payload }))
    }
    socket.on("access-revoke", handleAccessRevoke)

    const handleReadingUpdate = (payload) => {
      window.dispatchEvent(new CustomEvent("appReadingUpdate", { detail: payload }))
    }
    socket.on("reading-update", handleReadingUpdate)

    // Event chua co consumer hoac chua co emitter trong flow hien tai.
    /*
    socket.on("direct-message:read", (payload) => {
      window.dispatchEvent(new CustomEvent("directChatRead", { detail: payload }))
    })

    socket.on("system-notification", (notification) => {
      toast.info(notification.message, {
        autoClose: 5000,
      })
    })

    socket.on("device-status-update", (deviceData) => {
      window.dispatchEvent(new CustomEvent("deviceStatusUpdate", { detail: deviceData }))
    })

    socket.on("admin-stats-update", (stats) => {
      if (userRole === ROLE.ADMIN) {
        window.dispatchEvent(new CustomEvent("adminStatsUpdate", { detail: stats }))
      }
    })
    */

    const handleConnectError = (error) => {
      console.error("L\u1ed7i k\u1ebft n\u1ed1i Socket.IO:", error)
      showToastOnce(
        "socket-connect-error",
        "error",
        "M\u1ea5t k\u1ebft n\u1ed1i real-time. \u0110ang th\u1eed k\u1ebft n\u1ed1i l\u1ea1i...",
        { autoClose: 5000 },
        15000
      )
    }
    socket.on("connect_error", handleConnectError)

    const handleDisconnect = (reason) => {
      console.log("Ng\u1eaft k\u1ebft n\u1ed1i Socket.IO:", reason)
      window.dispatchEvent(new CustomEvent("appSocketConnection", { detail: { connected: false, reason } }))
      if (reason === "io server disconnect") {
        socket.connect()
      }
    }
    socket.on("disconnect", handleDisconnect)

    return () => {
      if (socketRef.current) {
        socketRef.current.off("direct-message:new", handleDirectMessageNew)
        socketRef.current.off("notification:new", handleNotificationNew)
        socketRef.current.off("reading-ai-updated", handleReadingAiUpdated)
        socketRef.current.off("alert", handleAlert)
        socketRef.current.off("access-request", handleAccessRequest)
        socketRef.current.off("access-response", handleAccessResponse)
        socketRef.current.off("access-revoke", handleAccessRevoke)
        socketRef.current.off("reading-update", handleReadingUpdate)
        socketRef.current.off("connect", handleConnect)
        socketRef.current.off("connection-status", handleConnectionStatus)
        socketRef.current.off("connect_error", handleConnectError)
        socketRef.current.off("disconnect", handleDisconnect)
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [userId, userRole])

  // Utility event chua duoc su dung trong flow hien tai.
  /*
  const emitEvent = (eventName, data) => {
    if (socketRef.current) {
      socketRef.current.emit(eventName, data)
    }
  }

  const requestECGData = (deviceId) => {
    emitEvent("request-ecg-data", { userId, deviceId })
  }

  const stopECGStream = (deviceId) => {
    emitEvent("stop-ecg-stream", { userId, deviceId })
  }

  const sendChatMessage = (receiverId, message, senderRole) => {
    emitEvent("send-chat-message", {
      senderId: userId,
      receiverId,
      message,
      senderRole,
    })
  }

  const sendEmergencyAlert = (alertType, message, severity = "high") => {
    emitEvent("emergency-alert", {
      userId,
      alertType,
      message,
      severity,
    })
  }

  const joinDeviceRoom = (deviceId) => {
    emitEvent("join-device-room", deviceId)
  }
  */

  return {
    socket: socketRef.current,
  }
}

export default useSocket
