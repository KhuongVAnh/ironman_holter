"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import axios from "axios"
import { toast } from "react-toastify"

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

  const getStatusBadge = (abnormal) => {
    return abnormal ? (
      <span className="badge bg-danger">Bất thường</span>
    ) : (
      <span className="badge bg-success">Bình thường</span>
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
                            <td>{getStatusBadge(reading.abnormal_detected)}</td>
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
      {readings.map((reading) => (
        <div key={reading.reading_id} className="modal fade" id={`modal-${reading.reading_id}`} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Chi tiết ECG - {formatDate(reading.timestamp)}</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <strong>Nhịp tim:</strong>{" "}
                    <span className={getHeartRateClass(reading.heart_rate)}>{reading.heart_rate} BPM</span>
                  </div>
                  <div className="col-md-6">
                    <strong>Trạng thái:</strong> {getStatusBadge(reading.abnormal_detected)}
                  </div>
                </div>
                <div className="mb-3">
                  <strong>Dữ liệu ECG:</strong>
                  <div className="mt-2 p-3 bg-light rounded">
                    <small className="text-muted">
                      Tín hiệu ECG gồm {reading.ecg_signal?.length || 0} điểm dữ liệu
                    </small>
                  </div>
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
