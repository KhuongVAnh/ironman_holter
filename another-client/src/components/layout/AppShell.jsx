import { useEffect, useMemo, useState } from "react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import { useAuth } from "../../contexts/AuthContext"
import { accessApi } from "../../services/api"
import { ROLE, ROLE_LABELS, getDashboardPath } from "../../services/string"
import NotificationBell from "../notifications/NotificationBell"

const NAV_ITEMS = {
  [ROLE.BENH_NHAN]: [
    { to: "/dashboard", label: "Tổng quan", icon: "fas fa-table-cells-large" },
    { to: "/history", label: "Lịch sử đo", icon: "fas fa-clock-rotate-left" },
    { to: "/alerts", label: "Cảnh báo", icon: "fas fa-triangle-exclamation" },
    { to: "/patient/access", label: "Cấp quyền truy cập", icon: "fas fa-key" },
    { to: "/patient/history", label: "Bệnh sử", icon: "fas fa-notes-medical" },
    { to: "/chat", label: "Tư vấn", icon: "fas fa-comments" },
    { to: "/patient/devices", label: "Thiết bị", icon: "fas fa-microchip" },
  ],
  [ROLE.BAC_SI]: [
    { to: "/doctor/dashboard", label: "Điều phối", icon: "fas fa-wave-square" },
    { to: "/doctor/patients", label: "Bệnh nhân", icon: "fas fa-user-group" },
    { to: "/doctor/access-requests", label: "Yêu cầu truy cập", icon: "fas fa-user-check", pending: true },
    { to: "/doctor/reports", label: "Báo cáo", icon: "fas fa-file-lines" },
    { to: "/doctor/chat", label: "Tin nhắn", icon: "fas fa-comments" },
  ],
  [ROLE.GIA_DINH]: [
    { to: "/family/dashboard", label: "Tổng quan", icon: "fas fa-house-medical" },
    { to: "/family/monitoring", label: "Theo dõi", icon: "fas fa-heart-pulse" },
    { to: "/family/access-requests", label: "Yêu cầu truy cập", icon: "fas fa-user-shield", pending: true },
    { to: "/family/history", label: "Bệnh sử", icon: "fas fa-book-medical" },
  ],
  [ROLE.ADMIN]: [
    { to: "/admin/dashboard", label: "Tổng quan", icon: "fas fa-chart-pie" },
    { to: "/admin/users", label: "Người dùng", icon: "fas fa-users-gear" },
    { to: "/admin/devices", label: "Thiết bị", icon: "fas fa-microchip" },
    { to: "/admin/logs", label: "Nhật ký", icon: "fas fa-scroll" },
  ],
}

const PAGE_TITLES = [
  { match: "/dashboard", title: "Tổng quan sức khỏe" },
  { match: "/history", title: "Lịch sử và dữ liệu" },
  { match: "/alerts", title: "Cảnh báo tim mạch" },
  { match: "/patient/access", title: "Cấp quyền truy cập" },
  { match: "/patient/history", title: "Bệnh sử cá nhân" },
  { match: "/patient/devices", title: "Quản lý thiết bị" },
  { match: "/doctor/dashboard", title: "Điều phối lâm sàng" },
  { match: "/doctor/patients", title: "Danh sách bệnh nhân" },
  { match: "/doctor/access-requests", title: "Yêu cầu truy cập" },
  { match: "/doctor/reports", title: "Báo cáo chuyên môn" },
  { match: "/doctor/chat", title: "Trao đổi với bệnh nhân" },
  { match: "/family/dashboard", title: "Tổng quan người thân" },
  { match: "/family/monitoring", title: "Giám sát sức khỏe" },
  { match: "/family/access-requests", title: "Yêu cầu theo dõi" },
  { match: "/family/history", title: "Bệnh sử người thân" },
  { match: "/admin/dashboard", title: "Điều hành hệ thống" },
  { match: "/admin/users", title: "Quản trị người dùng" },
  { match: "/admin/devices", title: "Quản trị thiết bị" },
  { match: "/admin/logs", title: "Nhật ký hệ thống" },
  { match: "/notifications", title: "Thông báo" },
  { match: "/profile", title: "Hồ sơ cá nhân" },
]

const getPageMeta = (pathname) => PAGE_TITLES.find((item) => pathname.startsWith(item.match))?.title || "Ironman Holter"

const AppShell = ({ children }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const navItems = useMemo(() => NAV_ITEMS[user?.role] || [], [user?.role])
  const pageTitle = useMemo(() => getPageMeta(location.pathname), [location.pathname])

  useEffect(() => {
    setDrawerOpen(false)
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const loadPending = async () => {
      if (!user || (user.role !== ROLE.BAC_SI && user.role !== ROLE.GIA_DINH)) {
        setPendingCount(0)
        return
      }
      try {
        const response = await accessApi.getPending()
        setPendingCount(Array.isArray(response.data) ? response.data.length : 0)
      } catch (error) {
        console.error("Không thể tải số yêu cầu đang chờ:", error)
      }
    }

    loadPending()
    const interval = window.setInterval(loadPending, 30000)
    return () => window.clearInterval(interval)
  }, [user])

  const handleLogout = () => {
    logout()
    toast.success("Đăng xuất thành công")
    navigate("/login")
  }

  const asideWidthClass = sidebarCollapsed ? "lg:w-[112px]" : "lg:w-[320px]"

  const sidebar = (
    <div className={`flex h-full flex-col gap-6 overflow-y-auto bg-white py-6 ${sidebarCollapsed ? "px-3" : "px-5"}`}>
      <div className={`rounded-[28px] bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 text-white shadow-float ${sidebarCollapsed ? "p-3" : "p-5"}`}>
        <button
          type="button"
          className={`flex w-full items-center text-left ${sidebarCollapsed ? "justify-center" : "gap-3"}`}
          onClick={() => navigate(getDashboardPath(user?.role))}
          title="Về trang tổng quan"
        >
          <div className={`flex items-center justify-center rounded-2xl bg-white/15 text-2xl ${sidebarCollapsed ? "h-12 w-12" : "h-14 w-14"}`}>
            <i className="fas fa-heart-pulse"></i>
          </div>
          {!sidebarCollapsed ? (
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/70">Ironman Holter</p>
              <h1 className="text-xl font-bold leading-tight">Theo dõi tim mạch</h1>
              <p className="mt-1 text-sm text-white/75">Không gian làm việc theo vai trò cho hệ thống Holter.</p>
            </div>
          ) : null}
        </button>
      </div>

      <div className={`rounded-[28px] border border-surface-line bg-surface-panel shadow-soft ${sidebarCollapsed ? "p-3" : "p-5"}`}>
        <div className={`flex ${sidebarCollapsed ? "justify-center" : "items-center gap-4"}`}>
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-brand-100 bg-brand-50 text-xl font-bold text-brand-700">
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          {!sidebarCollapsed ? (
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-ink-900">{user?.name || "Người dùng"}</p>
              <p className="truncate text-sm text-ink-600">{user?.email || "-"}</p>
              <span className="mt-2 inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                {ROLE_LABELS[user?.role] || "Người dùng"}
              </span>
            </div>
          ) : null}
        </div>

        <div className="mt-6 space-y-2">
          {navItems.map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.label}
                className={`group flex items-center rounded-2xl text-sm font-semibold transition ${active ? "bg-brand-600 text-white shadow-float" : "text-ink-700 hover:bg-brand-50 hover:text-brand-700"} ${sidebarCollapsed ? "justify-center px-3 py-3" : "justify-between px-4 py-3"}`}
              >
                <span className={`flex items-center ${sidebarCollapsed ? "justify-center" : "gap-3"}`}>
                  <i className={`${item.icon} text-base ${active ? "text-white" : "text-brand-600"}`}></i>
                  {!sidebarCollapsed ? item.label : null}
                </span>
                {item.pending && pendingCount > 0 ? (
                  <span className={`min-w-6 rounded-full px-2 py-1 text-center text-xs font-bold ${active ? "bg-white/15 text-white" : "bg-clinical-danger text-white"} ${sidebarCollapsed ? "absolute ml-7 -mt-6" : ""}`}>
                    {pendingCount}
                  </span>
                ) : null}
              </NavLink>
            )
          })}
        </div>
      </div>

      {user?.role === ROLE.BENH_NHAN && !sidebarCollapsed ? (
        <div className="rounded-[28px] border border-surface-line bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink-900">Không gian điều trị</h2>
            <i className="fas fa-user-doctor text-brand-600"></i>
          </div>
          <div className="space-y-3 text-sm text-ink-600">
            <p className="rounded-[24px] border border-surface-line bg-surface px-4 py-4">Bạn có thể chia sẻ dữ liệu với bác sĩ hoặc người thân ngay trong menu bên trái.</p>
            <button type="button" className="btn btn-primary w-full" onClick={() => navigate("/patient/access")}>
              <i className="fas fa-key"></i>
              Quản lý quyền truy cập
            </button>
          </div>
        </div>
      ) : null}

      <div className={`mt-auto rounded-[28px] border border-surface-line bg-ink-900 text-white shadow-soft ${sidebarCollapsed ? "p-3" : "p-5"}`}>
        {sidebarCollapsed ? (
          <div className="flex justify-center" title="Hỗ trợ khẩn cấp: gọi 115 nếu có dấu hiệu nguy cấp.">
            <i className="fas fa-siren-on text-lg"></i>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold">Hỗ trợ khẩn cấp</p>
            <p className="mt-2 text-sm text-white/75">Nếu xuất hiện dấu hiệu nguy cấp, hãy liên hệ 115 và thông báo cho cơ sở y tế gần nhất.</p>
          </>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-surface text-ink-900">
      <div className="lg:flex">
        <div className={`fixed inset-0 z-40 bg-ink-900/50 transition lg:hidden ${drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => setDrawerOpen(false)}></div>

        <aside className={`fixed inset-y-0 left-0 z-50 w-[320px] max-w-[88vw] border-r border-surface-line bg-white transition-all duration-300 lg:translate-x-0 ${asideWidthClass} ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}>
          {sidebar}
        </aside>

        <div className={`hidden transition-all duration-300 lg:block lg:flex-none ${asideWidthClass}`}></div>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-surface-line bg-white/90 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <button type="button" className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-surface-line bg-surface-panel text-ink-800 lg:hidden" onClick={() => setDrawerOpen(true)}>
                  <i className="fas fa-bars"></i>
                </button>
                <button
                  type="button"
                  className="hidden h-12 w-12 items-center justify-center rounded-2xl border border-surface-line bg-surface-panel text-ink-800 lg:inline-flex"
                  onClick={() => setSidebarCollapsed((prev) => !prev)}
                  title={sidebarCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
                >
                  <i className={`fas ${sidebarCollapsed ? "fa-angles-right" : "fa-angles-left"}`}></i>
                </button>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-600">Clinical workspace</p>
                  <h2 className="text-xl font-bold text-ink-900 sm:text-2xl">{pageTitle}</h2>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <NotificationBell />
                <button type="button" className="inline-flex h-12 items-center gap-3 rounded-2xl border border-surface-line bg-white px-3 shadow-soft" onClick={() => setMenuOpen((prev) => !prev)}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="hidden text-left sm:block">
                    <p className="max-w-[180px] truncate text-sm font-semibold text-ink-900">{user?.name}</p>
                    <p className="text-xs text-ink-500">{ROLE_LABELS[user?.role] || "Người dùng"}</p>
                  </div>
                  <i className={`fas fa-chevron-down text-xs text-ink-500 transition ${menuOpen ? "rotate-180" : ""}`}></i>
                </button>
              </div>
            </div>

            {menuOpen ? (
              <div className="border-t border-surface-line px-4 py-3 sm:px-6 lg:px-8">
                <div className="flex flex-wrap items-center gap-3">
                  {user?.role === ROLE.BENH_NHAN ? (
                    <button type="button" className="btn btn-outline-primary" onClick={() => navigate("/profile")}>
                      <i className="fas fa-user"></i>
                      Hồ sơ
                    </button>
                  ) : null}
                  <button type="button" className="btn btn-outline-secondary" onClick={() => navigate("/notifications")}>
                    <i className="fas fa-bell"></i>
                    Thông báo
                  </button>
                  <button type="button" className="btn btn-outline-danger" onClick={handleLogout}>
                    <i className="fas fa-right-from-bracket"></i>
                    Đăng xuất
                  </button>
                </div>
              </div>
            ) : null}
          </header>

          <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  )
}

export default AppShell
