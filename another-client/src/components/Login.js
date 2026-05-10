import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import { motion } from "framer-motion"
import { HeartPulse, ArrowRight, ShieldCheck, User } from "lucide-react"
import { API_BASE_URL } from "../config/env"
import { useAuth } from "../contexts/AuthContext"
import "../styles/landing.css"

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
      // Ignore wake-up errors
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
    <div className="landing-hero relative min-h-screen flex items-center justify-center font-sans text-ink-900 px-4 sm:px-6 lg:px-8">
      {/* Navigation Bar */}
      <nav className="absolute left-0 right-0 top-0 z-50">
        <div className="mx-auto flex h-20 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 transition-transform hover:scale-105">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-soft">
              <HeartPulse size={20} />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-brand-700">
              Iron <span className="font-light">Holter</span>
            </span>
          </Link>
        </div>
      </nav>

      {/* Animated ECG SVG Background */}
      <div className="ecg-line-container opacity-30">
        <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 1000 200">
          <path
            className="ecg-path"
            d="M0,100 L200,100 L220,100 L240,60 L260,140 L280,20 L300,180 L320,100 L340,100 L1000,100"
            fill="none"
            stroke="#e11d48"
            strokeWidth="4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-3xl border border-surface-line bg-white/80 p-8 shadow-2xl backdrop-blur-2xl sm:p-10">
          <div className="mb-8 text-center">
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink-900">
              Truy cập tài khoản
            </h1>
            <p className="mt-2 text-sm text-ink-500">
              Chào mừng bạn quay lại với IronPulse.
            </p>
          </div>

          {/* Demo Accounts */}
          <div className="mb-8">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-500">
              <User size={14} /> Chọn tài khoản Demo
            </div>
            <div className="grid grid-cols-3 gap-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.role}
                  type="button"
                  onClick={() => applyDemoAccount(account)}
                  className="rounded-xl border border-surface-line bg-white py-2 text-xs font-medium text-ink-600 transition-all hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                >
                  {account.role}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                  className="w-full rounded-xl border border-surface-line bg-white px-4 py-3 text-sm text-ink-900 placeholder-ink-400 outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Mật khẩu</label>
              <div className="relative">
                <input
                  type="password"
                  value={formData.password}
                  onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
                  className="w-full rounded-xl border border-surface-line bg-white px-4 py-3 text-sm text-ink-900 placeholder-ink-400 outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition-all hover:bg-brand-500 hover:shadow-brand-600/40 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <span className="ui-spinner ui-spinner-sm !border-white/30 !border-t-white"></span>
              ) : (
                <>
                  Đăng nhập
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-2 border-t border-surface-line pt-6 text-sm text-ink-500">
            <ShieldCheck size={16} className="text-emerald-500" />
            <span>Kết nối an toàn & mã hóa đầu cuối</span>
          </div>

          <p className="mt-6 text-center text-sm text-ink-600">
            Chưa có tài khoản?{" "}
            <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default Login
