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
  const asideWidthClass = sidebarCollapsed ? "lg:w-[88px]" : "lg:w-[288px]"
  const contentOffsetClass = sidebarCollapsed ? "lg:w-[112px]" : "lg:w-[312px]"

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
    <div className="flex h-full flex-col overflow-y-auto bg-white/80 text-holter-primary shadow-holterAmbient backdrop-blur-[20px]">
      <button
        type="button"
        className={`flex min-h-[88px] items-center px-5 text-left transition hover:bg-white/35 ${sidebarCollapsed ? "justify-center" : "gap-4"}`}
        onClick={() => navigate(getDashboardPath(user?.role))}
        title="Về trang tổng quan"
      >
        <span className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-full bg-holter-primaryContainer text-holter-mintSoft shadow-holterAmbient">
          <i className="fas fa-heart-pulse text-sm"></i>
        </span>
        {!sidebarCollapsed ? (
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-bold leading-6 text-holter-primaryContainer">Ironman Holter</span>
            <span className="block truncate text-[10px] font-semibold uppercase leading-4 tracking-[0.18em] text-holter-primaryContainer/60">{ROLE_LABELS[user?.role] || "Người dùng"}</span>
          </span>
        ) : null}
      </button>

      <nav className="flex-1 space-y-2 px-4 py-3">
        {!sidebarCollapsed ? <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-holter-primaryContainer/45">Menu</p> : null}
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
              className={`group relative flex min-h-12 items-center overflow-hidden rounded-xl text-[11px] font-bold uppercase tracking-[0.12em] transition duration-300 ${
                active
                  ? "bg-holter-mintSoft text-holter-primaryContainer shadow-soft"
                  : "text-holter-primaryContainer/70 hover:translate-x-1 hover:bg-white/45 hover:text-holter-primaryContainer"
              } ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-3"}`}
            >
              <span className={`flex min-w-0 items-center ${sidebarCollapsed ? "justify-center" : "gap-3"}`}>
                <span
                  className={`inline-flex h-9 w-9 flex-none items-center justify-center rounded-xl transition ${
                    active ? "bg-white/70 text-holter-primaryContainer" : "bg-white/25 text-holter-primaryContainer/70 group-hover:bg-white/55 group-hover:text-holter-primaryContainer"
                  }`}
                >
                  <i className={`${item.icon} text-sm`}></i>
                </span>
                {!sidebarCollapsed ? <span className="truncate">{item.label}</span> : null}
              </span>
              {item.pending && pendingCount > 0 ? (
                <span className={`${sidebarCollapsed ? "absolute right-1.5 top-1.5 min-w-4 text-[9px]" : "min-w-5 text-[10px]"} rounded-full bg-holter-primaryContainer px-1.5 py-0.5 text-center font-bold text-white ring-2 ring-white/70`}>
                  {pendingCount}
                </span>
              ) : null}
            </NavLink>
          )
        })}
      </nav>

      <div className="mt-auto border-t border-holter-outline/40 p-4">
        <div className={`flex items-center rounded-2xl border border-white/35 bg-white/35 p-2.5 shadow-soft ${sidebarCollapsed ? "justify-center" : "gap-3"}`}>
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-holter-primaryContainer text-xs font-bold text-white">
            {userInitial}
          </div>
          {!sidebarCollapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-5 text-holter-primaryContainer">{user?.name || "Người dùng"}</p>
              <p className="truncate text-[11px] leading-4 text-holter-muted">{user?.email || "-"}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-holter-surface text-ink-900">
      <div className="lg:flex">
        <div
          className={`fixed inset-0 z-40 bg-holter-primary/55 transition lg:hidden ${drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
          onClick={() => setDrawerOpen(false)}
        ></div>

        <aside className={`fixed inset-y-0 left-0 z-50 w-[276px] max-w-[88vw] overflow-hidden border-r border-holter-outline/50 bg-white/90 shadow-panel transition-all duration-300 lg:bottom-6 lg:left-6 lg:top-6 lg:h-auto lg:translate-x-0 lg:rounded-[24px] lg:border lg:border-white/45 lg:bg-white/30 lg:shadow-holterAmbient lg:backdrop-blur-[20px] ${asideWidthClass} ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}>
          {sidebar}
        </aside>

        <div className={`hidden transition-all duration-300 lg:block lg:flex-none ${contentOffsetClass}`}></div>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 px-3 pt-3 sm:px-4 lg:px-6 lg:pt-6">
            <div className="flex min-h-[68px] items-center justify-between gap-3 rounded-[24px] border border-white/45 bg-white/55 px-4 shadow-holterAmbient backdrop-blur-[20px] sm:px-5">
              <div className="flex min-w-0 items-center gap-2">
                <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/45 bg-white/65 text-holter-primaryContainer shadow-soft hover:bg-holter-mintSoft lg:hidden" onClick={() => setDrawerOpen(true)} title="Mở menu">
                  <i className="fas fa-bars"></i>
                </button>
                <button
                  type="button"
                  className="hidden h-10 w-10 items-center justify-center rounded-xl border border-white/45 bg-white/65 text-holter-primaryContainer shadow-soft hover:bg-holter-mintSoft lg:inline-flex"
                  onClick={() => setSidebarCollapsed((prev) => !prev)}
                  title={sidebarCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
                >
                  <i className={`fas ${sidebarCollapsed ? "fa-arrow-right" : "fa-arrow-left"} text-sm`}></i>
                </button>
                <div className="min-w-0">
                  <h2 className="truncate font-display text-xl font-bold leading-7 text-holter-primaryContainer">{pageTitle}</h2>
                  <p className="hidden truncate text-xs font-semibold uppercase tracking-[0.12em] text-holter-muted sm:block">{ROLE_LABELS[user?.role] || "Người dùng"}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <NotificationBell />
                <button
                  type="button"
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/45 bg-white/65 px-1.5 text-holter-primaryContainer shadow-soft hover:bg-holter-mintSoft sm:pr-3"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  aria-expanded={menuOpen}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-holter-primaryContainer text-[11px] font-bold text-white">
                    {userInitial}
                  </span>
                  <span className="hidden min-w-0 text-left sm:block">
                    <span className="block max-w-[150px] truncate text-xs font-bold leading-4">{user?.name || "Người dùng"}</span>
                  </span>
                  <i className={`fas fa-chevron-down text-xs text-holter-muted transition ${menuOpen ? "rotate-180" : ""}`}></i>
                </button>
              </div>
            </div>

            {menuOpen ? (
              <div className="absolute right-3 top-[84px] w-64 rounded-2xl border border-white/60 bg-white/95 p-2 shadow-panel backdrop-blur-xl sm:right-4 lg:right-6 lg:top-[96px]">
                <div className="mb-1 flex items-center gap-3 rounded-xl bg-holter-mintSoft/60 p-2.5">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-holter-primaryContainer text-xs font-bold text-white">{userInitial}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-holter-primaryContainer">{user?.name || "Người dùng"}</span>
                    <span className="block truncate text-xs text-holter-muted">{user?.email || "-"}</span>
                  </span>
                </div>
                {user?.role === ROLE.BENH_NHAN ? (
                  <button type="button" className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold text-holter-primaryContainer hover:bg-holter-mintSoft/70" onClick={() => navigate("/profile")}>
                    <i className="fas fa-user w-4 text-center"></i>
                    Hồ sơ
                  </button>
                ) : null}
                <button type="button" className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold text-holter-primaryContainer hover:bg-holter-mintSoft/70" onClick={() => navigate("/notifications")}>
                  <i className="fas fa-bell w-4 text-center"></i>
                  Thông báo
                </button>
                <button type="button" className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50" onClick={handleLogout}>
                  <i className="fas fa-right-from-bracket w-4 text-center"></i>
                  Đăng xuất
                </button>
              </div>
            ) : null}
          </header>

          <main className="flex-1 px-3 py-4 sm:px-4 lg:px-6 lg:py-5">{children}</main>
        </div>
      </div>
    </div>
  )
}

export default AppShell
