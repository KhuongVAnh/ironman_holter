"use client"

import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import { useAuth } from "../../contexts/AuthContext"
import { devicesApi } from "../../services/api"

const PatientDeviceRegistration = () => {
  const { user } = useAuth()

  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    serial_number: "",
  })

  useEffect(() => {
    if (!user?.user_id) return
    fetchDevices()
  }, [user?.user_id])

  const fetchDevices = async () => {
    if (!user?.user_id) return
    try {
      setLoading(true)
      const response = await devicesApi.getByUser(user.user_id)
      setDevices(response.data?.devices || [])
    } catch (error) {
      console.error("Lỗi lấy danh sách thiết bị:", error)
      toast.error("Không thể tải danh sách thiết bị")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const serial = formData.serial_number.trim()

    if (!serial) {
      toast.error("Vui lòng nhập mã serial")
      return
    }

    try {
      setSubmitting(true)
      await devicesApi.register({
        serial_number: serial,
        user_id: user.user_id,
      })
      toast.success("Đăng ký thiết bị thành công")
      setFormData({ serial_number: "" })
      await fetchDevices()
    } catch (error) {
      console.error("Lỗi đăng ký thiết bị:", error)
      toast.error(error.response?.data?.message || "Không thể đăng ký thiết bị")
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (value) => {
    if (!value) return "-"
    return new Date(value).toLocaleString("vi-VN")
  }

  const renderStatus = (status = "") => {
    const normalized = String(status).toLowerCase()
    const isActive = normalized.includes("dang") || normalized.includes("đang")
    return (
      <span className={`badge ${isActive ? "bg-success" : "bg-secondary"}`}>
        {status || "Không xác định"}
      </span>
    )
  }

  return (
    <div className="container py-4">
      <div className="row g-4">
        <div className="col-12">
          <h1 className="h3 mb-0">
            <i className="fas fa-microchip me-2 text-primary"></i>
            Đăng ký thiết bị
          </h1>
          <small className="text-muted">Mỗi thiết bị phải có mã serial duy nhất.</small>
        </div>

        <div className="col-12 col-lg-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0">
              <h5 className="mb-0">
                <i className="fas fa-plus-circle me-2 text-success"></i>
                Thêm thiết bị mới
              </h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="serial_number" className="form-label">
                    Mã serial
                  </label>
                  <input
                    id="serial_number"
                    name="serial_number"
                    type="text"
                    className="form-control"
                    placeholder="VD: SN-ECG-0002"
                    value={formData.serial_number}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check me-2"></i>
                      Đăng ký thiết bị
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="fas fa-list me-2 text-info"></i>
                Thiết bị của bạn
              </h5>
              <button className="btn btn-outline-primary btn-sm" onClick={fetchDevices} disabled={loading}>
                <i className="fas fa-sync-alt me-1"></i>
                Làm mới
              </button>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="d-flex justify-content-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Đang tải...</span>
                  </div>
                </div>
              ) : devices.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-microchip fa-3x text-muted mb-3"></i>
                  <h6 className="text-muted">Bạn chưa có thiết bị nào</h6>
                  <p className="text-muted mb-0">Nhập thông tin để đăng ký thiết bị đầu tiên.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>#</th>
                        <th>Mã thiết bị</th>
                        <th>Mã serial</th>
                        <th>Trạng thái</th>
                        <th>Ngày đăng ký</th>
                      </tr>
                    </thead>
                    <tbody>
                      {devices.map((device, index) => (
                        <tr key={device.device_id}>
                          <td>{index + 1}</td>
                          <td>
                            <code>{device.device_id}</code>
                          </td>
                          <td>{device.serial_number}</td>
                          <td>{renderStatus(device.status)}</td>
                          <td>{formatDate(device.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PatientDeviceRegistration