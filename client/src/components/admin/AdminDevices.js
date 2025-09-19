"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { toast } from "react-toastify"

const AdminDevices = () => {
  const [devices, setDevices] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({
    device_id: "",
    serial_number: "",
    user_id: "",
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [devicesResponse, usersResponse] = await Promise.all([
        axios.get("http://localhost:4000/api/devices"),
        axios.get("http://localhost:4000/api/users"),
      ])

      setDevices(devicesResponse.data.devices)
      setUsers(usersResponse.data.users.filter((u) => u.role === "bệnh nhân"))
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error)
      toast.error("Không thể tải dữ liệu thiết bị")
    } finally {
      setLoading(false)
    }
  }

  const handleAddDevice = async (e) => {
    e.preventDefault()
    try {
      await axios.post("http://localhost:4000/api/devices/register", addForm)
      toast.success("Đăng ký thiết bị thành công")
      setShowAddModal(false)
      setAddForm({ device_id: "", serial_number: "", user_id: "" })
      fetchData()
    } catch (error) {
      console.error("Lỗi đăng ký thiết bị:", error)
      toast.error(error.response?.data?.message || "Không thể đăng ký thiết bị")
    }
  }

  const updateDeviceStatus = async (deviceId, newStatus) => {
    try {
      await axios.put(`http://localhost:4000/api/devices/${deviceId}/status`, { status: newStatus })
      toast.success("Cập nhật trạng thái thiết bị thành công")
      fetchData()
    } catch (error) {
      console.error("Lỗi cập nhật thiết bị:", error)
      toast.error("Không thể cập nhật trạng thái thiết bị")
    }
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
              <i className="fas fa-microchip me-2 text-success"></i>
              Quản lý thiết bị
            </h1>
            <div className="d-flex gap-2">
              <button className="btn btn-success" onClick={() => setShowAddModal(true)}>
                <i className="fas fa-plus me-1"></i>
                Thêm thiết bị
              </button>
              <button className="btn btn-outline-primary" onClick={fetchData}>
                <i className="fas fa-sync-alt me-1"></i>
                Làm mới
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="row g-4 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-primary text-white">
            <div className="card-body text-center">
              <i className="fas fa-microchip fa-2x mb-2"></i>
              <h3 className="h4 mb-1">{devices.length}</h3>
              <p className="mb-0 small">Tổng thiết bị</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-success text-white">
            <div className="card-body text-center">
              <i className="fas fa-check-circle fa-2x mb-2"></i>
              <h3 className="h4 mb-1">{devices.filter((d) => d.status === "đang hoạt động").length}</h3>
              <p className="mb-0 small">Đang hoạt động</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-secondary text-white">
            <div className="card-body text-center">
              <i className="fas fa-pause-circle fa-2x mb-2"></i>
              <h3 className="h4 mb-1">{devices.filter((d) => d.status === "ngưng hoạt động").length}</h3>
              <p className="mb-0 small">Ngưng hoạt động</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-info text-white">
            <div className="card-body text-center">
              <i className="fas fa-users fa-2x mb-2"></i>
              <h3 className="h4 mb-1">{users.length}</h3>
              <p className="mb-0 small">Bệnh nhân</p>
            </div>
          </div>
        </div>
      </div>

      {/* Devices Table */}
      <div className="row">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              {devices.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-light">
                      <tr>
                        <th>ID Thiết bị</th>
                        <th>Số serial</th>
                        <th>Bệnh nhân</th>
                        <th>Trạng thái</th>
                        <th>Ngày đăng ký</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {devices.map((device) => (
                        <tr key={device.device_id}>
                          <td>
                            <code className="text-primary">{device.device_id}</code>
                          </td>
                          <td>
                            <strong>{device.serial_number}</strong>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="avatar-circle bg-primary text-white me-2">
                                {device.User?.name?.charAt(0).toUpperCase() || "?"}
                              </div>
                              <div>
                                <h6 className="mb-0">{device.User?.name || "Không xác định"}</h6>
                                <small className="text-muted">{device.User?.email}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            {device.status === "đang hoạt động" ? (
                              <span className="badge bg-success">
                                <i className="fas fa-check-circle me-1"></i>
                                Đang hoạt động
                              </span>
                            ) : (
                              <span className="badge bg-secondary">
                                <i className="fas fa-pause-circle me-1"></i>
                                Ngưng hoạt động
                              </span>
                            )}
                          </td>
                          <td>{formatDate(device.created_at)}</td>
                          <td>
                            <div className="btn-group" role="group">
                              {device.status === "đang hoạt động" ? (
                                <button
                                  className="btn btn-outline-warning btn-sm"
                                  onClick={() => updateDeviceStatus(device.device_id, "ngưng hoạt động")}
                                  title="Tạm dừng"
                                >
                                  <i className="fas fa-pause"></i>
                                </button>
                              ) : (
                                <button
                                  className="btn btn-outline-success btn-sm"
                                  onClick={() => updateDeviceStatus(device.device_id, "đang hoạt động")}
                                  title="Kích hoạt"
                                >
                                  <i className="fas fa-play"></i>
                                </button>
                              )}
                              <button className="btn btn-outline-info btn-sm" title="Chi tiết">
                                <i className="fas fa-info-circle"></i>
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
                  <i className="fas fa-microchip fa-3x text-muted mb-3"></i>
                  <h5 className="text-muted">Chưa có thiết bị nào</h5>
                  <p className="text-muted">Hãy thêm thiết bị đầu tiên để bắt đầu theo dõi</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Device Modal */}
      {showAddModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-plus me-2"></i>
                  Thêm thiết bị mới
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleAddDevice}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="deviceId" className="form-label">
                      ID Thiết bị
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="deviceId"
                      value={addForm.device_id}
                      onChange={(e) => setAddForm({ ...addForm, device_id: e.target.value })}
                      placeholder="VD: HOLTER_001"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="serialNumber" className="form-label">
                      Số Serial
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="serialNumber"
                      value={addForm.serial_number}
                      onChange={(e) => setAddForm({ ...addForm, serial_number: e.target.value })}
                      placeholder="VD: SN123456789"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="userId" className="form-label">
                      Bệnh nhân
                    </label>
                    <select
                      className="form-select"
                      id="userId"
                      value={addForm.user_id}
                      onChange={(e) => setAddForm({ ...addForm, user_id: e.target.value })}
                      required
                    >
                      <option value="">Chọn bệnh nhân</option>
                      {users.map((user) => (
                        <option key={user.user_id} value={user.user_id}>
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-success">
                    <i className="fas fa-plus me-1"></i>
                    Thêm thiết bị
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDevices
