"use client"

import { Suspense, lazy } from "react"
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import ProtectedRoute from "./components/ProtectedRoute"
import Unauthorized from "./components/Unauthorized"
import AppShell from "./components/layout/AppShell"
import Chatbot from "./components/shared/Chatbot"
import useSocket from "./hooks/useSocket"
import { ROLE, getDashboardPath } from "./services/string"

const Login = lazy(() => import("./components/Login"))
const Register = lazy(() => import("./components/Register"))
const PatientDashboard = lazy(() => import("./components/patient/PatientDashboard"))
const PatientHistory = lazy(() => import("./components/patient/PatientHistory"))
const PatientAlerts = lazy(() => import("./components/patient/PatientAlerts"))
const PatientProfile = lazy(() => import("./components/patient/PatientProfile"))
const PatientChat = lazy(() => import("./components/patient/PatientChat"))
const PatientAccess = lazy(() => import("./components/patient/PatientAccess"))
const PatientMedicalHistory = lazy(() => import("./components/patient/PatientMedicalHistory"))
const PatientDeviceRegistration = lazy(() => import("./components/patient/PatientDeviceRegistration"))
const DoctorDashboard = lazy(() => import("./components/doctor/DoctorDashboard"))
const DoctorPatients = lazy(() => import("./components/doctor/DoctorPatients"))
const DoctorReports = lazy(() => import("./components/doctor/DoctorReports"))
const DoctorHistoryPanel = lazy(() => import("./components/doctor/DoctorHistoryPanel"))
const DoctorAccessRequests = lazy(() => import("./components/doctor/DoctorAccessRequests"))
const PatientDetail = lazy(() => import("./components/doctor/PatientDetail"))
const DoctorChat = lazy(() => import("./components/doctor/DoctorChat"))
const FamilyDashboard = lazy(() => import("./components/family/FamilyDashboard"))
const FamilyMonitoring = lazy(() => import("./components/family/FamilyMonitoring"))
const FamilyAccessRequests = lazy(() => import("./components/family/FamilyAccessRequests"))
const FamilyHistorySelector = lazy(() => import("./components/family/FamilyHistorySelector"))
const FamilyHistoryPanel = lazy(() => import("./components/family/FamilyHistoryPanel"))
const AdminDashboard = lazy(() => import("./components/admin/AdminDashboard"))
const AdminUsers = lazy(() => import("./components/admin/AdminUsers"))
const AdminDevices = lazy(() => import("./components/admin/AdminDevices"))
const AdminLogs = lazy(() => import("./components/admin/AdminLogs"))
const NotificationsPage = lazy(() => import("./components/notifications/NotificationsPage"))

const ScreenLoader = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="space-y-4 text-center">
      <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
      <p className="text-sm font-semibold text-ink-600">Đang tải giao diện...</p>
    </div>
  </div>
)

const AppContent = () => {
  const { user, loading } = useAuth()

  useSocket(user?.user_id, user?.role)

  const defaultRoute = getDashboardPath(user?.role)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
          <p className="text-sm font-semibold text-ink-600">Đang tải hệ thống...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface text-ink-900">
      <Suspense fallback={<ScreenLoader />}>
        {user ? (
          <AppShell>
            <Routes>
              <Route path="/" element={<Navigate to={defaultRoute} />} />
              <Route path="/login" element={<Navigate to={defaultRoute} />} />
              <Route path="/register" element={<Navigate to={defaultRoute} />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute allowedRoles={[ROLE.BENH_NHAN, ROLE.BAC_SI, ROLE.GIA_DINH, ROLE.ADMIN]}>
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/dashboard" element={<ProtectedRoute allowedRoles={[ROLE.BENH_NHAN]}><PatientDashboard /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute allowedRoles={[ROLE.BENH_NHAN]}><PatientHistory /></ProtectedRoute>} />
              <Route path="/alerts" element={<ProtectedRoute allowedRoles={[ROLE.BENH_NHAN]}><PatientAlerts /></ProtectedRoute>} />
              <Route path="/patient/access" element={<ProtectedRoute allowedRoles={[ROLE.BENH_NHAN]}><PatientAccess /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute allowedRoles={[ROLE.BENH_NHAN]}><PatientProfile /></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute allowedRoles={[ROLE.BENH_NHAN]}><PatientChat /></ProtectedRoute>} />
              <Route path="/patient/history" element={<ProtectedRoute allowedRoles={[ROLE.BENH_NHAN]}><PatientMedicalHistory /></ProtectedRoute>} />
              <Route path="/patient/devices" element={<ProtectedRoute allowedRoles={[ROLE.BENH_NHAN]}><PatientDeviceRegistration /></ProtectedRoute>} />
              <Route path="/doctor/dashboard" element={<ProtectedRoute allowedRoles={[ROLE.BAC_SI]}><DoctorDashboard /></ProtectedRoute>} />
              <Route path="/doctor/patients" element={<ProtectedRoute allowedRoles={[ROLE.BAC_SI]}><DoctorPatients /></ProtectedRoute>} />
              <Route path="/doctor/access-requests" element={<ProtectedRoute allowedRoles={[ROLE.BAC_SI]}><DoctorAccessRequests /></ProtectedRoute>} />
              <Route path="/doctor/history" element={<ProtectedRoute allowedRoles={[ROLE.BAC_SI]}><Navigate to="/doctor/patients" /></ProtectedRoute>} />
              <Route path="/doctor/history/:patientId" element={<ProtectedRoute allowedRoles={[ROLE.BAC_SI]}><DoctorHistoryPanel /></ProtectedRoute>} />
              <Route path="/doctor/patient/:patientId" element={<ProtectedRoute allowedRoles={[ROLE.BAC_SI]}><PatientDetail /></ProtectedRoute>} />
              <Route path="/doctor/reports" element={<ProtectedRoute allowedRoles={[ROLE.BAC_SI]}><DoctorReports /></ProtectedRoute>} />
              <Route path="/doctor/chat" element={<ProtectedRoute allowedRoles={[ROLE.BAC_SI]}><DoctorChat /></ProtectedRoute>} />
              <Route path="/family/dashboard" element={<ProtectedRoute allowedRoles={[ROLE.GIA_DINH]}><FamilyDashboard /></ProtectedRoute>} />
              <Route path="/family/monitoring" element={<ProtectedRoute allowedRoles={[ROLE.GIA_DINH]}><FamilyMonitoring /></ProtectedRoute>} />
              <Route path="/family/access-requests" element={<ProtectedRoute allowedRoles={[ROLE.GIA_DINH]}><FamilyAccessRequests /></ProtectedRoute>} />
              <Route path="/family/history/:patientId" element={<ProtectedRoute allowedRoles={[ROLE.GIA_DINH]}><FamilyHistoryPanel /></ProtectedRoute>} />
              <Route path="/family/history" element={<ProtectedRoute allowedRoles={[ROLE.GIA_DINH]}><FamilyHistorySelector /></ProtectedRoute>} />
              <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={[ROLE.ADMIN]}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute allowedRoles={[ROLE.ADMIN]}><AdminUsers /></ProtectedRoute>} />
              <Route path="/admin/devices" element={<ProtectedRoute allowedRoles={[ROLE.ADMIN]}><AdminDevices /></ProtectedRoute>} />
              <Route path="/admin/logs" element={<ProtectedRoute allowedRoles={[ROLE.ADMIN]}><AdminLogs /></ProtectedRoute>} />
            </Routes>
            <Chatbot userId={user.user_id} userRole={user.role} />
          </AppShell>
        ) : (
          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        )}
      </Suspense>

      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        toastClassName={() => "rounded-3xl border border-surface-line bg-white px-4 py-3 text-sm font-medium text-ink-800 shadow-panel"}
        bodyClassName={() => "p-0"}
      />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  )
}

export default App
