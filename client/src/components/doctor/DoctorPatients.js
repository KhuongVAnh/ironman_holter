"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import axios from "axios"
import { toast } from "react-toastify"

const DoctorPatients = () => {
  const [patients, setPatients] = useState([])
  const [filteredPatients, setFilteredPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    fetchPatients()
  }, [])

  useEffect(() => {
    filterPatients()
  }, [patients, searchTerm, statusFilter])

  const fetchPatients = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/users`)
      const allPatients = response.data.users.filter((user) => user.role === "bệnh nhân")
      setPatients(allPatients)
    } catch (error) {
      console.error("Lỗi lấy danh sách bệnh nhân:", error)
      toast.error("Không thể tải danh sách bệnh nhân")
    } finally {
      setLoading(false)
    }
  }

  const filterPatients = () => {
    let filtered = patients

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (patient) =>
          patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          patient.email.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((patient) => {
        if (statusFilter === "active") return patient.is_active
        if (statusFilter === "inactive") return !patient.is_active
        return true
      })
    }

    setFilteredPatients(filtered)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("vi-VN")
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
              <i className="fas fa-users me-2 text-primary"></i>
              Quản lý bệnh nhân
            </h1>
            <button className="btn btn-outline-primary" onClick={fetchPatients}>
              <i className="fas fa-sync-alt me-1"></i>
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="input-group">
            <span className="input-group-text">
              <i className="fas fa-search"></i>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Tìm kiếm theo tên hoặc email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="col-md-3">
          <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Ngưng hoạt động</option>
          </select>
        </div>
        <div className="col-md-3">
          <div className="text-muted">
            Tổng: <strong>{filteredPatients.length}</strong> bệnh nhân
          </div>
        </div>
      </div>

      {/* Patients Table */}
      <div className="row">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              {filteredPatients.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-light">
                      <tr>
                        <th>Bệnh nhân</th>
                        <th>Email</th>
                        <th>Trạng thái</th>
                        <th>Ngày đăng ký</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPatients.map((patient) => (
                        <tr key={patient.user_id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="avatar-circle bg-primary text-white me-3">
                                {patient.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h6 className="mb-0">{patient.name}</h6>
                                <small className="text-muted">ID: {patient.user_id}</small>
                              </div>
                            </div>
                          </td>
                          <td>{patient.email}</td>
                          <td>
                            {patient.is_active ? (
                              <span className="badge bg-success">
                                <i className="fas fa-check-circle me-1"></i>
                                Hoạt động
                              </span>
                            ) : (
                              <span className="badge bg-secondary">
                                <i className="fas fa-pause-circle me-1"></i>
                                Ngưng
                              </span>
                            )}
                          </td>
                          <td>{formatDate(patient.created_at)}</td>
                          <td>
                            <div className="btn-group" role="group">
                              <Link
                                to={`/doctor/patient/${patient.user_id}`}
                                className="btn btn-outline-primary btn-sm"
                                title="Xem chi tiết"
                              >
                                <i className="fas fa-eye"></i>
                              </Link>
                              <button
                                className="btn btn-outline-success btn-sm"
                                title="Tạo báo cáo"
                                onClick={() => {
                                  // Navigate to create report
                                  window.location.href = `/doctor/patient/${patient.user_id}#create-report`
                                }}
                              >
                                <i className="fas fa-file-medical"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-5">
                  <i className="fas fa-user-friends fa-3x text-muted mb-3"></i>
                  <h5 className="text-muted">Không tìm thấy bệnh nhân nào</h5>
                  <p className="text-muted">
                    {searchTerm || statusFilter !== "all"
                      ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm"
                      : "Chưa có bệnh nhân nào trong hệ thống"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DoctorPatients
