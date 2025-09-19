"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { toast } from "react-toastify"

const DoctorReports = () => {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      setLoading(true)
      const response = await axios.get("http://localhost:4000/api/reports/doctor/my-reports")
      setReports(response.data.reports)
    } catch (error) {
      console.error("Lỗi lấy báo cáo:", error)
      toast.error("Không thể tải danh sách báo cáo")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("vi-VN")
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
              <i className="fas fa-file-medical me-2 text-success"></i>
              Báo cáo của tôi
            </h1>
            <button className="btn btn-outline-primary" onClick={fetchReports}>
              <i className="fas fa-sync-alt me-1"></i>
              Làm mới
            </button>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          {reports.length > 0 ? (
            <div className="row g-4">
              {reports.map((report) => (
                <div key={report.report_id} className="col-md-6 col-lg-4">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <h6 className="card-title">Báo cáo #{report.report_id}</h6>
                        <small className="text-muted">{formatDate(report.created_at)}</small>
                      </div>

                      <div className="mb-3">
                        <strong>Bệnh nhân:</strong>
                        <div className="text-muted">{report.Patient?.name}</div>
                        <small className="text-muted">{report.Patient?.email}</small>
                      </div>

                      <div className="mb-3">
                        <strong>Nội dung:</strong>
                        <p className="text-muted mt-1" style={{ fontSize: "0.9rem" }}>
                          {report.summary.length > 150 ? `${report.summary.substring(0, 150)}...` : report.summary}
                        </p>
                      </div>

                      <div className="d-flex justify-content-between align-items-center">
                        <span className="badge bg-success">Đã hoàn thành</span>
                        <button className="btn btn-outline-primary btn-sm">
                          <i className="fas fa-eye me-1"></i>
                          Xem chi tiết
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center py-5">
                <i className="fas fa-file-medical fa-3x text-muted mb-3"></i>
                <h5 className="text-muted">Chưa có báo cáo nào</h5>
                <p className="text-muted">Bạn chưa tạo báo cáo nào. Hãy vào trang quản lý bệnh nhân để tạo báo cáo.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DoctorReports
