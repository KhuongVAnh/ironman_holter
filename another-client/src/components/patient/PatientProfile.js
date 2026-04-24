import { useState } from "react"
import { toast } from "react-toastify"
import { useAuth } from "../../contexts/AuthContext"
import { usersApi } from "../../services/api"
import { ROLE, ROLE_BADGE } from "../../services/string"
import ModalFrame from "../shared/ModalFrame"

const PatientProfile = () => {
  const { user } = useAuth()
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
      toast.success("Cap nhat thong tin thanh cong")
      setIsEditing(false)
    } catch (error) {
      console.error("Loi cap nhat:", error)
      toast.error(error.response?.data?.message || "Khong the cap nhat thong tin")
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
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
      <section className="app-card">
        <div className="app-card-header">
          <div>
            <h1 className="section-title"><i className="fas fa-user-pen me-2 text-brand-600"></i>Hồ sơ cá nhân</h1>
            <p className="section-subtitle">Thông tin nhận dạng, email và thiết lập cơ bản của tài khoản.</p>
          </div>
          {!isEditing ? <button type="button" className="btn btn-outline-primary" onClick={() => setIsEditing(true)}><i className="fas fa-pen me-2"></i>Chỉnh sửa</button> : null}
        </div>
        <div className="app-card-body">
          {isEditing ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div><label className="form-label">Ho va ten</label><input className="form-control" value={formData.name} onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))} required /></div>
              <div><label className="form-label">Email</label><input className="form-control" type="email" value={formData.email} onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))} required /></div>
              <div className="flex flex-wrap gap-3">
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? <><span className="spinner-border spinner-border-sm me-2"></span>Dang luu...</> : <><i className="fas fa-save me-2"></i>Luu thay doi</>}</button>
                <button type="button" className="btn btn-outline-secondary" onClick={() => { setIsEditing(false); setFormData({ name: user?.name || "", email: user?.email || "" }) }}>Huy</button>
              </div>
            </form>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-surface-soft p-5"><p className="text-sm text-ink-500">Ho va ten</p><p className="mt-2 text-lg font-bold text-ink-900">{user?.name}</p></div>
              <div className="rounded-xl bg-surface-soft p-5"><p className="text-sm text-ink-500">Email</p><p className="mt-2 text-lg font-bold text-ink-900">{user?.email}</p></div>
              <div className="rounded-xl bg-surface-soft p-5"><p className="text-sm text-ink-500">Vai tro</p><div className="mt-3">{getRoleBadge(user?.role)}</div></div>
              <div className="rounded-xl bg-surface-soft p-5"><p className="text-sm text-ink-500">Trang thai</p><span className="mt-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Hoat dong</span></div>
            </div>
          )}
        </div>
      </section>

      <aside className="app-card">
        <div className="app-card-header">
          <div>
            <h2 className="section-title"><i className="fas fa-shield-halved me-2 text-brand-600"></i>Bảo mật</h2>
            <p className="section-subtitle">Quản lý thông tin xác thực và phiên đăng nhập.</p>
          </div>
        </div>
        <div className="app-card-body space-y-4 text-sm text-ink-700">
          <div className="rounded-xl bg-surface-soft p-5"><i className="fas fa-key me-2 text-brand-600"></i>Mật khẩu được mã hóa và lưu bảo mật.</div>
          <div className="rounded-xl bg-surface-soft p-5"><i className="fas fa-clock me-2 text-brand-600"></i>Đăng nhập gần nhất: Hôm nay</div>
          <button type="button" className="btn btn-outline-warning w-100" onClick={() => setShowPasswordModal(true)}><i className="fas fa-lock me-2"></i>Đổi mật khẩu</button>
        </div>
      </aside>

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
