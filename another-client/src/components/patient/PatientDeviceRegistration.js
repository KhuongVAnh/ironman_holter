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
      <span className={`status-chip ${isActive ? "is-success" : "is-neutral"}`}>
        {status || "Không xác định"}
      </span>
    )
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="page-hero-icon"><i className="fas fa-microchip"></i></div>
        <div className="min-w-0 flex-1">
          <p className="panel-eyebrow">Thiết bị ECG</p>
          <h1 className="page-hero-title">Đăng ký và theo dõi thiết bị</h1>
          <p className="page-hero-subtitle">Mỗi thiết bị cần mã serial duy nhất để đồng bộ dữ liệu đo nhịp tim vào hồ sơ của bạn.</p>
        </div>
        <button className="btn btn-outline-primary" onClick={fetchDevices} disabled={loading}>
          <i className="fas fa-rotate-right me-2"></i>Làm mới
        </button>
      </section>

      <section className="metric-grid">
        <div className="priority-metric metric-info">
          <div className="metric-icon"><i className="fas fa-layer-group"></i></div>
          <p className="metric-label">Tổng thiết bị</p>
          <p className="metric-value">{devices.length}</p>
          <p className="metric-helper">Đã liên kết với tài khoản</p>
        </div>
        <div className="priority-metric metric-success">
          <div className="metric-icon"><i className="fas fa-signal"></i></div>
          <p className="metric-label">Đang hoạt động</p>
          <p className="metric-value">{devices.filter((device) => String(device.status || "").toLowerCase().includes("dang") || String(device.status || "").toLowerCase().includes("đang")).length}</p>
          <p className="metric-helper">Sẵn sàng ghi nhận ECG</p>
        </div>
        <div className="priority-metric metric-warning">
          <div className="metric-icon"><i className="fas fa-fingerprint"></i></div>
          <p className="metric-label">Serial mới</p>
          <p className="metric-value">{formData.serial_number ? "1" : "0"}</p>
          <p className="metric-helper">Đang nhập trong biểu mẫu</p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="clinical-panel overflow-hidden">
          <div className="clinical-panel-header">
            <div>
              <p className="panel-eyebrow">Thiết bị mới</p>
              <h2 className="section-title">Thêm mã serial</h2>
              <p className="section-subtitle">Mã serial thường được in trên thiết bị hoặc hộp sản phẩm.</p>
            </div>
          </div>
          <div className="clinical-panel-body">
            <div className="highlight-band success mb-4">
              <div className="highlight-band-icon"><i className="fas fa-circle-check"></i></div>
              <div>
                <h3>Kết nối đúng tài khoản</h3>
                <p>Thiết bị sau khi đăng ký sẽ gửi dữ liệu vào hồ sơ của bạn.</p>
              </div>
            </div>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="serial_number" className="form-label">Mã serial</label>
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
        </section>

        <section className="clinical-panel overflow-hidden">
          <div className="clinical-panel-header">
            <div>
              <p className="panel-eyebrow">Danh sách thiết bị</p>
              <h2 className="section-title">Thiết bị của bạn</h2>
              <p className="section-subtitle">Theo dõi serial, trạng thái và thời điểm đăng ký.</p>
            </div>
          </div>
          <div className="clinical-panel-body">
            {loading ? (
              <div className="flex justify-center py-10"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Đang tải...</span></div></div>
            ) : devices.length === 0 ? (
              <div className="empty-state-rich">
                <div className="empty-state-rich-icon info"><i className="fas fa-microchip"></i></div>
                <h3>Bạn chưa có thiết bị nào</h3>
                <p>Nhập serial thiết bị đầu tiên để bắt đầu đồng bộ dữ liệu ECG.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {devices.map((device, index) => (
                  <div key={device.device_id} className="grid gap-4 rounded-2xl border border-surface-line bg-white p-4 shadow-soft md:grid-cols-[64px_minmax(0,1fr)_160px] md:items-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-lg font-bold text-sky-700">{index + 1}</div>
                    <div className="min-w-0">
                      <p className="font-bold text-ink-900">{device.serial_number}</p>
                      <p className="truncate text-sm text-ink-500">ID thiết bị: <code>{device.device_id}</code></p>
                      <p className="mt-1 text-xs text-ink-500">Ngày đăng ký: {formatDate(device.created_at)}</p>
                    </div>
                    <div className="md:text-right">{renderStatus(device.status)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default PatientDeviceRegistration
