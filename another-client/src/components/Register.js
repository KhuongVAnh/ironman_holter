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
    <div className="min-h-screen bg-holter-surface px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl gap-6 lg:grid-cols-[430px_minmax(0,1fr)]">
        <section className="relative overflow-hidden rounded-[24px] border border-white/60 bg-white/[0.82] p-6 shadow-holterAmbient backdrop-blur-xl sm:p-8 lg:p-10">
          <div className="absolute inset-x-0 top-0 h-1 bg-brand-600"></div>
          <p className="panel-eyebrow">Tài khoản mới</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight text-brand-700">Tạo workspace theo đúng vai trò chăm sóc.</h1>
          <p className="mt-4 text-sm leading-6 text-ink-600">Mỗi vai trò có dashboard, quyền truy cập và hành động riêng để dữ liệu ECG được theo dõi đúng người, đúng thời điểm.</p>

          <div className="mt-8 space-y-4">
            <div className="highlight-band info">
              <div className="highlight-band-icon"><i className="fas fa-user"></i></div>
              <div><h3>Bệnh nhân</h3><p>Xem ECG, cảnh báo, thiết bị và quyền chia sẻ.</p></div>
            </div>
            <div className="highlight-band danger">
              <div className="highlight-band-icon"><i className="fas fa-user-doctor"></i></div>
              <div><h3>Bác sĩ</h3><p>Ưu tiên hàng đợi cảnh báo và workspace bệnh nhân.</p></div>
            </div>
            <div className="highlight-band success">
              <div className="highlight-band-icon"><i className="fas fa-people-roof"></i></div>
              <div><h3>Gia đình</h3><p>Theo dõi người thân, nhận cảnh báo và xem hồ sơ.</p></div>
            </div>
          </div>
        </section>

        <section className="flex items-center">
          <div className="clinical-panel w-full overflow-hidden">
            <div className="clinical-panel-header">
              <div>
                <p className="panel-eyebrow">Đăng ký</p>
                <h2 className="section-title">Thông tin tài khoản</h2>
                <p className="section-subtitle">Hoàn thiện thông tin cơ bản để bắt đầu sử dụng hệ thống.</p>
              </div>
              <Link to="/login" className="btn btn-outline-primary btn-sm">Đăng nhập</Link>
            </div>
            <div className="clinical-panel-body">
              <form className="grid gap-4" onSubmit={handleSubmit}>
                <div>
                  <label className="form-label">Họ và tên</label>
                  <input
                    className="form-control"
                    type="text"
                    value={formData.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="Nguyễn Văn A"
                    required
                  />
                </div>

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
                  <div className="grid gap-3 md:grid-cols-3">
                    {[
                      { value: ROLE.BENH_NHAN, icon: "fas fa-heart-pulse", tone: "info" },
                      { value: ROLE.GIA_DINH, icon: "fas fa-people-roof", tone: "success" },
                      { value: ROLE.BAC_SI, icon: "fas fa-user-doctor", tone: "danger" },
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        className={`rounded-2xl border p-4 text-left transition ${formData.role === item.value ? "border-brand-300 bg-brand-50 shadow-soft" : "border-surface-line bg-white/85 hover:bg-brand-50/60"}`}
                        onClick={() => updateField("role", item.value)}
                      >
                        <div className={`empty-state-rich-icon ${item.tone} mb-3 h-10 w-10 text-base`}><i className={item.icon}></i></div>
                        <p className="font-bold text-ink-900">{ROLE_LABELS[item.value]}</p>
                      </button>
                    ))}
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
                  {loading ? <><span className="spinner-border spinner-border-sm"></span>Đang đăng ký...</> : <><i className="fas fa-user-plus me-2"></i>Tạo tài khoản</>}
                </button>
              </form>

              <p className="mt-6 text-sm text-ink-600">
                Đã có tài khoản?{" "}
                <Link to="/login" className="font-semibold text-brand-700 hover:text-brand-800">
                  Đăng nhập ngay
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Register
