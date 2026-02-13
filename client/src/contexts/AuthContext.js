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

  // Cấu hình axios interceptor
  useEffect(() => {
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`
    } else {
      delete api.defaults.headers.common["Authorization"]
    }
  }, [token])

  // Kiểm tra token khi component mount
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await authApi.me()
          setUser(response.data.user)
        } catch (error) {
          console.error("Token không hợp lệ:", error)
          logout()
        }
      }
      setLoading(false)
    }

    checkAuth()
  }, [token])

  const login = async (email, password) => {
    try {
      const response = await authApi.login(email, password)

      const { token: newToken, user: userData } = response.data

      localStorage.setItem("token", newToken)
      setToken(newToken)
      setUser(userData)

      return { success: true, message: response.data.message }
    } catch (error) {
      const message = error.response?.data?.message || "Đăng nhập thất bại"
      return { success: false, message }
    }
  }

  const register = async (name, email, password, role = ROLE.BENH_NHAN) => {
    try {
      const response = await authApi.register(name, email, password, role)

      const { token: newToken, user: userData } = response.data

      localStorage.setItem("token", newToken)
      setToken(newToken)
      setUser(userData)

      return { success: true, message: response.data.message }
    } catch (error) {
      const message = error.response?.data?.message || "Đăng ký thất bại"
      return { success: false, message }
    }
  }

  const logout = () => {
    localStorage.removeItem("token")
    setToken(null)
    setUser(null)
    delete api.defaults.headers.common["Authorization"]
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
