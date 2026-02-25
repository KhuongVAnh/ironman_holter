"use client"

import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import io from "socket.io-client"
import { useAuth } from "../../contexts/AuthContext"
import { accessApi, alertsApi, devicesApi, readingsApi } from "../../services/api"
import { ACCESS_ROLE, ACCESS_STATUS } from "../../services/string"
import ECGChart from "./ECGChart"
import useECGStream from "./useECGStream"
import ReadingDetailModal from "../shared/ReadingDetailModal"
import RecentAlertsPanel, { getAlertTypeLabel } from "../shared/RecentAlertsPanel"

const PatientDashboard = () => {
  const { user } = useAuth()
  const [currentHeartRate, setCurrentHeartRate] = useState(75)
  const [rawEcgData, setRawEcgData] = useState([])
  const [alerts, setAlerts] = useState([])
  const [recentAlerts, setRecentAlerts] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [supervisingDoctors, setSupervisingDoctors] = useState([])
  const [selectedReadingId, setSelectedReadingId] = useState(null)

  useEffect(() => {
    const socketClient = io(process.env.REACT_APP_API_BASE_URL || "http://localhost:4000")

    socketClient.on("connect", () => {
      setIsConnected(true)
      socketClient.emit("join-user-room", user.user_id)
      console.log("Đã kết nối Socket.IO")
    })

    socketClient.on("disconnect", () => {
      setIsConnected(false)
      console.log("Ngắt kết nối Socket.IO")
    })

    const handleEcgData = (data) => {
      setCurrentHeartRate(data.heart_rate)
      if (Array.isArray(data.ecg_signal) && data.ecg_signal.length > 0) {
        setRawEcgData(data.ecg_signal)
      }

      setAiResult({
        result: "Bình thường",
        time: data.timestamp,
        hr: data.heart_rate,
      })

      if (data.abnormal_detected) {
        toast.warning(`Phát hiện bất thường: ${data.heart_rate} bpm`)
      }
    }

    const handleAlert = (alertData) => {
      if (alertData.user_id === user.user_id) {
        toast.error(`Cảnh báo: ${alertData.message}`)
        fetchRecentAlerts()
      }
    }

    socketClient.on("reading-update", handleEcgData)
    socketClient.on("fake-reading", handleEcgData)
    socketClient.on("alert", handleAlert)

    fetchRecentAlerts()
    fetchSupervisingDoctors()

    return () => {
      socketClient.off("reading-update", handleEcgData)
      socketClient.off("fake-reading", handleEcgData)
      socketClient.off("alert", handleAlert)
      socketClient.close()
    }
  }, [user.user_id])

  const streamedEcgData = useECGStream(rawEcgData, 250, 0.2)

  const fetchRecentAlerts = async () => {
    try {
      const response = await alertsApi.getByUser(user.user_id, false)
      const nextAlerts = Array.isArray(response.data?.alerts) ? response.data.alerts : []
      setAlerts(nextAlerts)
      setRecentAlerts(nextAlerts.slice(0, 5))
    } catch (error) {
      console.error("Lỗi lấy cảnh báo:", error)
    }
  }

  const generateFakeData = async () => {
    try {
      const deviceResponse = await devicesApi.getByUser(user.user_id)
      const devices = deviceResponse?.data?.devices || []
      if (devices.length === 0) {
        toast.error("Không tìm thấy thiết bị của bạn")
        return
      }
      const deviceId = devices[0].device_id
      await readingsApi.createFake(deviceId)
      toast.success("Đã tạo dữ liệu giả lập")
    } catch (error) {
      console.error("Lỗi tạo dữ liệu giả:", error)
      toast.error("Không thể tạo dữ liệu giả lập")
    }
  }

  const fetchSupervisingDoctors = async () => {
    try {
      const res = await accessApi.list(user.user_id)
      const doctors = res.data
        .filter((acc) => acc.role === ACCESS_ROLE.BAC_SI && acc.status === ACCESS_STATUS.ACCEPTED)
        .map((acc) => ({
          id: acc.viewer_id,
          name: acc.viewer?.name || "Không rõ",
          email: acc.viewer?.email || "-",
          phone: acc.viewer?.phone || "0123456789",
          status: acc.status,
        }))
      setSupervisingDoctors(doctors)
    } catch (error) {
      console.error("Lỗi tải danh sách bác sĩ:", error)
      toast.error("Không thể tải danh sách bác sĩ giám sát")
    }
  }

  const getHeartRateStatus = () => {
    if (currentHeartRate < 60) return { status: "Nhịp chậm", color: "text-warning" }
    if (currentHeartRate > 100) return { status: "Nhịp nhanh", color: "text-danger" }
    return { status: "Bình thường", color: "text-success" }
  }

  const heartRateStatus = getHeartRateStatus()

  const handleOpenReadingDetail = (alert) => {
    if (!alert?.reading_id) {
      toast.warning("Cảnh báo này không có reading để xem")
      return
    }
    setSelectedReadingId(alert.reading_id)
  }

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 mb-0">
              <i className="fas fa-tachometer-alt me-2 text-primary"></i>
              Dashboard bệnh nhân
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

              <div className="mt-4">
                <div className="card border-0 bg-light">
                  <div className="card-body p-2">
                    <h6 className="text-muted mb-1">
                      <i className="fas fa-robot me-2 text-success"></i>
                      Kết quả AI
                    </h6>
                    {aiResult ? (
                      <p className="fw-bold small mb-0">
                        HR: {aiResult.hr} | AI: {aiResult.result}
                        <br />
                        <small className="text-muted">{new Date(aiResult.time).toLocaleString("vi-VN")}</small>
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

      <div className="row g-4 mt-2">
        <div className="col-md-6">
          <RecentAlertsPanel
            title="Cảnh báo gần nhất"
            subtitle="Ưu tiên xử lý cảnh báo nguy cơ cao trước."
            alerts={recentAlerts}
            onAlertClick={handleOpenReadingDetail}
            getAlertTitle={(alert) => getAlertTypeLabel(alert.alert_type)}
            getAlertStatus={(alert) =>
              alert?.resolved
                ? { label: "Đã xử lý", variant: "is-resolved" }
                : { label: "Mới", variant: "is-pending" }
            }
            getAlertHint={(_alert, disabled) => (disabled ? "Không có reading" : "Nhấn để xem đồ thị ECG")}
            emptyText="Không có cảnh báo nào"
          />
        </div>

        <div className="col-md-6">
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

      <ReadingDetailModal
        show={Boolean(selectedReadingId)}
        readingId={selectedReadingId}
        onHide={() => setSelectedReadingId(null)}
      />
    </div>
  )
}

export default PatientDashboard
