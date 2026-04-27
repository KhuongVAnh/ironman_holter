import { useState } from "react"
import { toast } from "react-toastify"
import { useAuth } from "../../contexts/AuthContext"
import { usersApi } from "../../services/api"
import { ROLE, ROLE_BADGE } from "../../services/string"
import ModalFrame from "../shared/ModalFrame"

const PatientProfile = () => {
  const { user, refreshUser } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [formData, setFormData] = useState({ name: user?.name || "", email: user?.email || "" })
  const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })
  const [loading, setLoading] = useState(false)

  const getRoleBadge = (role) => {
    const config = ROLE_BADGE[role] || ROLE_BADGE[ROLE.BENH_NHAN]
    return <span className={`badge ${config.class}`}><i className={`${config.icon} me-1`}></i>{role}</span>
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    try {
      await usersApi.update(user.user_id, formData)
      await refreshUser?.()
      toast.success("Cập nhật thông tin thành công")
      setIsEditing(false)
    } catch (error) {
      console.error("Lỗi cập nhật:", error)
      toast.error(error.response?.data?.message || "Không thể cập nhật thông tin")
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()
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
      await usersApi.changePassword(passwordData.currentPassword, passwordData.newPassword)
      toast.success("Đổi mật khẩu thành công")
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
      setShowPasswordModal(false)
    } catch (error) {
      console.error("Lỗi đổi mật khẩu:", error)
      toast.error(error.response?.data?.message || "Không thể đổi mật khẩu")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="page-hero-icon"><i className="fas fa-user-pen"></i></div>
        <div className="min-w-0 flex-1">
          <p className="panel-eyebrow">Tài khoản cá nhân</p>
          <h1 className="page-hero-title">{user?.name || "Hồ sơ cá nhân"}</h1>
          <p className="page-hero-subtitle">Quản lý thông tin nhận dạng, email đăng nhập và thiết lập bảo mật của tài khoản.</p>
        </div>
        {!isEditing ? <button type="button" className="btn btn-primary" onClick={() => setIsEditing(true)}><i className="fas fa-pen me-2"></i>Chỉnh sửa</button> : null}
      </section>

      <section className="metric-grid">
        <div className="priority-metric metric-info">
          <div className="metric-icon"><i className="fas fa-id-card"></i></div>
          <p className="metric-label">Vai trò</p>
          <p className="metric-value text-2xl">{user?.role || "Bệnh nhân"}</p>
          <p className="metric-helper">Phân quyền hiện tại</p>
        </div>
        <div className="priority-metric metric-success">
          <div className="metric-icon"><i className="fas fa-circle-check"></i></div>
          <p className="metric-label">Trạng thái</p>
          <p className="metric-value text-2xl">Hoạt động</p>
          <p className="metric-helper">Tài khoản có thể sử dụng</p>
        </div>
        <div className="priority-metric metric-warning">
          <div className="metric-icon"><i className="fas fa-lock"></i></div>
          <p className="metric-label">Bảo mật</p>
          <p className="metric-value text-2xl">Mật khẩu</p>
          <p className="metric-helper">Có thể đổi trong panel bên dưới</p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        <section className="clinical-panel overflow-hidden">
          <div className="clinical-panel-header">
          <div>
              <p className="panel-eyebrow">Thông tin chính</p>
              <h2 className="section-title">Hồ sơ cá nhân</h2>
              <p className="section-subtitle">Tên và email dùng để nhận diện trên hệ thống.</p>
          </div>
        </div>
          <div className="clinical-panel-body">
          {isEditing ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
                <div><label className="form-label">Họ và tên</label><input className="form-control" value={formData.name} onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))} required /></div>
              <div><label className="form-label">Email</label><input className="form-control" type="email" value={formData.email} onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))} required /></div>
              <div className="flex flex-wrap gap-3">
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? <><span className="spinner-border spinner-border-sm me-2"></span>Đang lưu...</> : <><i className="fas fa-save me-2"></i>Lưu thay đổi</>}</button>
                  <button type="button" className="btn btn-outline-secondary" onClick={() => { setIsEditing(false); setFormData({ name: user?.name || "", email: user?.email || "" }) }}>Hủy</button>
              </div>
            </form>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
                <div className="highlight-band info"><div className="highlight-band-icon"><i className="fas fa-user"></i></div><div><h3>Họ và tên</h3><p className="break-words">{user?.name}</p></div></div>
                <div className="highlight-band brand"><div className="highlight-band-icon"><i className="fas fa-envelope"></i></div><div><h3>Email</h3><p className="break-words">{user?.email}</p></div></div>
                <div className="rounded-2xl border border-surface-line bg-white p-5 shadow-soft"><p className="text-sm font-semibold text-ink-500">Vai trò</p><div className="mt-3">{getRoleBadge(user?.role)}</div></div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-soft"><p className="text-sm font-semibold text-emerald-700">Trạng thái</p><span className="mt-3 status-chip is-success">Hoạt động</span></div>
            </div>
          )}
        </div>
      </section>

        <aside className="clinical-panel overflow-hidden">
          <div className="clinical-panel-header">
          <div>
            <h2 className="section-title"><i className="fas fa-shield-halved me-2 text-brand-600"></i>Bảo mật</h2>
            <p className="section-subtitle">Quản lý thông tin xác thực và phiên đăng nhập.</p>
          </div>
        </div>
          <div className="clinical-panel-body space-y-4 text-sm text-ink-700">
            <div className="highlight-band warning"><div className="highlight-band-icon"><i className="fas fa-key"></i></div><div><h3>Mật khẩu</h3><p>Thông tin xác thực được mã hóa khi lưu.</p></div></div>
            <div className="info-list">
              <div className="info-list-row"><span className="info-list-label">Đăng nhập gần nhất</span><span className="info-list-value">Hôm nay</span></div>
              <div className="info-list-row"><span className="info-list-label">Email tài khoản</span><span className="info-list-value break-all">{user?.email}</span></div>
            </div>
          <button type="button" className="btn btn-outline-warning w-100" onClick={() => setShowPasswordModal(true)}><i className="fas fa-lock me-2"></i>Đổi mật khẩu</button>
        </div>
      </aside>
      </div>

      <ModalFrame
        show={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Đổi mật khẩu"
        footer={<><button type="button" className="btn btn-outline-secondary" onClick={() => setShowPasswordModal(false)}>Hủy</button><button type="submit" form="change-password-form" className="btn btn-primary" disabled={loading}>{loading ? "Đang đợi..." : "Lưu mật khẩu mới"}</button></>}
      >
        <form id="change-password-form" className="space-y-4" onSubmit={handlePasswordSubmit}>
          <div><label className="form-label">Mật khẩu hiện tại</label><input className="form-control" type="password" value={passwordData.currentPassword} onChange={(event) => setPasswordData((prev) => ({ ...prev, currentPassword: event.target.value }))} required /></div>
          <div><label className="form-label">Mật khẩu mới</label><input className="form-control" type="password" value={passwordData.newPassword} onChange={(event) => setPasswordData((prev) => ({ ...prev, newPassword: event.target.value }))} required minLength="6" /></div>
          <div><label className="form-label">Xác nhận mật khẩu mới</label><input className="form-control" type="password" value={passwordData.confirmPassword} onChange={(event) => setPasswordData((prev) => ({ ...prev, confirmPassword: event.target.value }))} required minLength="6" /></div>
        </form>
      </ModalFrame>
    </div>
  )
}

export default PatientProfile
