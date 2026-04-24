import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import { useAuth } from "../contexts/AuthContext"
import { ROLE, ROLE_LABELS } from "../services/string"

const Register = () => {
  const [formData, setFormData] = useState({ name: "", email: "", password: "", confirmPassword: "", role: ROLE.BENH_NHAN })
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const updateField = (name, value) => setFormData((prev) => ({ ...prev, [name]: value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp")
      return
    }
    if (formData.password.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự")
      return
    }
    setLoading(true)
    const result = await register(formData.name, formData.email, formData.password, formData.role)
    if (result.success) {
      toast.success(result.message)
      navigate("/")
    } else {
      toast.error(result.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-surface px-4 py-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-3xl border border-surface-line bg-white shadow-panel lg:grid-cols-[440px_1fr]">
        <div className="flex items-center justify-center bg-white p-6 sm:p-8 lg:p-10">
          <div className="w-full max-w-md">
            <p className="text-sm font-medium text-ink-600">Đăng ký</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-ink-900">Tạo tài khoản mới</h2>
            <p className="mt-3 text-sm text-ink-600">Hoàn thành thông tin để tham gia hệ thống theo dõi tim mạch và cộng tác lâm sàng Ironman Holter.</p>
            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div><label className="form-label">Họ và tên</label><input className="form-control" type="text" value={formData.name} onChange={(event) => updateField("name", event.target.value)} required /></div>
              <div><label className="form-label">Email</label><input className="form-control" type="email" value={formData.email} onChange={(event) => updateField("email", event.target.value)} required /></div>
              <div>
                <label className="form-label">Vai trò</label>
                <select className="form-select" value={formData.role} onChange={(event) => updateField("role", event.target.value)}>
                  <option value={ROLE.BENH_NHAN}>{ROLE_LABELS[ROLE.BENH_NHAN]}</option>
                  <option value={ROLE.GIA_DINH}>{ROLE_LABELS[ROLE.GIA_DINH]}</option>
                  <option value={ROLE.BAC_SI}>{ROLE_LABELS[ROLE.BAC_SI]}</option>
                </select>
              </div>
              <div><label className="form-label">Mật khẩu</label><input className="form-control" type="password" value={formData.password} onChange={(event) => updateField("password", event.target.value)} required /></div>
              <div><label className="form-label">Xác nhận mật khẩu</label><input className="form-control" type="password" value={formData.confirmPassword} onChange={(event) => updateField("confirmPassword", event.target.value)} required /></div>
              <button type="submit" className="btn btn-primary w-full" disabled={loading}>{loading ? <><span className="spinner-border spinner-border-sm"></span>Đang đăng ký...</> : "Đăng ký"}</button>
            </form>
            <p className="mt-6 text-sm text-ink-600">Đã có tài khoản? <Link to="/login" className="font-semibold text-brand-700">Đăng nhập</Link></p>
          </div>
        </div>
        <div className="bg-brand-700 p-6 text-white sm:p-8 lg:p-10">
          <div className="flex h-full flex-col justify-between gap-10">
            <div>
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-400 text-2xl shadow-soft"><i className="fas fa-user-plus"></i></div>
              <h3 className="mt-6 font-display text-3xl font-bold sm:text-4xl">Tham gia hệ thống chăm sóc tim mạch hiện đại</h3>
              <p className="mt-4 max-w-xl text-base leading-7 text-white/75">Mỗi tài khoản được định nghĩa theo vai trò rõ ràng, giúp theo dõi, cảnh báo và chia sẻ dữ liệu đúng người, đúng ngữ cảnh.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 shadow-soft"><p className="text-sm font-bold">Theo dõi liên tục</p><p className="mt-2 text-sm text-white/75">Tổng hợp ECG, cảnh báo và lịch sử đo trong một workspace thống nhất.</p></div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 shadow-soft"><p className="text-sm font-bold">Làm việc theo vai trò</p><p className="mt-2 text-sm text-white/75">Bệnh nhân, bác sĩ, gia đình và quản trị dùng cùng một ngôn ngữ giao diện.</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
