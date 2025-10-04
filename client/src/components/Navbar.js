"use client"
import { NavLink, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { toast } from "react-toastify"
import "../styles/customNav.css"

const Navbar = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    toast.success("Đăng xuất thành công")
    navigate("/login")
  }

  const isProfileActive = location.pathname.startsWith("/profile")

  const getNavLinks = () => {
    switch (user?.role) {
      case "bệnh nhân":
        return (
          <>
            <li className="nav-item">
              <NavLink to="/dashboard" className={({ isActive }) => "nav-link custom-link" + (isActive ? " active" : "")}>
                <i className="fas fa-tachometer-alt me-2"></i>Dashboard
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/history" className={({ isActive }) => "nav-link custom-link" + (isActive ? " active" : "")}>
                <i className="fas fa-history me-2"></i>Lịch sử
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/alerts" className={({ isActive }) => "nav-link custom-link" + (isActive ? " active" : "")}>
                <i className="fas fa-exclamation-triangle me-2"></i>Cảnh báo
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/chat" className={({ isActive }) => "nav-link custom-link" + (isActive ? " active" : "")}>
                <i className="fas fa-comments me-2"></i>Tư vấn AI
              </NavLink>
            </li>
          </>
        )
      default:
        return null
    }
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-dark shadow-sm custom-navbar">
      <div className="container-fluid px-4">
        {/* Logo */}
        <NavLink to="/dashboard" className="navbar-brand d-flex align-items-center fw-bold">
          <i className="fas fa-heartbeat me-2 text-light"></i>
          <span>Ironman Holter</span>
        </NavLink>

        {/* Toggle mobile */}
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          {/* Menu left */}
          <ul className="navbar-nav me-auto ms-3 d-flex gap-2">{getNavLinks()}</ul>

          {/* User dropdown */}
          <ul className="navbar-nav">
            <li className="nav-item dropdown">
              <a
                className={`nav-link dropdown-toggle d-flex align-items-center custom-link ${isProfileActive ? "active" : ""}`}
                href="#"
                role="button"
                data-bs-toggle="dropdown"
              >
                {/* Avatar giả (chữ cái đầu) */}
                <div className="user-avatar me-2 text-danger">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <span className="text-light">{user?.name}</span>
              </a>
              <ul className="dropdown-menu dropdown-menu-end shadow-sm">
                <li>
                  <NavLink className="dropdown-item" to="/profile">
                    <i className="fas fa-user-edit me-2"></i> Hồ sơ
                  </NavLink>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button className="dropdown-item" onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt me-2"></i> Đăng xuất
                  </button>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
