"use client"

import { useState, useEffect } from "react"
import { toast } from "react-toastify"
import { devicesApi, usersApi } from "../../services/api"
import { DEVICE_STATUS, ROLE } from "../../services/string"

const AdminDevices = () => {
  const [devices, setDevices] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({
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
        devicesApi.getAll(),
        usersApi.getAll(),
      ])

      setDevices(devicesResponse.data.devices)
      setUsers(usersResponse.data.users.filter((u) => u.role === ROLE.BENH_NHAN))
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
      await devicesApi.register(addForm)
      toast.success("Đăng ký thiết bị thành công")
      setShowAddModal(false)
      setAddForm({ serial_number: "", user_id: "" })
      fetchData()
    } catch (error) {
      console.error("Lỗi đăng ký thiết bị:", error)
      toast.error(error.response?.data?.message || "Không thể đăng ký thiết bị")
    }
  }

  const updateDeviceStatus = async (deviceId, newStatus) => {
    try {
      await devicesApi.updateStatus(deviceId, newStatus)
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
      <div className="page-shell">
        <div className="empty-state-rich">
          <div className="empty-state-rich-icon info"><i className="fas fa-spinner fa-spin"></i></div>
          <h3>Đang tải thiết bị</h3>
          <p>Hệ thống đang lấy danh sách thiết bị ECG.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="page-hero-icon"><i className="fas fa-microchip"></i></div>
        <div className="min-w-0 flex-1">
          <p className="panel-eyebrow">Device operations</p>
          <h1 className="page-hero-title">Quản lý thiết bị</h1>
          <p className="page-hero-subtitle">Theo dõi serial, bệnh nhân sở hữu và trạng thái hoạt động của thiết bị ECG.</p>
        </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-success" onClick={() => setShowAddModal(true)}>
                <i className="fas fa-plus me-1"></i>
                Thêm thiết bị
              </button>
              <button className="btn btn-outline-primary" onClick={fetchData}>
                <i className="fas fa-sync-alt me-1"></i>
                Làm mới
              </button>
            </div>
      </section>

      {/* Statistics */}
      <section className="metric-grid">
        <div className="priority-metric metric-info"><div className="metric-icon"><i className="fas fa-microchip"></i></div><p className="metric-label">Tổng thiết bị</p><p className="metric-value">{devices.length}</p><p className="metric-helper">Đã đăng ký</p></div>
        <div className="priority-metric metric-success"><div className="metric-icon"><i className="fas fa-check-circle"></i></div><p className="metric-label">Đang hoạt động</p><p className="metric-value">{devices.filter((d) => d.status === DEVICE_STATUS.DANG_HOAT_DONG).length}</p><p className="metric-helper">Đang gửi dữ liệu</p></div>
        <div className="priority-metric metric-warning"><div className="metric-icon"><i className="fas fa-pause-circle"></i></div><p className="metric-label">Ngưng hoạt động</p><p className="metric-value">{devices.filter((d) => d.status === DEVICE_STATUS.NGUNG_HOAT_DONG).length}</p><p className="metric-helper">Cần kiểm tra</p></div>
        <div className="priority-metric metric-brand"><div className="metric-icon"><i className="fas fa-users"></i></div><p className="metric-label">Bệnh nhân</p><p className="metric-value">{users.length}</p><p className="metric-helper">Có thể gán thiết bị</p></div>
      </section>

      {/* Devices Table */}
      <section className="clinical-panel overflow-hidden">
        <div className="clinical-panel-header"><div><h2 className="section-title">Danh sách thiết bị</h2><p className="section-subtitle">Trạng thái vận hành được nhấn bằng chip màu.</p></div></div>
        <div className="clinical-panel-body">
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
                                {device.user?.name?.charAt(0).toUpperCase() || "?"}
                              </div>
                              <div>
                                <h6 className="mb-0">{device.user?.name || "Không xác định"}</h6>
                                <small className="text-muted">{device.user?.email}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            {device.status === DEVICE_STATUS.DANG_HOAT_DONG ? (
                              <span className="status-chip is-success">
                                <i className="fas fa-check-circle me-1"></i>
                                Đang hoạt động
                              </span>
                            ) : (
                              <span className="status-chip is-neutral">
                                <i className="fas fa-pause-circle me-1"></i>
                                Ngưng hoạt động
                              </span>
                            )}
                          </td>
                          <td>{formatDate(device.created_at)}</td>
                          <td>
                            <div className="btn-group" role="group">
                              {device.status === DEVICE_STATUS.DANG_HOAT_DONG ? (
                                <button
                                  className="btn btn-outline-warning btn-sm"
                                  onClick={() => updateDeviceStatus(device.device_id, DEVICE_STATUS.NGUNG_HOAT_DONG)}
                                  title="Tạm dừng"
                                >
                                  <i className="fas fa-pause"></i>
                                </button>
                              ) : (
                                <button
                                  className="btn btn-outline-success btn-sm"
                                  onClick={() => updateDeviceStatus(device.device_id, DEVICE_STATUS.DANG_HOAT_DONG)}
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
                <div className="empty-state-rich">
                  <div className="empty-state-rich-icon info"><i className="fas fa-microchip"></i></div>
                  <h3>Chưa có thiết bị nào</h3>
                  <p>Hãy thêm thiết bị đầu tiên để bắt đầu theo dõi.</p>
                </div>
              )}
        </div>
      </section>

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
