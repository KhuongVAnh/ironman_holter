"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { toast } from "react-toastify"
import { readingsApi } from "../../services/api"
import ReadingDetailModal from "../shared/ReadingDetailModal"

const PatientHistory = () => {
  const { user } = useAuth()
  const [readings, setReadings] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedReadingId, setSelectedReadingId] = useState(null)
  const itemsPerPage = 20

  useEffect(() => {
    fetchReadings()
  }, [currentPage])

  const fetchReadings = async () => {
    try {
      setLoading(true)
      const offset = (currentPage - 1) * itemsPerPage
      const response = await readingsApi.getHistory(user.user_id, { limit: itemsPerPage, offset })
      const list = response.data?.readings || []
      const total = response.data?.total ?? list.length

      setReadings(list)
      setTotalPages(Math.max(1, Math.ceil(total / itemsPerPage)))
    } catch (error) {
      console.error("Lỗi lấy lịch sử:", error)
      toast.error("Không thể tải lịch sử dữ liệu")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => new Date(dateString).toLocaleString("vi-VN")

  const getHeartRateClass = (heartRate) => {
    if (heartRate < 60) return "text-warning"
    if (heartRate > 100) return "text-danger"
    return "text-success"
  }

  const getStatusBadge = (aiResult) => {
    if (aiResult === "Normal") {
      return <span className="badge bg-success">{aiResult}</span>
    }
    return <span className="badge bg-danger">{aiResult}</span>
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
                              <small className="text-muted">{reading.device?.serial_number || reading.Device?.serial_number || "N/A"}</small>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-info"
                                onClick={() => setSelectedReadingId(reading.reading_id)}
                              >
                                <i className="fas fa-eye"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

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

      <ReadingDetailModal
        show={Boolean(selectedReadingId)}
        readingId={selectedReadingId}
        onHide={() => setSelectedReadingId(null)}
      />
    </div>
  )
}

export default PatientHistory