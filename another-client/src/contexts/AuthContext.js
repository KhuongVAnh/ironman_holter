"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { authApi, api } from "../services/api"
import { ROLE } from "../services/string"

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth phải được sử dụng trong AuthProvider")
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem("token"))

  // Hàm dọn toàn bộ trạng thái xác thực ở phía client mà không bắt buộc gọi API logout.
  // Dùng cho các tình huống restore phiên thất bại để tránh xóa refresh token quá sớm chỉ vì một lần kiểm tra lỗi.
  const clearClientAuthState = () => {
    localStorage.removeItem("token")
    setToken(null)
    setUser(null)
    delete api.defaults.headers.common.Authorization
  }

  // Hàm áp access token mới vào cả localStorage, state React và axios default header.
  // Gom chung một chỗ để các luồng login, register và refresh không cập nhật lệch nhau.
  const applyAccessToken = (nextToken) => {
    if (nextToken) {
      localStorage.setItem("token", nextToken)
      setToken(nextToken)
      api.defaults.headers.common.Authorization = `Bearer ${nextToken}`
      return
    }

    localStorage.removeItem("token")
    setToken(null)
    delete api.defaults.headers.common.Authorization
  }

  // Hàm lấy thông tin người dùng hiện tại sau khi frontend đã có access token hợp lệ.
  // Tách riêng bước này để mọi luồng restore phiên đều dùng cùng một cách đồng bộ user state.
  const fetchCurrentUser = async () => {
    const response = await authApi.me()
    setUser(response.data.user)
    return response.data.user
  }

  // Hàm thử khôi phục phiên bằng refresh token đang nằm trong cookie httpOnly.
  // Nếu refresh thành công, frontend sẽ nhận access token mới rồi gọi tiếp /auth/me để dựng lại user session đầy đủ.
  const restoreSessionFromRefreshToken = async () => {
    const refreshResponse = await authApi.refresh()
    const refreshedToken = refreshResponse.data?.token

    if (!refreshedToken) {
      throw new Error("Backend không trả access token mới khi refresh phiên")
    }

    // Sau khi refresh thành công, cập nhật token trước để request /auth/me kế tiếp luôn mang Authorization đúng.
    applyAccessToken(refreshedToken)
    return fetchCurrentUser()
  }

  // Đồng bộ Authorization header với state token để các request phát sinh ngoài luồng bootstrap vẫn luôn dùng token mới nhất.
  useEffect(() => {
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`
    } else {
      delete api.defaults.headers.common.Authorization
    }
  }, [token])

  // Hàm bootstrap phiên khi ứng dụng khởi động.
  // Ưu tiên dùng access token đang lưu; nếu không có hoặc token cũ hỏng thì thử phục hồi bằng refresh token.
  useEffect(() => {
    const bootstrapAuth = async () => {
      const storedToken = localStorage.getItem("token")

      try {
        // Nếu còn access token trong localStorage, thử dùng nó trước để tránh một round-trip refresh không cần thiết.
        if (storedToken) {
          applyAccessToken(storedToken)
          await fetchCurrentUser()
          return
        }

        // Khi access token đã mất nhưng refresh token vẫn còn trong cookie, bước này sẽ dựng lại phiên đúng nghiệp vụ.
        await restoreSessionFromRefreshToken()
      } catch (_error) {
        try {
          // Nếu access token cũ lỗi, thử refresh thêm một lần để xử lý trường hợp token hết hạn nhưng refresh token vẫn còn sống.
          if (storedToken) {
            await restoreSessionFromRefreshToken()
            return
          }
        } catch (refreshError) {
          console.error("Khôi phục phiên thất bại:", refreshError)
        }

        // Không gọi logout ở đây vì logout sẽ yêu cầu backend xóa refresh token; bootstrap thất bại không đồng nghĩa người dùng chủ động đăng xuất.
        clearClientAuthState()
      } finally {
        setLoading(false)
      }
    }

    bootstrapAuth()
  }, [])

  // Hàm đăng nhập và đồng bộ ngay token + user vào state phía client.
  const login = async (email, password) => {
    try {
      const response = await authApi.login(email, password)

      const { token: newToken, user: userData } = response.data

      applyAccessToken(newToken)
      setUser(userData)

      return { success: true, message: response.data.message }
    } catch (error) {
      const message = error.response?.data?.message || "Đăng nhập thất bại"
      return { success: false, message }
    }
  }

  // Hàm đăng ký tài khoản mới và dựng phiên đăng nhập ngay sau khi backend trả token.
  const register = async (name, email, password, role = ROLE.BENH_NHAN) => {
    try {
      const response = await authApi.register(name, email, password, role)

      const { token: newToken, user: userData } = response.data

      applyAccessToken(newToken)
      setUser(userData)

      return { success: true, message: response.data.message }
    } catch (error) {
      const message = error.response?.data?.message || "Đăng ký thất bại"
      return { success: false, message }
    }
  }

  // Hàm đăng xuất chủ động do người dùng thao tác.
  // Khác với bootstrap thất bại, luồng này mới thực sự gọi backend để revoke token và xóa refresh cookie.
  const logout = async () => {
    try {
      await authApi.logout()
    } catch (_error) {
    }

    clearClientAuthState()
  }

  const value = {
    user,
    login,
    register,
    logout,
    loading,
    isAuthenticated: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
