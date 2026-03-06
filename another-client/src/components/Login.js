import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import { useAuth } from "../contexts/AuthContext"

const demoAccounts = [
  { role: "Bệnh nhân", email: "patient@example.com", password: "123456" },
  { role: "Bác sĩ", email: "doctor@example.com", password: "123456" },
  { role: "Gia đình", email: "family@example.com", password: "123456" },
]

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" })
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    const result = await login(formData.email, formData.password)
    if (result.success) {
      toast.success(result.message)
      navigate("/")
    } else {
      toast.error(result.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-surface px-4 py-8 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl overflow-hidden rounded-[36px] border border-surface-line bg-white shadow-panel lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-400 p-8 text-white sm:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.18),transparent_30%)]"></div>
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/12 text-2xl"><i className="fas fa-heart-pulse"></i></div>
                <div>
                  <p className="text-sm uppercase tracking-[0.32em] text-white/70">Ironman Holter</p>
                  <h1 className="text-4xl font-black sm:text-5xl">Theo dõi tim mạch Việt</h1>
                </div>
              </div>
              <p className="mt-8 max-w-xl text-lg text-white/80">Nền tảng theo dõi ECG, cảnh báo bất thường, chia sẻ dữ liệu với bác sĩ và trợ lý AI trong một không gian điều trị thống nhất.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {demoAccounts.map((account) => (
                <div key={account.email} className="rounded-[24px] border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/60">{account.role}</p>
                  <p className="mt-3 text-sm font-semibold">{account.email}</p>
                  <p className="text-sm text-white/75">{account.password}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center p-6 sm:p-10 lg:p-14">
          <div className="w-full max-w-md">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">Đăng nhập</p>
            <h2 className="mt-3 text-3xl font-black text-ink-900">Bắt đầu làm việc</h2>
            <p className="mt-3 text-sm text-ink-600">Đăng nhập để truy cập dashboard, cảnh báo, lịch sử ECG và không gian làm việc theo vai trò.</p>
            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="form-label">Email</label>
                <input className="form-control" type="email" name="email" value={formData.email} onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))} required />
              </div>
              <div>
                <label className="form-label">Mật khẩu</label>
                <input className="form-control" type="password" name="password" value={formData.password} onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))} required />
              </div>
              <button type="submit" className="btn btn-primary w-full !py-3" disabled={loading}>
                {loading ? <><span className="spinner-border spinner-border-sm"></span>Đang đăng nhập...</> : "Đăng nhập"}
              </button>
            </form>
            <p className="mt-6 text-sm text-ink-600">Chưa có tài khoản? <Link to="/register" className="font-semibold text-brand-600">Đăng ký ngay</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
