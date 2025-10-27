"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { toast } from "react-toastify"
import io from "socket.io-client"
import ECGChart from "./ECGChart"
import useECGStream from "./useECGStream"
import axios from "axios"

const PatientDashboard = () => {
  const { user } = useAuth()
  const [currentHeartRate, setCurrentHeartRate] = useState(75)
  const [rawEcgData, setRawEcgData] = useState([]) // dữ liệu gốc 5s từ ESP32
  const [alerts, setAlerts] = useState([])
  const [recentAlerts, setRecentAlerts] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [socket, setSocket] = useState(null)
  const [aiResult, setAiResult] = useState(null)
  const [supervisingDoctors, setSupervisingDoctors] = useState([])

  useEffect(() => {
    // 🔹 Khởi tạo Socket.IO
    const newSocket = io(process.env.REACT_APP_API_BASE_URL || "http://localhost:4000")
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

    // 🔹 Xử lý dữ liệu ECG (cả thật & giả)
    const handleEcgData = (data) => {
      setCurrentHeartRate(data.heart_rate)
      // ⚙️ Không reset liên tục, chỉ cập nhật nếu có tín hiệu mới thực sự
      if (Array.isArray(data.ecg_signal) && data.ecg_signal.length > 0) {
        setRawEcgData(data.ecg_signal)
      }

      setAiResult({
        result: "bình thường",
        time: data.timestamp,
        hr: data.heart_rate,
      })

      if (data.abnormal_detected) {
        toast.warning(`Phát hiện bất thường: ${data.heart_rate} bpm`)
      }
    }

    newSocket.on("reading-update", handleEcgData)
    newSocket.on("fake-reading", handleEcgData)

    // 🔹 Lắng nghe cảnh báo realtime
    newSocket.on("alert", (alertData) => {
      if (alertData.user_id === user.user_id) {
        toast.error(`Cảnh báo: ${alertData.message}`)
        fetchRecentAlerts()
      }
    })

    // 🔹 Lấy cảnh báo ban đầu
    fetchRecentAlerts()
    fetchSupervisingDoctors()

    return () => {
      newSocket.close()
    }
  }, [user.user_id])

  // 🔹 Mô phỏng dữ liệu chạy từng 0.5s, hiển thị 4s 
  const streamedEcgData = useECGStream(rawEcgData, 250, 0.2)

  // Lấy cảnh báo mới nhất
  const fetchRecentAlerts = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/alerts/${user.user_id}?resolved=false`)
      setAlerts(response.data.alerts)
      console.log(response.data.alerts)
      setRecentAlerts(response.data.alerts.slice(0, 5))
    } catch (error) {
      console.error("Lỗi lấy cảnh báo:", error)
    }
  }

  // Tạo dữ liệu giả
  const generateFakeData = async () => {
    try {
      const deviceId = `device_${user.user_id}`
      await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/readings/fake`, { device_id: deviceId })
      toast.success("Đã tạo dữ liệu giả lập")
    } catch (error) {
      console.error("Lỗi tạo dữ liệu giả:", error)
      toast.error("Không thể tạo dữ liệu giả lập")
    }
  }

  // 🔹 Danh sách bác sĩ giám sát
  const fetchSupervisingDoctors = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/access/list/${user.user_id}`)
      const doctors = res.data
        .filter(acc => acc.role === "bác sĩ" && acc.status === "accepted")
        .map((acc) => ({
          id: acc.viewer_id,
          name: acc.viewer?.name || "Không rõ",
          email: acc.viewer?.email || "—",
          phone: acc.viewer?.phone || "0123456789", // giả định chưa có cột phone
          status: acc.status,
        }))
      setSupervisingDoctors(doctors)
    } catch (error) {
      console.error("❌ Lỗi tải danh sách bác sĩ:", error)
      toast.error("Không thể tải danh sách bác sĩ giám sát")
    }
  }


  // Trạng thái nhịp tim
  const getHeartRateStatus = () => {
    if (currentHeartRate < 60) return { status: "Nhịp chậm", color: "text-warning" }
    if (currentHeartRate > 100) return { status: "Nhịp nhanh", color: "text-danger" }
    return { status: "Bình thường", color: "text-success" }
  }
  const heartRateStatus = getHeartRateStatus()

  const getAlertIcon = (alertType = "") => {
    const type = alertType.toLowerCase();

    switch (type) {
      case "nhịp nhanh":
        return "fas fa-arrow-up text-primary"; // Tim nhanh
      case "rung nhĩ":
        return "fas fa-heart-crack text-danger"; // Rối loạn nhịp
      case "ngoại tâm thu":
        return "fas fa-bolt text-warning"; // Xung điện bất thường
      case "nhịp chậm":
        return "fas fa-arrow-down text-primary"; // Tim chậm
      case "normal":
      case "bình thường":
        return "fas fa-check-circle text-success"; // Bình thường
      default:
        return "fas fa-heartbeat text-danger"; // Không xác định
    }
  };

  const getAlertTextColor = (alertType = "") => {
    const type = alertType.toLowerCase();

    switch (type) {
      case "nhịp nhanh":
        return "text-primary";
      case "rung nhĩ":
        return "text-danger";
      case "ngoại tâm thu":
        return "text-warning";
      case "nhịp chậm":
        return "text-primary";
      case "normal":
      case "bình thường":
        return "text-success";
      default:
        return "text-danger";
    }
  };


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

      {/* Nhịp tim & AI */}
      <div className="row g-4">
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
              <ECGChart data={streamedEcgData} />
            </div>
          </div>
        </div>
      </div>

      {/* Các phần còn lại giữ nguyên */}
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
                  {recentAlerts.map(alert => (
                    <div key={alert.alert_id} className="list-group-item px-0 border-0">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h6 className={`mb-2 fw-semibold d-flex align-items-center gap-2 ${getAlertTextColor(alert.alert_type)}`}>
                            <i className={`${getAlertIcon(alert.alert_type)} fs-5`}></i>
                            {alert.alert_type.toUpperCase()}
                          </h6>
                          <p className="mb-1 text-muted small">{alert.message}</p>
                          <small className="text-muted">
                            {new Date(alert.timestamp).toLocaleString("vi-VN")}
                          </small>
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

        {/* Thống kê + Bác sĩ giám sát cùng khối */}
        <div className="col-md-6">
          {/* Thống kê hôm nay */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white border-0">
              <h5 className="card-title mb-0">
                <i className="fas fa-chart-bar me-2 text-info"></i>
                Thống kê hôm nay
              </h5>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col-4 border-end">
                  <h4 className="text-primary mb-1">24h</h4>
                  <small className="text-muted">Theo dõi</small>
                </div>
                <div className="col-4 border-end">
                  <h4 className="text-success mb-1">98%</h4>
                  <small className="text-muted">Bình thường</small>
                </div>
                <div className="col-4">
                  <h4 className="text-warning mb-1">{alerts.length}</h4>
                  <small className="text-muted">Cảnh báo</small>
                </div>
              </div>
            </div>
          </div>

          {/* Bác sĩ giám sát */}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0">
              <h5 className="card-title mb-0">
                <i className="fas fa-user-md me-2 text-primary"></i>
                Bác sĩ giám sát
              </h5>
            </div>
            <div className="card-body">
              {supervisingDoctors.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-striped align-middle">
                    <thead>
                      <tr>
                        <th>Tên bác sĩ</th>
                        <th>Email</th>
                        <th>Số điện thoại</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supervisingDoctors.map((doc) => (
                        <tr key={doc.id}>
                          <td>{doc.name}</td>
                          <td>{doc.email}</td>
                          <td>{doc.phone}</td>
                          <td>
                            <span className="badge bg-success">{doc.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted text-center mb-0">Chưa có bác sĩ nào đang giám sát bạn.</p>
              )}
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
                    <i className="fas fa-chart-line me-1"></i>Theo dõi ECG realtime
                  </small>
                </div>
                <div className="col-md-3">
                  <small className="text-muted">
                    <i className="fas fa-bell me-1"></i>Nhận cảnh báo tức thì
                  </small>
                </div>
                <div className="col-md-3">
                  <small className="text-muted">
                    <i className="fas fa-comments me-1"></i>Tư vấn với AI
                  </small>
                </div>
                <div className="col-md-3">
                  <small className="text-muted">
                    <i className="fas fa-history me-1"></i>Xem lịch sử chi tiết
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
