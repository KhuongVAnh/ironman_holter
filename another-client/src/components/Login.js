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
    <div className="min-h-screen bg-holter-surface px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_460px]">
        <section className="auth-panel-primary relative overflow-hidden rounded-[24px] border border-white/15 p-6 text-white shadow-holterAmbient sm:p-8 lg:p-10">
          <div className="auth-grid-overlay"></div>
          <div className="flex h-full flex-col justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white/85 backdrop-blur">
                <i className="fas fa-heart-pulse text-brand-100"></i>
                Ironman Holter
              </div>
              <h1 className="mt-7 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">Đăng nhập để theo dõi ECG theo thời gian thực.</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/75">Dashboard lâm sàng tập trung vào nhịp tim, cảnh báo bất thường, kết luận AI và quyền chia sẻ dữ liệu với bác sĩ hoặc gia đình.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/15 text-sky-100"><i className="fas fa-wave-square"></i></div>
                <p className="mt-4 text-2xl font-bold">Realtime</p>
                <p className="mt-1 text-sm text-white/70">Dữ liệu ECG trực tiếp</p>
              </div>
              <div className="rounded-2xl border border-red-400/25 bg-red-400/10 p-4 backdrop-blur">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-400/15 text-red-100"><i className="fas fa-triangle-exclamation"></i></div>
                <p className="mt-4 text-2xl font-bold">Alert</p>
                <p className="mt-1 text-sm text-white/70">Nhấn mạnh cảnh báo cần xử lý</p>
              </div>
              <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4 backdrop-blur">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-100"><i className="fas fa-shield-halved"></i></div>
                <p className="mt-4 text-2xl font-bold">Secure</p>
                <p className="mt-1 text-sm text-white/70">Phân quyền theo vai trò</p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center">
          <div className="clinical-panel w-full overflow-hidden">
            <div className="clinical-panel-header">
              <div>
                <p className="panel-eyebrow">Đăng nhập</p>
                <h2 className="section-title">Vào workspace</h2>
                <p className="section-subtitle">Sử dụng email và mật khẩu đã đăng ký.</p>
              </div>
              <span className="status-chip is-success">An toàn</span>
            </div>
            <div className="clinical-panel-body">
              <div className="highlight-band info mb-5">
                <div className="highlight-band-icon"><i className="fas fa-circle-info"></i></div>
                <div>
                  <h3>Tài khoản demo</h3>
                  <p>Chọn nhanh một vai trò để đi thẳng vào luồng kiểm thử.</p>
                </div>
              </div>

              <div className="grid gap-2">
                {demoAccounts.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => applyDemoAccount(account)}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-surface-line bg-white/85 px-4 py-3 text-left shadow-soft transition hover:border-brand-200 hover:bg-brand-50"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-ink-900">{account.role}</span>
                      <span className="block truncate text-xs text-ink-500">{account.email}</span>
                    </span>
                    <i className="fas fa-arrow-right text-brand-600"></i>
                  </button>
                ))}
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
                    placeholder="Tối thiểu 6 ký tự"
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                  {loading ? <><span className="spinner-border spinner-border-sm"></span>Đang đăng nhập...</> : <><i className="fas fa-right-to-bracket me-2"></i>Đăng nhập</>}
                </button>
              </form>

              <p className="mt-6 text-sm text-ink-600">
                Chưa có tài khoản?{" "}
                <Link to="/register" className="font-semibold text-brand-700 hover:text-brand-800">
                  Tạo tài khoản mới
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Login
