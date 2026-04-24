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

  const applyDemoAccount = (account) => {
    setFormData({ email: account.email, password: account.password })
  }

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
    <div className="relative min-h-screen overflow-hidden bg-ink-900 px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="auth-orb auth-orb-brand"></div>
        <div className="auth-orb auth-orb-cyan"></div>
        <div className="auth-grid-overlay"></div>
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-4xl border border-white/20 bg-white/10 shadow-panel backdrop-blur-md lg:grid-cols-[1fr_430px]">
        <section className="auth-panel-primary p-6 text-white sm:p-8 lg:p-10">
          <div className="auth-fade-up flex h-full flex-col justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/85">
                <i className="fas fa-heart-pulse text-accent-100"></i>
                Ironman Holter Platform
              </div>
              <h1 className="mt-6 max-w-xl font-display text-4xl font-bold leading-tight sm:text-5xl">Đăng nhập để làm chủ nhịp tim của bạn.</h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/80">Theo dõi ECG, cảnh báo rủi ro và cộng tác với bác sĩ trong không gian trực quan, tốc độ cao và an toàn dữ liệu.</p>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/80">"Trước khi trao trái tim cho ai đó, hãy trao cho chính mình một trái tim khỏe mạnh."</p>
              <p className="mt-3 max-w-xl text-sm italic text-white/70 text-right">- Khương V. Anh</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-soft">
                <p className="text-xs uppercase tracking-[0.2em] text-white/70">Realtime</p>
                <p className="mt-3 text-2xl font-bold">24/7</p>
                <p className="mt-1 text-sm text-white/75">Giám sát tín hiệu liên tục</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-soft">
                <p className="text-xs uppercase tracking-[0.2em] text-white/70">Bảo mật</p>
                <p className="mt-3 text-2xl font-bold">End-to-End</p>
                <p className="mt-1 text-sm text-white/75">Kiểm soát truy cập theo vai trò</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-soft">
                <p className="text-xs uppercase tracking-[0.2em] text-white/70">AI</p>
                <p className="mt-3 text-2xl font-bold">ECG CNN</p>
                <p className="mt-1 text-sm text-white/75">Hỗ trợ phát hiện bất thường</p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-white/85 p-5 backdrop-blur-xl sm:p-8 lg:p-10">
          <div className="auth-fade-up w-full max-w-md">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Welcome Back</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-ink-900">Đăng nhập hệ thống</h2>
            <p className="mt-3 text-sm leading-6 text-ink-600">Sử dụng tài khoản của bạn để truy cập dashboard lâm sàng, cảnh báo thông minh và lịch sử theo dõi nhịp tim.</p>

            <div className="mt-6 grid gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">Tài khoản demo</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {demoAccounts.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => applyDemoAccount(account)}
                    className="rounded-xl border border-brand-100 bg-brand-50 px-3 py-2 text-left text-xs font-semibold text-brand-700 transition hover:-translate-y-0.5 hover:bg-brand-100"
                  >
                    <span className="block text-[11px] uppercase tracking-[0.12em] text-brand-500">{account.role}</span>
                    <span className="mt-1 block truncate">{account.email}</span>
                  </button>
                ))}
              </div>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="form-label">Email</label>
                <input
                  className="form-control"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label className="form-label">Mật khẩu</label>
                <input
                  className="form-control"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="••••••••"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? <><span className="spinner-border spinner-border-sm"></span>Đang đăng nhập...</> : "Vào workspace"}
              </button>
            </form>

            <p className="mt-6 text-sm text-ink-600">
              Chưa có tài khoản?{" "}
              <Link to="/register" className="font-semibold text-brand-700 hover:text-brand-800">
                Tạo tài khoản mới
              </Link>
            </p>
          </div>
        </section>
      </div>

      <div className="relative mx-auto mt-4 max-w-6xl text-center text-xs text-white/65">
        Dữ liệu sức khỏe được xử lý và đồng bộ theo phiên đăng nhập an toàn.
      </div>
    </div>
  )
}

export default Login
