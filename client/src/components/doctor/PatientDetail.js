"use client"

import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import axios from "axios"
import { toast } from "react-toastify"
import ECGChart from "../patient/ECGChart"

const PatientDetail = () => {
  const { patientId } = useParams()
  const [patient, setPatient] = useState(null)
  const [readings, setReadings] = useState([])
  const [alerts, setAlerts] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [reportForm, setReportForm] = useState({ summary: "" })

  useEffect(() => {
    fetchPatientData()
  }, [patientId])

  const fetchPatientData = async () => {
    try {
      setLoading(true)

      // Fetch patient info
      const usersResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/users`)
      const patientData = usersResponse.data.users.find((u) => u.user_id === Number.parseInt(patientId))
      setPatient(patientData)

      // Fetch readings
      const readingsResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/readings/history/${patientId}?limit=20`)
      setReadings(readingsResponse.data.readings)

      // Fetch alerts
      const alertsResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/alerts/${patientId}`)
      setAlerts(alertsResponse.data.alerts)

      // Fetch reports
      const reportsResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/reports/${patientId}`)
      setReports(reportsResponse.data.reports)
    } catch (error) {
      console.error("Lỗi tải thông tin bệnh nhân:", error)
      toast.error("Không thể tải thông tin bệnh nhân")
    } finally {
      setLoading(false)
    }
  }

  const createReport = async (e) => {
    e.preventDefault()
    if (!reportForm.summary.trim()) {
      toast.error("Vui lòng nhập nội dung báo cáo")
      return
    }

    try {
      await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/reports/${patientId}`, reportForm)
      toast.success("Tạo báo cáo thành công")
      setReportForm({ summary: "" })
      fetchPatientData() // Refresh data
    } catch (error) {
      console.error("Lỗi tạo báo cáo:", error)
      toast.error("Không thể tạo báo cáo")
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("vi-VN")
  }

  const getLatestReading = () => {
    return readings.length > 0 ? readings[0] : null
  }

  if (loading) {
    return (
      <div className="container py-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle me-2"></i>
          Không tìm thấy thông tin bệnh nhân
        </div>
      </div>
    )
  }

  const latestReading = getLatestReading()

  return (
    <div className="container py-4">
      {/* Patient Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <div className="d-flex align-items-center">
                    <div className="avatar-circle bg-primary text-white me-3" style={{ width: "60px", height: "60px" }}>
                      <span className="fs-4">{patient.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <h2 className="h4 mb-1">{patient.name}</h2>
                      <p className="text-muted mb-1">{patient.email}</p>
                      <span className={`badge ${patient.is_active ? "bg-success" : "bg-secondary"}`}>
                        {patient.is_active ? "Hoạt động" : "Ngưng hoạt động"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="col-md-4 text-end">
                  {latestReading && (
                    <div>
                      <h3 className="text-primary mb-0">{latestReading.heart_rate} BPM</h3>
                      <small className="text-muted">Nhịp tim gần nhất</small>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="row mb-4">
        <div className="col-12">
          <ul className="nav nav-tabs">
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === "overview" ? "active" : ""}`}
                onClick={() => setActiveTab("overview")}
              >
                <i className="fas fa-chart-line me-2"></i>
                Tổng quan
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === "readings" ? "active" : ""}`}
                onClick={() => setActiveTab("readings")}
              >
                <i className="fas fa-heartbeat me-2"></i>
                Dữ liệu ECG
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === "alerts" ? "active" : ""}`}
                onClick={() => setActiveTab("alerts")}
              >
                <i className="fas fa-exclamation-triangle me-2"></i>
                Cảnh báo ({alerts.filter((a) => !a.resolved).length})
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === "reports" ? "active" : ""}`}
                onClick={() => setActiveTab("reports")}
              >
                <i className="fas fa-file-medical me-2"></i>
                Báo cáo
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Tab Content */}
      <div className="row">
        <div className="col-12">
          {activeTab === "overview" && (
            <div className="row g-4">
              <div className="col-md-8">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white border-0">
                    <h5 className="card-title mb-0">Biểu đồ ECG gần nhất</h5>
                  </div>
                  <div className="card-body">
                    {latestReading ? (
                      <ECGChart data={latestReading.ecg_signal || []} />
                    ) : (
                      <div className="text-center py-4">
                        <i className="fas fa-chart-line fa-3x text-muted mb-3"></i>
                        <p className="text-muted">Chưa có dữ liệu ECG</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-header bg-white border-0">
                    <h5 className="card-title mb-0">Thống kê</h5>
                  </div>
                  <div className="card-body">
                    <div className="row text-center">
                      <div className="col-6 border-end">
                        <h4 className="text-primary">{readings.length}</h4>
                        <small className="text-muted">Lần đo</small>
                      </div>
                      <div className="col-6">
                        <h4 className="text-danger">{alerts.filter((a) => !a.resolved).length}</h4>
                        <small className="text-muted">Cảnh báo</small>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white border-0">
                    <h5 className="card-title mb-0">Tạo báo cáo nhanh</h5>
                  </div>
                  <div className="card-body">
                    <form onSubmit={createReport}>
                      <div className="mb-3">
                        <textarea
                          className="form-control"
                          rows="4"
                          placeholder="Nhập nội dung báo cáo..."
                          value={reportForm.summary}
                          onChange={(e) => setReportForm({ summary: e.target.value })}
                        ></textarea>
                      </div>
                      <button type="submit" className="btn btn-success w-100">
                        <i className="fas fa-plus me-1"></i>
                        Tạo báo cáo
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "readings" && (
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                {readings.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>Thời gian</th>
                          <th>Nhịp tim</th>
                          <th>Trạng thái</th>
                          <th>Chi tiết</th>
                        </tr>
                      </thead>
                      <tbody>
                        {readings.map((reading) => (
                          <tr key={reading.reading_id}>
                            <td>{formatDate(reading.timestamp)}</td>
                            <td>
                              <span
                                className={`fw-bold ${reading.heart_rate < 60
                                  ? "text-warning"
                                  : reading.heart_rate > 100
                                    ? "text-danger"
                                    : "text-success"
                                  }`}
                              >
                                {reading.heart_rate} BPM
                              </span>
                            </td>
                            <td>
                              {reading.abnormal_detected ? (
                                <span className="badge bg-danger">Bất thường</span>
                              ) : (
                                <span className="badge bg-success">Bình thường</span>
                              )}
                            </td>
                            <td>
                              <button className="btn btn-outline-info btn-sm">
                                <i className="fas fa-eye"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <i className="fas fa-heartbeat fa-3x text-muted mb-3"></i>
                    <p className="text-muted">Chưa có dữ liệu đo</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "alerts" && (
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                {alerts.length > 0 ? (
                  <div className="row g-3">
                    {alerts.map((alert) => (
                      <div key={alert.alert_id} className="col-md-6">
                        <div className="card border-start border-3 border-danger">
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <h6 className="card-title">{alert.alert_type}</h6>
                              {alert.resolved ? (
                                <span className="badge bg-success">Đã xử lý</span>
                              ) : (
                                <span className="badge bg-danger">Chưa xử lý</span>
                              )}
                            </div>
                            <p className="card-text text-muted">{alert.message}</p>
                            <small className="text-muted">{formatDate(alert.timestamp)}</small>
                          </div>
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
          )}

          {activeTab === "reports" && (
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                {reports.length > 0 ? (
                  <div className="row g-3">
                    {reports.map((report) => (
                      <div key={report.report_id} className="col-12">
                        <div className="card border-0 bg-light">
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <h6 className="card-title">
                                Báo cáo #{report.report_id} - {report.Doctor?.name}
                              </h6>
                              <small className="text-muted">{formatDate(report.created_at)}</small>
                            </div>
                            <p className="card-text">{report.summary}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <i className="fas fa-file-medical fa-3x text-muted mb-3"></i>
                    <p className="text-muted">Chưa có báo cáo nào</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PatientDetail
