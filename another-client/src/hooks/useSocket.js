"use client"

import { useEffect, useRef } from "react"
import io from "socket.io-client"
import { API_BASE_URL } from "../config/env"
import { toast } from "react-toastify"

const useSocket = (userId, userRole) => {
  const socketRef = useRef(null)

  useEffect(() => {
    if (!userId) return

    socketRef.current = io(API_BASE_URL)

    const socket = socketRef.current

    socket.on("connect", () => {
      console.log("\u0110\u00e3 k\u1ebft n\u1ed1i Socket.IO:", socket.id)

      socket.emit("join-user-room", userId)
      socket.emit("join-role-room", userRole)
    })

    socket.on("connection-status", (data) => {
      if (data.status === "connected") {
        toast.success("K\u1ebft n\u1ed1i real-time th\u00e0nh c\u00f4ng")
      }
    })

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
      window.dispatchEvent(new CustomEvent("directChatMessage", { detail: messageData }))
    }
    socket.on("direct-message:new", handleDirectMessageNew)

    const handleNotificationNew = (notification) => {
      const title = notification?.title ? `${notification.title}: ` : ""
      const body = notification?.message || "B\u1ea1n c\u00f3 th\u00f4ng b\u00e1o m\u1edbi"
      if (notification?.type !== "ALERT") {
        toast.info(`${title}${body}`, { autoClose: 4000 })
      }
      window.dispatchEvent(new CustomEvent("appNotificationNew", { detail: notification }))
    }
    socket.on("notification:new", handleNotificationNew)

    const handleReadingAiUpdated = (payload) => {
      if (payload?.ai_status === "FAILED") {
        toast.error(payload?.ai_error || "Phan tich AI that bai", { autoClose: 4000 })
      }

      window.dispatchEvent(new CustomEvent("readingAiUpdated", { detail: payload }))
    }
    socket.on("reading-ai-updated", handleReadingAiUpdated)

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

    socket.on("connect_error", (error) => {
      console.error("L\u1ed7i k\u1ebft n\u1ed1i Socket.IO:", error)
      toast.error("M\u1ea5t k\u1ebft n\u1ed1i real-time. \u0110ang th\u1eed k\u1ebft n\u1ed1i l\u1ea1i...")
    })

    socket.on("disconnect", (reason) => {
      console.log("Ng\u1eaft k\u1ebft n\u1ed1i Socket.IO:", reason)
      if (reason === "io server disconnect") {
        socket.connect()
      }
    })

    return () => {
      if (socketRef.current) {
        socketRef.current.off("direct-message:new", handleDirectMessageNew)
        socketRef.current.off("notification:new", handleNotificationNew)
        socketRef.current.off("reading-ai-updated", handleReadingAiUpdated)
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
