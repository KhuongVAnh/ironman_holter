"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { toast } from "react-toastify"
import io from "socket.io-client"
import ECGChart from "./ECGChart"
import axios from "axios"

const PatientDashboard = () => {
  const { user } = useAuth()
  const [currentHeartRate, setCurrentHeartRate] = useState(75)
  const [ecgData, setEcgData] = useState([])
  const [recentAlerts, setRecentAlerts] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [socket, setSocket] = useState(null)
  const [aiResult, setAiResult] = useState(null)

  useEffect(() => {
    // Khởi tạo Socket.IO connection
    const newSocket = io("http://localhost:4000")
    setSocket(newSocket)

    newSocket.on("connect", () => {
      setIsConnected(true)
      newSocket.emit("join-user-room", user.user_id)
      console.log("Đã kết nối Socket.IO")
    })

    newSocket.on("disconnect", () => {
      setIsConnected(false)
      console.log("Ngắt kết nối Socket.IO")
    })

    // Lắng nghe dữ liệu ECG realtime
    newSocket.on("reading-update", (data) => {
      setCurrentHeartRate(data.heart_rate)
      setEcgData(data.ecg_signal)

      setAiResult({
        result: data.ai_result,
        time: data.timestamp,
        hr: data.heart_rate
      })

      if (data.abnormal_detected) {
        toast.warning(`Phát hiện bất thường: ${data.heart_rate} bpm`)
      }
    })

    // lắng nghe fake data
    newSocket.on("fake-reading", (data) => {
      setCurrentHeartRate(data.heart_rate)
      setEcgData(data.ecg_signal)

      setAiResult({
        result: data.ai_result,
        time: data.timestamp,
        hr: data.heart_rate
      })

      if (data.abnormal_detected) {
        toast.warning(`Phát hiện bất thường: ${data.heart_rate} bpm`)
      }
    })

    // Lắng nghe cảnh báo realtime
    newSocket.on("alert", (alertData) => {
      if (alertData.user_id === user.user_id) {
        toast.error(`Cảnh báo: ${alertData.message}`)
        fetchRecentAlerts()
      }
    })

    // Fetch dữ liệu ban đầu
    fetchRecentAlerts()

    return () => {
      newSocket.close()
    }
  }, [user.user_id])

  const fetchRecentAlerts = async () => {
    try {
      const response = await axios.get(`http://localhost:4000/api/alerts/${user.user_id}?resolved=false`)
      setRecentAlerts(response.data.alerts.slice(0, 5))
    } catch (error) {
      console.error("Lỗi lấy cảnh báo:", error)
    }
  }

  const generateFakeData = async () => {
    try {
      // Giả sử có device_id mặc định
      const deviceId = `device_${user.user_id}`
      const res = await axios.post("http://localhost:4000/api/readings/fake", {
        device_id: deviceId,
      })

      console.log(res)
      toast.success("Đã tạo dữ liệu giả lập")
    } catch (error) {
      console.error("Lỗi tạo dữ liệu giả:", error)
      toast.error("Không thể tạo dữ liệu giả lập")
    }
  }

  const getHeartRateStatus = () => {
    if (currentHeartRate < 60) return { status: "Nhịp chậm", color: "text-warning" }
    if (currentHeartRate > 100) return { status: "Nhịp nhanh", color: "text-danger" }
    return { status: "Bình thường", color: "text-success" }
  }

  const heartRateStatus = getHeartRateStatus()

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 mb-0">
              <i className="fas fa-tachometer-alt me-2 text-primary"></i>
              Dashboard Bệnh nhân
            </h1>
            <div className="d-flex align-items-center gap-3">
              <div className={`badge ${isConnected ? "bg-success" : "bg-danger"}`}>
                <i className={`fas ${isConnected ? "fa-wifi" : "fa-wifi-slash"} me-1`}></i>
                {isConnected ? "Đã kết nối" : "Mất kết nối"}
              </div>
              <button className="btn btn-outline-primary btn-sm" onClick={generateFakeData}>
                <i className="fas fa-play me-1"></i>
                Tạo dữ liệu giả
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Thông tin nhịp tim hiện tại */}
        <div className="col-md-4">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body text-center">
              <div className="mb-3">
                <i className="fas fa-heartbeat fa-3x text-danger"></i>
              </div>
              <h2 className="display-4 fw-bold mb-2">{currentHeartRate}</h2>
              <p className="text-muted mb-2">BPM</p>
              <span className={`badge fs-6 ${heartRateStatus.color.replace("text-", "bg-")}`}>
                {heartRateStatus.status}
              </span>

              {/* Kết quả AI */}
              <div className="mt-4">
                <div className="card border-0 bg-light">
                  <div className="card-body p-2">
                    <h6 className="text-muted mb-1">
                      <i className="fas fa-robot me-2 text-success"></i>Kết quả AI
                    </h6>
                    {aiResult ? (
                      <p className="fw-bold small mb-0">
                        HR: {aiResult.hr} | AI: {aiResult.result} <br />
                        <small className="text-muted">
                          {new Date(aiResult.time).toLocaleString("vi-VN")}
                        </small>
                      </p>
                    ) : (
                      <p className="text-muted small mb-0">Đang chờ dữ liệu...</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Biểu đồ ECG */}
        <div className="col-md-8">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-header bg-white border-0">
              <h5 className="card-title mb-0">
                <i className="fas fa-chart-line me-2 text-primary"></i>
                Biểu đồ ECG Realtime
              </h5>
            </div>
            <div className="card-body">
              <ECGChart data={ecgData} />
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mt-2">
        {/* Cảnh báo gần nhất */}
        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0">
              <h5 className="card-title mb-0">
                <i className="fas fa-exclamation-triangle me-2 text-warning"></i>
                Cảnh báo gần nhất
              </h5>
            </div>
            <div className="card-body">
              {recentAlerts.length > 0 ? (
                <div className="list-group list-group-flush">
                  {recentAlerts.map((alert) => (
                    <div key={alert.alert_id} className="list-group-item px-0 border-0">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h6 className="mb-1 text-danger">{alert.alert_type}</h6>
                          <p className="mb-1 text-muted small">{alert.message}</p>
                          <small className="text-muted">{new Date(alert.timestamp).toLocaleString("vi-VN")}</small>
                        </div>
                        <span className="badge bg-danger">Mới</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-check-circle fa-3x text-success mb-3"></i>
                  <p className="text-muted">Không có cảnh báo nào</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Thống kê nhanh */}
        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0">
              <h5 className="card-title mb-0">
                <i className="fas fa-chart-bar me-2 text-info"></i>
                Thống kê hôm nay
              </h5>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col-4">
                  <div className="border-end">
                    <h4 className="text-primary mb-1">24h</h4>
                    <small className="text-muted">Theo dõi</small>
                  </div>
                </div>
                <div className="col-4">
                  <div className="border-end">
                    <h4 className="text-success mb-1">98%</h4>
                    <small className="text-muted">Bình thường</small>
                  </div>
                </div>
                <div className="col-4">
                  <h4 className="text-warning mb-1">{recentAlerts.length}</h4>
                  <small className="text-muted">Cảnh báo</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hướng dẫn nhanh */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm bg-light">
            <div className="card-body">
              <h6 className="card-title">
                <i className="fas fa-info-circle me-2 text-info"></i>
                Hướng dẫn sử dụng
              </h6>
              <div className="row">
                <div className="col-md-3">
                  <small className="text-muted">
                    <i className="fas fa-chart-line me-1"></i>
                    Theo dõi ECG realtime
                  </small>
                </div>
                <div className="col-md-3">
                  <small className="text-muted">
                    <i className="fas fa-bell me-1"></i>
                    Nhận cảnh báo tức thì
                  </small>
                </div>
                <div className="col-md-3">
                  <small className="text-muted">
                    <i className="fas fa-comments me-1"></i>
                    Tư vấn với AI
                  </small>
                </div>
                <div className="col-md-3">
                  <small className="text-muted">
                    <i className="fas fa-history me-1"></i>
                    Xem lịch sử chi tiết
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PatientDashboard
