import { Navigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="space-y-3 text-center"><div className="mx-auto spinner-border"></div><p className="text-sm font-semibold text-ink-600">Đang tải dữ liệu...</p></div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) return <Navigate to="/unauthorized" replace />
  return children
}

export default ProtectedRoute
