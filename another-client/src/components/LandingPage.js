import React from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { Activity, ShieldAlert, HeartPulse, Stethoscope, Lock, ArrowRight, ActivitySquare, CheckCircle2 } from "lucide-react"
import "../styles/landing.css"

// Import assets
import deviceImg from "../assets/device.png"
import shirtImg from "../assets/shirt+device.png"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 },
  },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100 },
  },
}

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-surface font-sans text-ink-900 selection:bg-brand-500 selection:text-white">
      {/* Navigation */}
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-brand-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-soft">
              <HeartPulse size={20} />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-brand-700">
              Ironman <span className="font-light">Holter</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-ink-700 transition-colors hover:text-brand-600">
              Đăng nhập
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-soft transition-transform hover:scale-105 hover:bg-brand-500"
            >
              Đăng ký
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero relative flex min-h-screen items-center justify-center pt-24 pb-20 overflow-hidden">
        {/* Animated ECG SVG Background */}
        <div className="ecg-line-container opacity-20">
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

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-left"
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-sm font-semibold text-brand-600 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500"></span>
                </span>
                Hệ thống cảnh báo thời gian thực
              </div>
              <h1 className="landing-glow-text mb-6 font-display text-5xl font-extrabold tracking-tight text-ink-900 sm:text-6xl xl:text-7xl">
                Lắng Nghe Trái Tim,<br />
                <span className="animated-gradient-text">Bảo Vệ Người Bạn Yêu Thương.</span>
              </h1>
              <p className="mb-10 max-w-2xl text-lg text-ink-600 sm:text-xl leading-relaxed">
                Không chỉ là những chỉ số y khoa khô khan. Chúng tôi mang đến sự an tâm tuyệt đối cho bạn và gia đình với công nghệ theo dõi nhịp tim 24/7, cảnh báo thông minh và kết nối tức thì với bác sĩ chuyên khoa.
              </p>
              <div className="flex flex-col items-center sm:items-start sm:flex-row gap-4">
                <Link
                  to="/register"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-brand-600 px-8 text-base font-bold text-white shadow-xl transition-all hover:scale-105 hover:bg-brand-700"
                >
                  Trải nghiệm ngay <ArrowRight size={20} />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex h-14 items-center justify-center rounded-full border border-brand-200 bg-white px-8 text-base font-bold text-ink-900 backdrop-blur-md transition-all hover:bg-brand-50"
                >
                  Xem cách hoạt động
                </Link>
              </div>
            </motion.div>

            {/* Device Image with Floating Animation */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="relative flex justify-center lg:justify-end"
            >
              <motion.div
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative"
              >
                <div className="absolute -inset-10 bg-brand-500/10 blur-[100px] rounded-full"></div>
                <img 
                  src={deviceImg} 
                  alt="Ironman Holter Device" 
                  className="relative z-10 w-full max-w-[500px] rounded-3xl overflow-hidden drop-shadow-[0_35px_35px_rgba(225,29,72,0.15)]" 
                />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust Metrics Section */}
      <section className="relative z-20 -mt-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-3xl border border-white/60 bg-white/80 p-8 shadow-holterAmbient backdrop-blur-xl sm:p-10">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { label: "Độ chính xác AI", value: "99.8%" },
              { label: "Độ trễ cảnh báo", value: "< 2s" },
              { label: "Bảo mật chuẩn", value: "HIPAA" },
              { label: "Theo dõi liên tục", value: "24/7" },
            ].map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="font-display text-3xl font-extrabold text-brand-600 sm:text-4xl">{stat.value}</div>
                <div className="mt-2 text-sm font-semibold uppercase tracking-wider text-ink-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="font-display text-3xl font-bold text-ink-900 sm:text-4xl">Công nghệ thấu hiểu từng nhịp đập</h2>
            <p className="mt-4 text-lg text-ink-600">Mọi tính năng đều được thiết kế với một mục đích duy nhất: Sự bình an của bạn và gia đình.</p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid gap-8 md:grid-cols-3"
          >
            {[
              {
                icon: <ActivitySquare size={32} />,
                title: "ECG Thời Gian Thực",
                desc: "Truyền dữ liệu nhịp tim liên tục với độ trễ gần như bằng 0. Giao diện trực quan như trong phòng ICU.",
                color: "text-sky-600",
                bg: "bg-sky-100",
              },
              {
                icon: <ShieldAlert size={32} />,
                title: "AI Phân Tích & Cảnh Báo",
                desc: "Hệ thống tự động phát hiện rung nhĩ, ngoại tâm thu và các dấu hiệu bất thường, gửi thông báo lập tức.",
                color: "text-brand-600",
                bg: "bg-brand-100",
              },
              {
                icon: <Lock size={32} />,
                title: "Bảo Mật & Chia Sẻ",
                desc: "Dữ liệu được mã hóa đầu cuối. Bạn có toàn quyền cấp phép cho bác sĩ hoặc người thân theo dõi.",
                color: "text-emerald-600",
                bg: "bg-emerald-100",
              },
            ].map((feature, idx) => (
              <motion.div key={idx} variants={itemVariants} className="landing-feature-card group">
                <div className={`mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl ${feature.bg} ${feature.color} shadow-soft transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                  {feature.icon}
                </div>
                <h3 className="mb-3 text-xl font-bold text-ink-900">{feature.title}</h3>
                <p className="text-ink-600 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Smart Shirt Showcase Section */}
      <section className="bg-white py-24 overflow-hidden border-t border-surface-line">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative order-2 lg:order-1"
            >
              <div className="absolute -inset-10 bg-brand-500/5 blur-[80px] rounded-full"></div>
              <img 
                src={shirtImg} 
                alt="Smart Shirt Technology" 
                className="relative z-10 w-full rounded-3xl shadow-2xl" 
              />
              
              {/* Animated pulses over the image points if we wanted to be fancy, 
                  but since the labels are already in the image, we can just highlight the core concept */}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="order-1 lg:order-2"
            >
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-600 uppercase tracking-widest">
                Cuộc cách mạng Wearable
              </div>
              <h2 className="mb-6 font-display text-4xl font-bold text-ink-900 sm:text-5xl">
                Không chỉ là thiết bị,<br/>
                <span className="text-brand-600">Đó là một hệ sinh thái.</span>
              </h2>
              <p className="mb-8 text-lg text-ink-600 leading-relaxed">
                Tích hợp trực tiếp vào trang phục hàng ngày, giải pháp Smart Shirt của chúng tôi theo dõi toàn diện các chỉ số sinh tồn mà không gây cảm giác khó chịu hay vướng víu.
              </p>
              
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  "Điện tâm đồ (ECG)",
                  "SpO2 & Huyết áp",
                  "Âm tim & Phổi",
                  "Gia tốc & Vận động",
                  "Thể tích lồng ngực",
                  "Đường huyết AI"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-brand-500" />
                    <span className="font-semibold text-ink-800">{item}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-10">
                <p className="italic text-ink-500 border-l-4 border-brand-200 pl-4">
                  "Giải pháp tối ưu cho việc theo dõi sức khỏe người cao tuổi và bệnh nhân mãn tính tại nhà."
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Seamless Transition Section */}
      <section className="bg-surface-soft py-24 text-ink-900 border-t border-surface-line">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="mb-6 font-display text-3xl font-bold sm:text-4xl">Không bao giờ đơn độc trên hành trình chăm sóc sức khỏe</h2>
              <p className="mb-8 text-lg text-ink-600 leading-relaxed">
                Chúng tôi hiểu rằng sự an tâm lớn nhất đến từ việc biết luôn có chuyên gia bên cạnh. Hệ thống của chúng tôi không chỉ gửi cảnh báo, mà còn tự động chia sẻ hồ sơ sức khỏe chi tiết với bác sĩ điều trị của bạn ngay khi cần thiết.
              </p>
              <ul className="space-y-4">
                {[
                  "Phân tích dữ liệu chuyên sâu giúp chẩn đoán chính xác hơn.",
                  "Người thân cũng có thể theo dõi tiến trình hồi phục.",
                  "Tương tác và nhận tư vấn trực tiếp từ bác sĩ."
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-ink-700">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                      <Stethoscope size={14} />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-brand-600 to-accent-600 opacity-10 blur-2xl"></div>
              <div className="relative rounded-2xl border border-surface-line bg-white p-2 shadow-2xl">
                {/* Mockup of dashboard */}
                <div className="overflow-hidden rounded-xl bg-surface-soft">
                   <div className="flex items-center gap-2 bg-white px-4 py-3 border-b border-surface-line">
                     <div className="h-3 w-3 rounded-full bg-red-400"></div>
                     <div className="h-3 w-3 rounded-full bg-amber-400"></div>
                     <div className="h-3 w-3 rounded-full bg-emerald-400"></div>
                   </div>
                   <div className="p-6">
                      <div className="mb-4 h-8 w-1/3 rounded-lg bg-surface-line"></div>
                      <div className="mb-4 h-32 w-full rounded-xl bg-surface-line/50 relative overflow-hidden">
                         <div className="absolute top-1/2 w-full h-0.5 bg-brand-500/50"></div>
                         <svg className="absolute inset-0 w-full h-full text-brand-500" viewBox="0 0 100 100" preserveAspectRatio="none">
                           <path d="M0,50 Q10,50 15,30 T30,70 T40,50 T100,50" fill="none" stroke="currentColor" strokeWidth="2" />
                         </svg>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="h-20 rounded-xl bg-surface-line/50"></div>
                        <div className="h-20 rounded-xl bg-surface-line/50"></div>
                        <div className="h-20 rounded-xl bg-surface-line/50"></div>
                      </div>
                   </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <footer className="bg-surface py-20 text-center">
        <h2 className="mb-8 font-display text-3xl font-bold text-ink-900">Sẵn sàng trải nghiệm?</h2>
        <div className="flex justify-center gap-4">
          <Link
            to="/register"
            className="inline-flex h-12 items-center justify-center rounded-full bg-brand-600 px-8 font-bold text-white shadow-holterAmbient hover:bg-brand-700"
          >
            Tạo tài khoản miễn phí
          </Link>
        </div>
        <p className="mt-16 text-sm text-ink-500">© 2026 Ironman Holter. Đã đăng ký bản quyền.</p>
      </footer>
    </div>
  )
}

export default LandingPage
