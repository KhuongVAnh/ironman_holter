"use client"
import { useEffect, useState } from "react"
import { NavLink, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { toast } from "react-toastify"
import axios from "axios"
import io from "socket.io-client"
import "../styles/customNav.css"

const socket = io("http://localhost:4000")

const Navbar = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [pendingCount, setPendingCount] = useState(0)

  // --- Logout handler ---
  const handleLogout = () => {
    logout()
    toast.success("Đăng xuất thành công")
    navigate("/login")
  }

  const isProfileActive = location.pathname.startsWith("/profile")

  // --- Fetch số lượng yêu cầu chờ ---
  useEffect(() => {
    if (!user) return
    if (user.role !== "bác sĩ" && user.role !== "gia đình") return

    const fetchPending = async () => {
      try {
        const res = await axios.get("http://localhost:4000/api/access/pending")
        setPendingCount(res.data.length)
      } catch (err) {
        console.error("Lỗi khi lấy pending requests:", err.message)
      }
    }

    fetchPending()

    // --- Lắng nghe realtime socket ---
    socket.on("access-request", (data) => {
      if (data.viewer_id === user.user_id) {
        setPendingCount((prev) => prev + 1)
      }
    })

    socket.on("access-response", (data) => {
      if (data.viewer_id === user.user_id) {
        setPendingCount((prev) => Math.max(prev - 1, 0))
      }
    })

    return () => {
      socket.off("access-request")
      socket.off("access-response")
    }
  }, [user])

  // --- Nav link theo role ---
  // --- Nav link theo role ---
  const getNavLinks = () => {
    switch (user?.role) {
      case "bệnh nhân":
        return (
          <>
            <li className="nav-item">
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  "nav-link custom-link" + (isActive ? " active" : "")
                }
              >
                <i className="fas fa-tachometer-alt me-2"></i>Dashboard
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink
                to="/history"
                className={({ isActive }) =>
                  "nav-link custom-link" + (isActive ? " active" : "")
                }
              >
                <i className="fas fa-history me-2"></i>Lịch sử
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink
                to="/alerts"
                className={({ isActive }) =>
                  "nav-link custom-link" + (isActive ? " active" : "")
                }
              >
                <i className="fas fa-exclamation-triangle me-2"></i>Cảnh báo
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink
                to="/patient/access"
                className={({ isActive }) =>
                  "nav-link custom-link" + (isActive ? " active" : "")
                }
              >
                <i className="fas fa-user-shield me-1"></i> Quyền truy cập
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink
                to="/patient/history"
                className={({ isActive }) =>
                  "nav-link custom-link" + (isActive ? " active" : "")
                }
              >
                <i className="fas fa-notes-medical me-2"></i> Bệnh sử
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink
                to="/chat"
                className={({ isActive }) =>
                  "nav-link custom-link" + (isActive ? " active" : "")
                }
              >
                <i className="fas fa-comments me-2"></i>Tư vấn AI
              </NavLink>
            </li>
          </>
        )

      case "bác sĩ":
        return (
          <>
            <li className="nav-item position-relative">
              <NavLink
                to="/doctor/access-requests"
                className={({ isActive }) =>
                  "nav-link custom-link" + (isActive ? " active" : "")
                }
              >
                <i className="fas fa-envelope-open me-1"></i> Danh sách bệnh nhân
                {pendingCount > 0 && (
                  <span className="badge bg-danger ms-2">{pendingCount}</span>
                )}
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink
                to="/doctor/history"
                className={({ isActive }) =>
                  "nav-link custom-link" + (isActive ? " active" : "")
                }
              >
                <i className="fas fa-folder-medical me-2"></i> Hồ sơ bệnh nhân
              </NavLink>
            </li>
          </>
        )

      case "gia đình":
        return (
          <>
            <li className="nav-item position-relative">
              <NavLink
                to="/family/access-requests"
                className={({ isActive }) =>
                  "nav-link custom-link" + (isActive ? " active" : "")
                }
              >
                <i className="fas fa-envelope me-1"></i> Danh sách người thân
                {pendingCount > 0 && (
                  <span className="badge bg-danger ms-2">{pendingCount}</span>
                )}
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink
                to="/family/history"
                className={({ isActive }) =>
                  "nav-link custom-link" + (isActive ? " active" : "")
                }
              >
                <i className="fas fa-heartbeat me-2"></i> Bệnh sử người thân
              </NavLink>
            </li>
          </>
        )

      default:
        return null
    }
  }

  const getDashboardRoute = (role ="bệnh nhân") => {
    switch (role) {
      case "bác sĩ":
        return "/doctor/dashboard"
      case "bệnh nhân":
        return "/dashboard"
      case "gia đình":
        return "/family/dashboard"
      default:
        return "/dashboard"
    }
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-dark shadow-sm custom-navbar">
      <div className="container-fluid px-4">
        {/* Logo */}
        <NavLink to={
          getDashboardRoute(user?.role)
        } className="navbar-brand d-flex align-items-center fw-bold">
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
          {/* Menu trái */}
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
