import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import { motion } from "framer-motion"
import { HeartPulse, ArrowRight, ShieldCheck, Activity, Users, Stethoscope } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import { ROLE, ROLE_LABELS } from "../services/string"
import "../styles/landing.css"

const roleIcons = {
  [ROLE.BENH_NHAN]: <Activity size={24} />,
  [ROLE.GIA_DINH]: <Users size={24} />,
  [ROLE.BAC_SI]: <Stethoscope size={24} />
}

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
    <div className="landing-hero relative min-h-screen flex items-center justify-center font-sans text-ink-900 px-4 py-12 sm:px-6 lg:px-8">
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
      <div className="ecg-line-container opacity-30 fixed">
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-4xl"
      >
        <div className="overflow-hidden rounded-3xl border border-surface-line bg-white/80 shadow-2xl backdrop-blur-2xl">
          <div className="grid lg:grid-cols-2">

            {/* Left Side: Messaging */}
            <div className="flex flex-col justify-between bg-white/60 p-8 sm:p-12 border-b border-surface-line lg:border-b-0 lg:border-r">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600">
                  Tạo tài khoản mới
                </div>
                <h1 className="font-display text-3xl font-bold tracking-tight text-brand-700 sm:text-4xl">
                  Hành trình bảo vệ trái tim bắt đầu từ đây.
                </h1>
                <p className="mt-4 text-ink-600 leading-relaxed">
                  Dù bạn là bệnh nhân, người nhà hay bác sĩ, chúng tôi đều có một không gian được thiết kế riêng để mang lại sự an tâm tuyệt đối.
                </p>
              </div>

              <div className="mt-12 hidden lg:block">
                <div className="flex items-center gap-4 text-sm text-ink-600 mb-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                    <Activity size={20} />
                  </div>
                  <p>Theo dõi nhịp tim 24/7 với độ chính xác y khoa.</p>
                </div>
                <div className="flex items-center gap-4 text-sm text-ink-600">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                    <ShieldCheck size={20} />
                  </div>
                  <p>Hệ thống cảnh báo tự động khi có dấu hiệu bất thường.</p>
                </div>
              </div>
            </div>

            {/* Right Side: Form */}
            <div className="p-8 sm:p-12">
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Role Selection */}
                <div>
                  <label className="mb-3 block text-sm font-bold text-ink-900">Chọn vai trò của bạn</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: ROLE.BENH_NHAN },
                      { value: ROLE.GIA_DINH },
                      { value: ROLE.BAC_SI },
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => updateField("role", item.value)}
                        className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-3 transition-all ${formData.role === item.value
                            ? "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-surface-line bg-white text-ink-500 hover:border-brand-200 hover:bg-brand-50/50 hover:text-brand-600"
                          }`}
                      >
                        {roleIcons[item.value]}
                        <span className="text-xs font-semibold">{ROLE_LABELS[item.value]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink-700">Họ và tên</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(event) => updateField("name", event.target.value)}
                      className="w-full rounded-xl border border-surface-line bg-white px-4 py-3 text-sm text-ink-900 placeholder-ink-400 outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500"
                      placeholder="Nguyễn Văn A"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink-700">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(event) => updateField("email", event.target.value)}
                      className="w-full rounded-xl border border-surface-line bg-white px-4 py-3 text-sm text-ink-900 placeholder-ink-400 outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500"
                      placeholder="you@example.com"
                      required
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-ink-700">Mật khẩu</label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(event) => updateField("password", event.target.value)}
                        className="w-full rounded-xl border border-surface-line bg-white px-4 py-3 text-sm text-ink-900 placeholder-ink-400 outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-ink-700">Xác nhận mật khẩu</label>
                      <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(event) => updateField("confirmPassword", event.target.value)}
                        className="w-full rounded-xl border border-surface-line bg-white px-4 py-3 text-sm text-ink-900 placeholder-ink-400 outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition-all hover:bg-brand-500 hover:shadow-brand-600/40 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? (
                    <span className="ui-spinner ui-spinner-sm !border-white/30 !border-t-white"></span>
                  ) : (
                    <>
                      Tạo tài khoản
                      <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-ink-600">
                Đã có tài khoản?{" "}
                <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
                  Đăng nhập ngay
                </Link>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default Register
