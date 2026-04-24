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
    <div className="relative min-h-screen overflow-hidden bg-surface px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="auth-orb auth-orb-pink"></div>
        <div className="auth-orb auth-orb-lime"></div>
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-4xl border border-brand-100 bg-white shadow-panel lg:grid-cols-[460px_1fr]">
        <section className="auth-panel-secondary p-6 text-white sm:p-8 lg:p-10">
          <div className="auth-fade-up flex h-full flex-col justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/90">
                <i className="fas fa-user-plus"></i>
                New Account
              </div>
              <h3 className="mt-6 font-display text-4xl font-bold leading-tight">Bắt đầu hành trình theo dõi tim mạch thông minh.</h3>
              <p className="mt-4 text-base leading-7 text-white/85">Tạo tài khoản theo đúng vai trò để nhận giao diện và quyền truy cập phù hợp, giúp phối hợp chăm sóc nhanh hơn và rõ ràng hơn.</p>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                <p className="text-sm font-semibold">Luồng lâm sàng trực quan</p>
                <p className="mt-1 text-sm text-white/80">Bác sĩ theo dõi dashboard, gia đình nhận cảnh báo, bệnh nhân xem tiến trình ngay trong một hệ thống.</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                <p className="text-sm font-semibold">Cảnh báo tức thời</p>
                <p className="mt-1 text-sm text-white/80">Sự kiện bất thường từ ECG được đẩy đến đúng người phụ trách theo phân quyền.</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                <p className="text-sm font-semibold">Hạ tầng mở rộng</p>
                <p className="mt-1 text-sm text-white/80">Thiết kế sẵn cho dữ liệu realtime, worker queue và lớp AI dự đoán rủi ro.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-5 sm:p-8 lg:p-10">
          <div className="auth-fade-up w-full max-w-lg rounded-3xl border border-surface-line bg-white p-6 shadow-soft sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent-600">Create Account</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-ink-900">Đăng ký tài khoản mới</h2>
            <p className="mt-3 text-sm leading-6 text-ink-600">Hoàn thiện thông tin để tham gia hệ sinh thái Ironman Holter với trải nghiệm theo đúng vai trò của bạn.</p>

            <form className="mt-7 grid gap-4" onSubmit={handleSubmit}>
              <div>
                <label className="form-label">Họ và tên</label>
                <input
                  className="form-control"
                  type="text"
                  value={formData.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Nguyen Van A"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="form-label">Email</label>
                  <input
                    className="form-control"
                    type="email"
                    value={formData.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Vai trò</label>
                  <select className="form-select" value={formData.role} onChange={(event) => updateField("role", event.target.value)}>
                    <option value={ROLE.BENH_NHAN}>{ROLE_LABELS[ROLE.BENH_NHAN]}</option>
                    <option value={ROLE.GIA_DINH}>{ROLE_LABELS[ROLE.GIA_DINH]}</option>
                    <option value={ROLE.BAC_SI}>{ROLE_LABELS[ROLE.BAC_SI]}</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="form-label">Mật khẩu</label>
                  <input
                    className="form-control"
                    type="password"
                    value={formData.password}
                    onChange={(event) => updateField("password", event.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Xác nhận mật khẩu</label>
                  <input
                    className="form-control"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(event) => updateField("confirmPassword", event.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary mt-2 w-full" disabled={loading}>
                {loading ? <><span className="spinner-border spinner-border-sm"></span>Đang đăng ký...</> : "Tạo tài khoản"}
              </button>
            </form>

            <p className="mt-6 text-sm text-ink-600">
              Đã có tài khoản?{" "}
              <Link to="/login" className="font-semibold text-brand-700 hover:text-brand-800">
                Đăng nhập ngay
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Register
