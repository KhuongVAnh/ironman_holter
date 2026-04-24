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
    { to: "/patient/history", label: "Hồ sơ y tế", icon: "fas fa-notes-medical" },
    { to: "/chat", label: "Tư vấn", icon: "fas fa-comments" },
    { to: "/patient/access", label: "Cấp quyền truy cập", icon: "fas fa-key" },
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
    { to: "/family/history", label: "Hồ sơ y tế", icon: "fas fa-book-medical" },
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
  { match: "/patient/history", title: "Hồ sơ y tế cá nhân" },
  { match: "/patient/devices", title: "Quản lý thiết bị" },
  { match: "/doctor/dashboard", title: "Điều phối lâm sàng" },
  { match: "/doctor/patient", title: "Workspace bệnh nhân" },
  { match: "/doctor/history", title: "Hồ sơ y tế bệnh nhân" },
  { match: "/doctor/patients", title: "Danh sách bệnh nhân" },
  { match: "/doctor/access-requests", title: "Yêu cầu truy cập" },
  { match: "/doctor/reports", title: "Báo cáo chuyên môn" },
  { match: "/doctor/chat", title: "Trao đổi với bệnh nhân" },
  { match: "/family/dashboard", title: "Tổng quan người thân" },
  { match: "/family/monitoring", title: "Giám sát sức khỏe" },
  { match: "/family/access-requests", title: "Yêu cầu theo dõi" },
  { match: "/family/history", title: "Hồ sơ y tế người thân" },
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
  const asideWidthClass = sidebarCollapsed ? "lg:w-[72px]" : "lg:w-[236px]"

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
    const handleAccessChange = (event) => {
      const payload = event.detail || {}
      if (payload.viewer_id && String(payload.viewer_id) !== String(user?.user_id)) return
      loadPending()
    }
    window.addEventListener("appAccessRequest", handleAccessChange)
    window.addEventListener("appAccessResponse", handleAccessChange)
    window.addEventListener("appAccessRevoke", handleAccessChange)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener("appAccessRequest", handleAccessChange)
      window.removeEventListener("appAccessResponse", handleAccessChange)
      window.removeEventListener("appAccessRevoke", handleAccessChange)
    }
  }, [user])

  const handleLogout = () => {
    logout()
    toast.success("Đăng xuất thành công")
    navigate("/login")
  }

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || "U"

  const sidebar = (
    <div className="flex h-full flex-col overflow-y-auto bg-ink-900 text-white">
      <button
        type="button"
        className={`flex min-h-16 items-center border-b border-white/10 px-3 text-left transition hover:bg-white/5 ${sidebarCollapsed ? "justify-center" : "gap-3"}`}
        onClick={() => navigate(getDashboardPath(user?.role))}
        title="Về trang tổng quan"
      >
        <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-brand-600 text-white shadow-float">
          <i className="fas fa-heart-pulse text-sm"></i>
        </span>
        {!sidebarCollapsed ? (
          <span className="min-w-0">
            <span className="block truncate font-display text-sm font-bold leading-5 text-white">Ironman Holter</span>
            <span className="block truncate text-[11px] font-medium leading-4 text-white/55">{ROLE_LABELS[user?.role] || "Người dùng"}</span>
          </span>
        ) : null}
      </button>

      <nav className="flex-1 space-y-1 px-2 py-3">
        {!sidebarCollapsed ? <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">Menu</p> : null}
        {navItems.map((item) => {
          const active =
            location.pathname === item.to ||
            location.pathname.startsWith(`${item.to}/`) ||
            (item.to === "/doctor/patients" && location.pathname.startsWith("/doctor/patient/"))
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              className={`group relative flex min-h-11 items-center overflow-hidden rounded-lg text-sm transition duration-200 ${
                active
                  ? "bg-white font-bold text-ink-900 shadow-medium"
                  : "font-semibold text-white/68 hover:bg-white/10 hover:text-white"
              } ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-2.5"}`}
            >
              {active ? <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-brand-600"></span> : null}
              <span className={`flex min-w-0 items-center ${sidebarCollapsed ? "justify-center" : "gap-2.5"}`}>
                <span
                  className={`inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg transition ${
                    active ? "bg-brand-50 text-brand-700" : "bg-white/10 text-white/75 group-hover:text-white"
                  }`}
                >
                  <i className={`${item.icon} text-sm`}></i>
                </span>
                {!sidebarCollapsed ? <span className="truncate">{item.label}</span> : null}
              </span>
              {item.pending && pendingCount > 0 ? (
                <span className={`${sidebarCollapsed ? "absolute right-1 top-1 min-w-4 text-[9px]" : "min-w-5 text-[10px]"} rounded-full bg-brand-600 px-1.5 py-0.5 text-center font-bold text-white ring-2 ring-ink-900`}>
                  {pendingCount}
                </span>
              ) : null}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-white/10 p-2">
        <div className={`flex items-center rounded-lg bg-white/10 p-2 ${sidebarCollapsed ? "justify-center" : "gap-2.5"}`}>
          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-white text-xs font-bold text-ink-900">
            {userInitial}
          </div>
          {!sidebarCollapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-5 text-white">{user?.name || "Người dùng"}</p>
              <p className="truncate text-[11px] leading-4 text-white/50">{user?.email || "-"}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-surface text-ink-900">
      <div className="lg:flex">
        <div
          className={`fixed inset-0 z-40 bg-ink-900/50 transition lg:hidden ${drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
          onClick={() => setDrawerOpen(false)}
        ></div>

        <aside className={`fixed inset-y-0 left-0 z-50 w-[276px] max-w-[88vw] border-r border-ink-900 bg-ink-900 shadow-panel transition-all duration-200 lg:translate-x-0 ${asideWidthClass} ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}>
          {sidebar}
        </aside>

        <div className={`hidden transition-all duration-200 lg:block lg:flex-none ${asideWidthClass}`}></div>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-surface-line bg-surface/95 backdrop-blur-xl">
            <div className="flex min-h-[60px] items-center justify-between gap-3 px-3 sm:px-4 lg:px-5">
              <div className="flex min-w-0 items-center gap-2">
                <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-surface-line bg-white text-ink-800 shadow-soft hover:bg-surface-soft lg:hidden" onClick={() => setDrawerOpen(true)} title="Mở menu">
                  <i className="fas fa-bars"></i>
                </button>
                <button
                  type="button"
                  className="hidden h-9 w-9 items-center justify-center rounded-lg border border-surface-line bg-white text-ink-800 shadow-soft hover:bg-surface-soft lg:inline-flex"
                  onClick={() => setSidebarCollapsed((prev) => !prev)}
                  title={sidebarCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
                >
                  <i className={`fas ${sidebarCollapsed ? "fa-arrow-right" : "fa-arrow-left"} text-sm`}></i>
                </button>
                <div className="min-w-0">
                  <h2 className="truncate font-display text-lg font-bold leading-6 text-ink-900">{pageTitle}</h2>
                  <p className="hidden truncate text-xs font-medium text-ink-500 sm:block">{ROLE_LABELS[user?.role] || "Người dùng"}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <NotificationBell />
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-surface-line bg-white px-1.5 text-ink-900 shadow-soft hover:bg-surface-soft sm:pr-2.5"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  aria-expanded={menuOpen}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink-900 text-[11px] font-bold text-white">
                    {userInitial}
                  </span>
                  <span className="hidden min-w-0 text-left sm:block">
                    <span className="block max-w-[150px] truncate text-xs font-bold leading-4">{user?.name || "Người dùng"}</span>
                  </span>
                  <i className={`fas fa-chevron-down text-xs text-ink-600 transition ${menuOpen ? "rotate-180" : ""}`}></i>
                </button>
              </div>
            </div>

            {menuOpen ? (
              <div className="absolute right-3 top-[64px] w-64 rounded-xl border border-surface-line bg-white p-2 shadow-panel sm:right-4 lg:right-5">
                <div className="mb-1 flex items-center gap-3 rounded-lg bg-surface-soft p-2.5">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-ink-900 text-xs font-bold text-white">{userInitial}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-ink-900">{user?.name || "Người dùng"}</span>
                    <span className="block truncate text-xs text-ink-600">{user?.email || "-"}</span>
                  </span>
                </div>
                {user?.role === ROLE.BENH_NHAN ? (
                  <button type="button" className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-ink-800 hover:bg-surface-soft" onClick={() => navigate("/profile")}>
                    <i className="fas fa-user w-4 text-center"></i>
                    Hồ sơ
                  </button>
                ) : null}
                <button type="button" className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-ink-800 hover:bg-surface-soft" onClick={() => navigate("/notifications")}>
                  <i className="fas fa-bell w-4 text-center"></i>
                  Thông báo
                </button>
                <button type="button" className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50" onClick={handleLogout}>
                  <i className="fas fa-right-from-bracket w-4 text-center"></i>
                  Đăng xuất
                </button>
              </div>
            ) : null}
          </header>

          <main className="flex-1 px-3 py-4 sm:px-4 lg:px-5 lg:py-5">{children}</main>
        </div>
      </div>
    </div>
  )
}

export default AppShell
