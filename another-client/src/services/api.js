import axios from "axios"
import { API_BASE_URL } from "../config/env"

const API_BASE = API_BASE_URL
const API_URL = `${API_BASE}/api`

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // cho phép gửi cookie (có chứa refresh token) trong các request
  headers: { "Content-Type": "application/json" },
})

let refreshPromise = null

// Hàm xử lý làm mới access token bằng refresh token. 
// 1 quả hàm cực kỳ thông minh, chỉ gửi 1 request, nhận res mới cho gửi req tiếp
const refreshAccessToken = async () => {
  if (!refreshPromise) { // Nếu chưa có request làm mới nào đang chờ, tạo một request mới
    refreshPromise = api.post("/auth/refresh") // gọi api và giao cho web api xử lý
      .then((response) => { // web api xử lý xong, gọi callback và chạy phần trong then
        const newToken = response.data.token
        localStorage.setItem("token", newToken)
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`
        return newToken
      })
      .finally(() => {
        refreshPromise = null //
      })
  }
  return refreshPromise
}

// api.interceptors.response.use là middleware của axios, gọi là tiền xử lý res
api.interceptors.response.use(
  (response) => response, // thành công thi oke cho đi qua
  async (error) => { // thất bại thì đi qua phần xử lý này
    const originalRequest = error.config //
    const status = error.response?.status

    const isAuthEndpoint =
      originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/register") ||
      originalRequest?.url?.includes("/auth/refresh")

    // _retry là cờ ta tự thêm vào error.config để đánh dấu đã thử refresh token hay chưưa
    // mã lỗi xác thực + chưa thử refresh token + không phải endpoint auth thì mới thử refresh token
    if (status === 401 && !originalRequest?._retry && !isAuthEndpoint) { 
      originalRequest._retry = true

      try {
        const newToken = await refreshAccessToken()
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (refreshError) {
        localStorage.removeItem("token")
        delete api.defaults.headers.common.Authorization
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ========== Auth ==========
export const authApi = {
  me: () => api.get("/auth/me"),
  login: (email, password) => api.post("/auth/login", { email, password }),
  register: (name, email, password, role) => api.post("/auth/register", { name, email, password, role }),
  refresh: () => api.post("/auth/refresh"),
  logout: () => api.post("/auth/logout"),
}

// ========== Users ==========
export const usersApi = {
  getAll: (params) => api.get("/users", { params }),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  changePassword: (currentPassword, newPassword) =>
    api.put("/users/change-password", { currentPassword, newPassword }),
}

// ========== Devices ==========
export const devicesApi = {
  getAll: () => api.get("/devices"),
  getByUser: (userId) => api.get(`/devices/${userId}`),
  register: (data) => api.post("/devices/register", data),
  updateStatus: (deviceId, status) => api.put(`/devices/${deviceId}/status`, { status }),
}

// ========== Readings ==========
export const readingsApi = {
  getHistory: (userId, params) => api.get(`/readings/history/${userId}`, { params }),
  getDetail: (readingId) => api.get(`/readings/detail/${readingId}`),
  getByDevice: (deviceId) => api.get(`/readings/${deviceId}`),
  createFake: (deviceId) => api.post("/readings/fake", { device_id: deviceId }),
}

// ========== Alerts ==========
export const alertsApi = {
  getByUser: (userId, resolved) =>
    api.get(`/alerts/${userId}`, { params: resolved !== undefined ? { resolved } : undefined }),
  getAll: (resolved) => api.get("/alerts", { params: resolved !== undefined ? { resolved } : undefined }),
  resolve: (alertId) => api.put(`/alerts/${alertId}/resolve`),
}

// ========== Notifications ==========
export const notificationsApi = {
  list: (params) => api.get("/notifications", { params }),
  getUnreadCount: () => api.get("/notifications/unread-count"),
  markRead: (notificationId) => api.put(`/notifications/${notificationId}/read`),
  markAllRead: () => api.put("/notifications/read-all"),
}

// ========== Access ==========
export const accessApi = {
  list: (patientId) => api.get(`/access/list/${patientId}`),
  share: (viewerEmail, role) => api.post("/access/share", { viewer_email: viewerEmail, role }),
  respond: (id, action) => api.put(`/access/respond/${id}`, { action }),
  revoke: (id) => api.delete(`/access/${id}`),
  getPending: () => api.get("/access/pending"),
}

// ========== Chat ==========
export const chatApi = {
  getHistory: () => api.get("/chat/history"),
  send: (message) => api.post("/chat", { message }),
  getContacts: () => api.get("/chat/contacts"),
  getDirectHistory: (otherUserId, params) => api.get(`/chat/direct/${otherUserId}`, { params }),
  sendDirect: (receiverId, message) => api.post("/chat/direct", { receiver_id: receiverId, message }),
  markDirectRead: (otherUserId) => api.put(`/chat/direct/${otherUserId}/read`),
}

// ========== History (Medical) ==========
export const historyApi = {
  getByUser: (userId) => api.get(`/history/${userId}`),
  create: (data) => api.post("/history", data),
  update: (id, data) => api.put(`/history/${id}`, data),
  delete: (id) => api.delete(`/history/${id}`),

  getDoctorHistory: (patientId) => api.get(`/doctor/history/${patientId}`),
  addDoctorHistory: (data) => api.post("/doctor/history", data),
  updateDoctorHistory: (id, data) => api.put(`/doctor/history/${id}`, data),
  deleteDoctorHistory: (id) => api.delete(`/doctor/history/${id}`),

  getFamilyHistory: (patientId) => api.get(`/family/history/${patientId}`),
}

// ========== Reports ==========
export const reportsApi = {
  getByPatient: (patientId) => api.get(`/reports/${patientId}`),
  create: (patientId, data) => api.post(`/reports/${patientId}`, data),
  getDoctorReports: () => api.get("/reports/doctor/my-reports"),
}

// ========== Doctor ==========
export const doctorApi = {
  getPatients: (viewerId) => api.get(`/doctor/patients/${viewerId}`),
}

// ========== Family ==========
export const familyApi = {
  getPatients: (viewerId) => api.get(`/family/patients/${viewerId}`),
}

export { api, API_BASE }
export default api
