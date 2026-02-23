import axios from "axios"

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:4000"
const API_URL = `${API_BASE}/api`

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
})

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
