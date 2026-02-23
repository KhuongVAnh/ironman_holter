"use client"

import { useEffect, useRef } from "react"
import io from "socket.io-client"
import { toast } from "react-toastify"
import { ROLE } from "../services/string"

const useSocket = (userId, userRole) => {
  const socketRef = useRef(null)

  useEffect(() => {
    if (!userId) return

    // Kết nối Socket.IO
    socketRef.current = io(process.env.REACT_APP_API_BASE_URL || "http://localhost:4000")

    const socket = socketRef.current

    // Xử lý kết nối
    socket.on("connect", () => {
      console.log("Đã kết nối Socket.IO:", socket.id)

      // Join các room cần thiết
      socket.emit("join-user-room", userId)
      socket.emit("join-role-room", userRole)
    })

    // Xử lý trạng thái kết nối
    socket.on("connection-status", (data) => {
      if (data.status === "connected") {
        toast.success("Kết nối real-time thành công")
      }
    })

    // Xử lý cảnh báo mới
    socket.on("new-alert", (alertData) => {
      toast.warning(`Cảnh báo: ${alertData.message}`, {
        autoClose: 10000,
        position: "top-center",
      })

      // Trigger custom event để các component khác có thể lắng nghe
      window.dispatchEvent(new CustomEvent("newAlert", { detail: alertData }))
    })

    // Xử lý cảnh báo bệnh nhân (cho bác sĩ)
    socket.on("patient-alert", (alertData) => {
      if (userRole === ROLE.BAC_SI) {
        toast.error(`Cảnh báo bệnh nhân: ${alertData.message}`, {
          autoClose: 15000,
          position: "top-center",
        })

        window.dispatchEvent(new CustomEvent("patientAlert", { detail: alertData }))
      }
    })

    // Xử lý cảnh báo gia đình
    socket.on("family-alert", (alertData) => {
      if (userRole === ROLE.GIA_DINH) {
        toast.warning(`Cảnh báo người thân: ${alertData.message}`, {
          autoClose: 12000,
          position: "top-center",
        })

        window.dispatchEvent(new CustomEvent("familyAlert", { detail: alertData }))
      }
    })

    // Xử lý cảnh báo khẩn cấp
    socket.on("emergency-alert", (alertData) => {
      toast.error(`🚨 KHẨN CẤP: ${alertData.message}`, {
        autoClose: false,
        position: "top-center",
        className: "emergency-toast",
      })

      window.dispatchEvent(new CustomEvent("emergencyAlert", { detail: alertData }))
    })

    // Xử lý tin nhắn chat mới
    socket.on("new-chat-message", (messageData) => {
      window.dispatchEvent(new CustomEvent("newChatMessage", { detail: messageData }))
    })

    // Xử lý tin nhắn direct chat bác sĩ - bệnh nhân
    socket.on("direct-message:new", (messageData) => {
      window.dispatchEvent(new CustomEvent("directChatMessage", { detail: messageData }))
    })

    socket.on("direct-message:read", (payload) => {
      window.dispatchEvent(new CustomEvent("directChatRead", { detail: payload }))
    })

    // Xử lý thông báo hệ thống
    socket.on("system-notification", (notification) => {
      toast.info(notification.message, {
        autoClose: 5000,
      })
    })

    // Xử lý cập nhật trạng thái thiết bị
    socket.on("device-status-update", (deviceData) => {
      window.dispatchEvent(new CustomEvent("deviceStatusUpdate", { detail: deviceData }))
    })

    // Xử lý thống kê admin (chỉ cho admin)
    socket.on("admin-stats-update", (stats) => {
      if (userRole === ROLE.ADMIN) {
        window.dispatchEvent(new CustomEvent("adminStatsUpdate", { detail: stats }))
      }
    })

    // Xử lý lỗi kết nối
    socket.on("connect_error", (error) => {
      console.error("Lỗi kết nối Socket.IO:", error)
      toast.error("Mất kết nối real-time. Đang thử kết nối lại...")
    })

    socket.on("disconnect", (reason) => {
      console.log("Ngắt kết nối Socket.IO:", reason)
      if (reason === "io server disconnect") {
        // Server ngắt kết nối, thử kết nối lại
        socket.connect()
      }
    })

    // Cleanup khi component unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [userId, userRole])

  // Các hàm utility để sử dụng socket
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

  return {
    socket: socketRef.current,
    emitEvent,
    requestECGData,
    stopECGStream,
    sendChatMessage,
    sendEmergencyAlert,
    joinDeviceRoom,
  }
}

export default useSocket
