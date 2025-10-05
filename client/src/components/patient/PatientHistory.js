"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import axios from "axios"
import { toast } from "react-toastify"
import ECGChart from "./ECGChart"

const PatientHistory = () => {
  const { user } = useAuth()
  const [readings, setReadings] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    fetchReadings()
  }, [currentPage])

  const fetchReadings = async () => {
    try {
      setLoading(true)
      const offset = (currentPage - 1) * itemsPerPage
      const response = await axios.get(
        `http://localhost:4000/api/readings/history/${user.user_id}?limit=${itemsPerPage}&offset=${offset}`,
      )
      setReadings(response.data.readings)
      setTotalPages(Math.ceil(response.data.total / itemsPerPage) || 1)
    } catch (error) {
      console.error("Lỗi lấy lịch sử:", error)
      toast.error("Không thể tải lịch sử dữ liệu")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("vi-VN")
  }

  const getHeartRateClass = (heartRate) => {
    if (heartRate < 60) return "text-warning"
    if (heartRate > 100) return "text-danger"
    return "text-success"
  }

  const getStatusBadge = (ai_result) => {
    return (
      ai_result == "Normal" ?
        <span className="badge bg-success">{`${ai_result}`}</span>
        :
        <span className="badge bg-danger">{`${ai_result}`}</span>
    )
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

  return (
    <div className="container py-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 mb-0">
              <i className="fas fa-history me-2 text-primary"></i>
              Lịch sử theo dõi
            </h1>
            <button className="btn btn-outline-primary" onClick={fetchReadings}>
              <i className="fas fa-sync-alt me-1"></i>
              Làm mới
            </button>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              {readings.length > 0 ? (
                <>
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>Thời gian</th>
                          <th>Nhịp tim (BPM)</th>
                          <th>Trạng thái</th>
                          <th>Thiết bị</th>
                          <th>Chi tiết</th>
                        </tr>
                      </thead>
                      <tbody>
                        {readings.map((reading) => (
                          <tr key={reading.reading_id}>
                            <td>
                              <small>{formatDate(reading.timestamp)}</small>
                            </td>
                            <td>
                              <span className={`fw-bold ${getHeartRateClass(reading.heart_rate)}`}>
                                {reading.heart_rate}
                              </span>
                            </td>
                            <td>{getStatusBadge(reading.ai_result)}</td>
                            <td>
                              <small className="text-muted">{reading.Device?.serial_number || "N/A"}</small>
                            </td>
                            <td>
                              <button
                                className="btn btn-sm btn-outline-info"
                                data-bs-toggle="modal"
                                data-bs-target={`#modal-${reading.reading_id}`}
                              >
                                <i className="fas fa-eye"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <nav className="mt-4">
                      <ul className="pagination justify-content-center">
                        <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                          <button
                            className="page-link"
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            Trước
                          </button>
                        </li>
                        {[...Array(totalPages)].map((_, index) => (
                          <li key={index + 1} className={`page-item ${currentPage === index + 1 ? "active" : ""}`}>
                            <button className="page-link" onClick={() => setCurrentPage(index + 1)}>
                              {index + 1}
                            </button>
                          </li>
                        ))}
                        <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                          <button
                            className="page-link"
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                          >
                            Sau
                          </button>
                        </li>
                      </ul>
                    </nav>
                  )}
                </>
              ) : (
                <div className="text-center py-5">
                  <i className="fas fa-chart-line fa-3x text-muted mb-3"></i>
                  <h5 className="text-muted">Chưa có dữ liệu theo dõi</h5>
                  <p className="text-muted">Dữ liệu sẽ xuất hiện khi thiết bị Holter bắt đầu ghi nhận</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals for ECG details */}
      {/* Modals for ECG details */}
      {readings.map((reading) => (
        <div key={reading.reading_id} className="modal fade" id={`modal-${reading.reading_id}`} tabIndex="-1">
          <div className="modal-dialog modal-xl"> {/* mở rộng hơn để hiển thị biểu đồ đẹp */}
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-wave-square text-primary me-2"></i>
                  Chi tiết ECG - {formatDate(reading.timestamp)}
                </h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
              </div>

              <div className="modal-body">
                {/* Thông tin tóm tắt */}
                <div className="row mb-3">
                  <div className="col-md-6">
                    <strong>Nhịp tim:</strong>{" "}
                    <span className={getHeartRateClass(reading.heart_rate)}>
                      {reading.heart_rate} BPM
                    </span>
                  </div>
                  <div className="col-md-6">
                    <strong>Dự đoán của AI:</strong> {getStatusBadge(reading.ai_result)}
                  </div>
                </div>

                {/* Đồ thị ECG */}
                <div className="border rounded p-3 bg-light">
                  <h6 className="text-muted mb-3">
                    <i className="fas fa-chart-line me-2 text-danger"></i>
                    Đồ thị tín hiệu ECG
                  </h6>

                  {reading.ecg_signal ? (
                    <ECGChart
                      data={(() => {
                        try {
                          const parsed =
                            typeof reading.ecg_signal === "string"
                              ? JSON.parse(reading.ecg_signal)
                              : reading.ecg_signal
                          return Array.isArray(parsed) ? parsed : []
                        } catch (err) {
                          console.error("❌ Lỗi parse ECG:", err)
                          return []
                        }
                      })()}
                    />
                  ) : (
                    <div className="text-center py-4">
                      <i className="fas fa-exclamation-circle text-warning fa-2x mb-2"></i>
                      <p className="text-muted mb-0">Không có dữ liệu ECG để hiển thị</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

    </div>
  )
}

export default PatientHistory
