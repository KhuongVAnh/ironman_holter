"use client"

import { useState } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { toast } from "react-toastify"
import axios from "axios"

const PatientProfile = () => {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await axios.put(`${process.env.REACT_APP_API_BASE_URL}/api/users/${user.user_id}`, formData)
      toast.success("Cập nhật thông tin thành công")
      setIsEditing(false)
    } catch (error) {
      console.error("Lỗi cập nhật:", error)
      toast.error(error.response?.data?.message || "Không thể cập nhật thông tin")
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp")
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự")
      return
    }

    setLoading(true)

    try {
      await axios.put(`${process.env.REACT_APP_API_BASE_URL}/api/users/change-password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      })
      toast.success("Đổi mật khẩu thành công")
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
    } catch (error) {
      console.error("Lỗi đổi mật khẩu:", error)
      toast.error(error.response?.data?.message || "Không thể đổi mật khẩu")
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadge = (role) => {
    const roleConfig = {
      "bệnh nhân": { class: "bg-primary", icon: "fas fa-user" },
      "bác sĩ": { class: "bg-success", icon: "fas fa-user-md" },
      "gia đình": { class: "bg-info", icon: "fas fa-users" },
      admin: { class: "bg-danger", icon: "fas fa-user-shield" },
    }

    const config = roleConfig[role] || roleConfig["bệnh nhân"]

    return (
      <span className={`badge ${config.class}`}>
        <i className={`${config.icon} me-1`}></i>
        {role}
      </span>
    )
  }

  return (
    <div className="container py-4">
      <div className="row">
        <div className="col-12">
          <h1 className="h3 mb-4">
            <i className="fas fa-user-edit me-2 text-primary"></i>
            Hồ sơ cá nhân
          </h1>
        </div>
      </div>

      <div className="row g-4">
        {/* Thông tin cá nhân */}
        <div className="col-md-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">
                  <i className="fas fa-info-circle me-2 text-info"></i>
                  Thông tin cá nhân
                </h5>
                {!isEditing && (
                  <button className="btn btn-outline-primary btn-sm" onClick={() => setIsEditing(true)}>
                    <i className="fas fa-edit me-1"></i>
                    Chỉnh sửa
                  </button>
                )}
              </div>
            </div>
            <div className="card-body">
              {isEditing ? (
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="name" className="form-label">
                      Họ và tên
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">
                      Email
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Đang lưu...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save me-1"></i>
                          Lưu thay đổi
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => {
                        setIsEditing(false)
                        setFormData({
                          name: user?.name || "",
                          email: user?.email || "",
                        })
                      }}
                    >
                      Hủy
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="row mb-3">
                    <div className="col-sm-3">
                      <strong>Họ và tên:</strong>
                    </div>
                    <div className="col-sm-9">{user?.name}</div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-sm-3">
                      <strong>Email:</strong>
                    </div>
                    <div className="col-sm-9">{user?.email}</div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-sm-3">
                      <strong>Vai trò:</strong>
                    </div>
                    <div className="col-sm-9">{getRoleBadge(user?.role)}</div>
                  </div>
                  <div className="row">
                    <div className="col-sm-3">
                      <strong>Trạng thái:</strong>
                    </div>
                    <div className="col-sm-9">
                      <span className="badge bg-success">
                        <i className="fas fa-check-circle me-1"></i>
                        Hoạt động
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Thông tin tài khoản */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0">
              <h5 className="card-title mb-0">
                <i className="fas fa-shield-alt me-2 text-success"></i>
                Bảo mật
              </h5>
            </div>
            <div className="card-body">
              <div className="d-flex align-items-center mb-3">
                <i className="fas fa-key text-muted me-2"></i>
                <span>Mật khẩu được mã hóa</span>
              </div>
              <div className="d-flex align-items-center mb-3">
                <i className="fas fa-clock text-muted me-2"></i>
                <span>Đăng nhập gần nhất: Hôm nay</span>
              </div>
              <button
                className="btn btn-outline-warning btn-sm w-100"
                data-bs-toggle="modal"
                data-bs-target="#changePasswordModal"
              >
                <i className="fas fa-lock me-1"></i>
                Đổi mật khẩu
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal đổi mật khẩu */}
      <div className="modal fade" id="changePasswordModal" tabIndex="-1">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="fas fa-lock me-2"></i>
                Đổi mật khẩu
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <form onSubmit={handlePasswordSubmit}>
              <div className="modal-body">
                <div className="mb-3">
                  <label htmlFor="currentPassword" className="form-label">
                    Mật khẩu hiện tại
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    id="currentPassword"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="newPassword" className="form-label">
                    Mật khẩu mới
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    id="newPassword"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    required
                    minLength="6"
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="confirmPassword" className="form-label">
                    Xác nhận mật khẩu mới
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                    minLength="6"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Đang đổi...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save me-1"></i>
                      Đổi mật khẩu
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PatientProfile
