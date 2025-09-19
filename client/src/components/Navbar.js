"use client"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { toast } from "react-toastify"

const Navbar = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success("Đăng xuất thành công")
    navigate("/login")
  }

  const getNavLinks = () => {
    switch (user?.role) {
      case "bệnh nhân":
        return (
          <>
            <li className="nav-item">
              <Link className="nav-link" to="/dashboard">
                <i className="fas fa-tachometer-alt me-2"></i>
                Dashboard
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/history">
                <i className="fas fa-history me-2"></i>
                Lịch sử
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/alerts">
                <i className="fas fa-exclamation-triangle me-2"></i>
                Cảnh báo
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/chat">
                <i className="fas fa-comments me-2"></i>
                Tư vấn AI
              </Link>
            </li>
          </>
        )
      case "bác sĩ":
        return (
          <>
            <li className="nav-item">
              <Link className="nav-link" to="/doctor/dashboard">
                <i className="fas fa-tachometer-alt me-2"></i>
                Dashboard
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/doctor/patients">
                <i className="fas fa-users me-2"></i>
                Bệnh nhân
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/doctor/reports">
                <i className="fas fa-file-medical me-2"></i>
                Báo cáo
              </Link>
            </li>
          </>
        )
      case "gia đình":
        return (
          <>
            <li className="nav-item">
              <Link className="nav-link" to="/family/dashboard">
                <i className="fas fa-tachometer-alt me-2"></i>
                Dashboard
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/family/monitoring">
                <i className="fas fa-heart me-2"></i>
                Theo dõi
              </Link>
            </li>
          </>
        )
      case "admin":
        return (
          <>
            <li className="nav-item">
              <Link className="nav-link" to="/admin/dashboard">
                <i className="fas fa-tachometer-alt me-2"></i>
                Dashboard
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/admin/users">
                <i className="fas fa-users-cog me-2"></i>
                Người dùng
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/admin/devices">
                <i className="fas fa-microchip me-2"></i>
                Thiết bị
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/admin/logs">
                <i className="fas fa-chart-bar me-2"></i>
                Thống kê
              </Link>
            </li>
          </>
        )
      default:
        return null
    }
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container">
        <Link className="navbar-brand fw-bold" to="/dashboard">
          <i className="fas fa-heartbeat me-2"></i>
          Ironman Holter
        </Link>

        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">{getNavLinks()}</ul>

          <ul className="navbar-nav">
            <li className="nav-item dropdown">
              <a className="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                <i className="fas fa-user me-2"></i>
                {user?.name}
              </a>
              <ul className="dropdown-menu">
                <li>
                  <Link className="dropdown-item" to="/profile">
                    <i className="fas fa-user-edit me-2"></i>
                    Hồ sơ
                  </Link>
                </li>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                <li>
                  <button className="dropdown-item" onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt me-2"></i>
                    Đăng xuất
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
