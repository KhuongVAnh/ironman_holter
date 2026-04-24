import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import { API_BASE_URL } from "../config/env"
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

  useEffect(() => {
    const controller = new AbortController()

    fetch(`${API_BASE_URL}/api/hello`, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    }).catch(() => {
      // Ignore wake-up errors here. The goal is only to warm app + DB before login.
    })

    return () => controller.abort()
  }, [])

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
    <div className="min-h-screen bg-surface px-4 py-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-3xl border border-surface-line bg-white shadow-panel lg:grid-cols-[1fr_440px]">
        <div className="bg-brand-700 p-6 text-white sm:p-8 lg:p-10">
          <div className="flex h-full flex-col justify-between gap-10">
            <div>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-2xl shadow-soft"><i className="fas fa-heart-pulse"></i></div>
                <div>
                  <p className="text-sm font-medium text-white/70">Ironman Holter</p>
                  <h1 className="font-display text-3xl font-bold sm:text-4xl">Theo dõi tim mạch Việt</h1>
                </div>
              </div>
              <p className="mt-6 max-w-xl text-base leading-7 text-white/75">Nền tảng theo dõi ECG, cảnh báo bất thường, chia sẻ dữ liệu với bác sĩ và trợ lý AI trong một không gian điều trị thống nhất.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {demoAccounts.map((account) => (
                <div key={account.email} className="rounded-2xl border border-white/15 bg-white/10 p-4 shadow-soft">
                  <p className="text-xs font-medium text-white/60">{account.role}</p>
                  <p className="mt-2 text-sm font-medium">{account.email}</p>
                  <p className="text-sm text-white/75">{account.password}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center p-6 sm:p-8 lg:p-10">
          <div className="w-full max-w-md">
            <p className="text-sm font-medium text-ink-600">Đăng nhập</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-ink-900">Bắt đầu làm việc</h2>
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
              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? <><span className="spinner-border spinner-border-sm"></span>Đang đăng nhập...</> : "Đăng nhập"}
              </button>
            </form>
            <p className="mt-6 text-sm text-ink-600">Chưa có tài khoản? <Link to="/register" className="font-semibold text-brand-700">Đăng ký ngay</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
