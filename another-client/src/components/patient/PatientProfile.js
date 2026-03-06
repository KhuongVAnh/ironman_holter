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
      toast.error("Mat khau xac nhan khong khop")
      return
    }
    if (passwordData.newPassword.length < 6) {
      toast.error("Mat khau moi phai co it nhat 6 ky tu")
      return
    }
    setLoading(true)
    try {
      await usersApi.changePassword(passwordData.currentPassword, passwordData.newPassword)
      toast.success("Doi mat khau thanh cong")
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
      setShowPasswordModal(false)
    } catch (error) {
      console.error("Loi doi mat khau:", error)
      toast.error(error.response?.data?.message || "Khong the doi mat khau")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
      <section className="app-card">
        <div className="app-card-header">
          <div>
            <h1 className="section-title"><i className="fas fa-user-pen me-2 text-brand-600"></i>Ho so ca nhan</h1>
            <p className="section-subtitle">Thong tin nhan dang, email va thiet lap co ban cua tai khoan.</p>
          </div>
          {!isEditing ? <button type="button" className="btn btn-outline-primary" onClick={() => setIsEditing(true)}><i className="fas fa-pen me-2"></i>Chinh sua</button> : null}
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
              <div className="rounded-[24px] bg-surface p-5"><p className="text-sm text-ink-500">Ho va ten</p><p className="mt-2 text-lg font-bold text-ink-900">{user?.name}</p></div>
              <div className="rounded-[24px] bg-surface p-5"><p className="text-sm text-ink-500">Email</p><p className="mt-2 text-lg font-bold text-ink-900">{user?.email}</p></div>
              <div className="rounded-[24px] bg-surface p-5"><p className="text-sm text-ink-500">Vai tro</p><div className="mt-3">{getRoleBadge(user?.role)}</div></div>
              <div className="rounded-[24px] bg-surface p-5"><p className="text-sm text-ink-500">Trang thai</p><span className="mt-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Hoat dong</span></div>
            </div>
          )}
        </div>
      </section>

      <aside className="app-card">
        <div className="app-card-header">
          <div>
            <h2 className="section-title"><i className="fas fa-shield-halved me-2 text-brand-600"></i>Bao mat</h2>
            <p className="section-subtitle">Quan ly thong tin xac thuc va phien dang nhap.</p>
          </div>
        </div>
        <div className="app-card-body space-y-4 text-sm text-ink-700">
          <div className="rounded-[24px] bg-surface p-5"><i className="fas fa-key me-2 text-brand-600"></i>Mat khau duoc ma hoa va luu bao mat.</div>
          <div className="rounded-[24px] bg-surface p-5"><i className="fas fa-clock me-2 text-brand-600"></i>Dang nhap gan nhat: Hom nay</div>
          <button type="button" className="btn btn-outline-warning w-100" onClick={() => setShowPasswordModal(true)}><i className="fas fa-lock me-2"></i>Doi mat khau</button>
        </div>
      </aside>

      <ModalFrame
        show={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Doi mat khau"
        footer={<><button type="button" className="btn btn-outline-secondary" onClick={() => setShowPasswordModal(false)}>Huy</button><button type="submit" form="change-password-form" className="btn btn-primary" disabled={loading}>{loading ? "Dang doi..." : "Luu mat khau moi"}</button></>}
      >
        <form id="change-password-form" className="space-y-4" onSubmit={handlePasswordSubmit}>
          <div><label className="form-label">Mat khau hien tai</label><input className="form-control" type="password" value={passwordData.currentPassword} onChange={(event) => setPasswordData((prev) => ({ ...prev, currentPassword: event.target.value }))} required /></div>
          <div><label className="form-label">Mat khau moi</label><input className="form-control" type="password" value={passwordData.newPassword} onChange={(event) => setPasswordData((prev) => ({ ...prev, newPassword: event.target.value }))} required minLength="6" /></div>
          <div><label className="form-label">Xac nhan mat khau moi</label><input className="form-control" type="password" value={passwordData.confirmPassword} onChange={(event) => setPasswordData((prev) => ({ ...prev, confirmPassword: event.target.value }))} required minLength="6" /></div>
        </form>
      </ModalFrame>
    </div>
  )
}

export default PatientProfile
