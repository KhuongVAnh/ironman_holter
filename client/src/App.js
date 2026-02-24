"use client"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import "bootstrap/dist/css/bootstrap.min.css"

import Login from "./components/Login"
import Register from "./components/Register"
import PatientDashboard from "./components/patient/PatientDashboard"
import PatientHistory from "./components/patient/PatientHistory"
import PatientAlerts from "./components/patient/PatientAlerts"
import PatientProfile from "./components/patient/PatientProfile"
import PatientChat from "./components/patient/PatientChat"
import PatientAccess from "./components/patient/PatientAccess"
import PatientHistorySecond from "./components/patient/PatientHistorySecond";
import PatientDeviceRegistration from "./components/patient/PatientDeviceRegistration"
import DoctorDashboard from "./components/doctor/DoctorDashboard"
import DoctorPatients from "./components/doctor/DoctorPatients"
import DoctorReports from "./components/doctor/DoctorReports"
import DoctorHistoryPanel from "./components/doctor/DoctorHistoryPanel";
import DoctorAccessRequests from "./components/doctor/DoctorAccessRequests"
import PatientDetail from "./components/doctor/PatientDetail"
import DoctorChat from "./components/doctor/DoctorChat"
import FamilyDashboard from "./components/family/FamilyDashboard"
import FamilyMonitoring from "./components/family/FamilyMonitoring"
import FamilyAccessRequests from "./components/family/FamilyAccessRequests"
import FamilyHistoryPanel from "./components/family/FamilyHistoryPanel"
import ProtectedRoute from "./components/ProtectedRoute"
import Navbar from "./components/Navbar"
import Unauthorized from "./components/Unauthorized"
import AdminDashboard from "./components/admin/AdminDashboard"
import AdminUsers from "./components/admin/AdminUsers"
import AdminDevices from "./components/admin/AdminDevices"
import AdminLogs from "./components/admin/AdminLogs"
import Chatbot from "./components/shared/Chatbot"
import useSocket from "./hooks/useSocket"
import { ROLE, getDashboardPath } from "./services/string"

const AppContent = () => {
  const { user, loading } = useAuth()

  useSocket(user?.user_id, user?.role)

  const defaultRoute = getDashboardPath(user?.role)

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="App">
      {user && <Navbar />}
      <Routes>
        <Route
          path="/"
          element={
            user ? (
              <Navigate
                to={defaultRoute}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="/login" element={!user ? <Login /> : <Navigate to={defaultRoute} />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to={defaultRoute} />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Patient Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={[ROLE.BENH_NHAN]}>
              <PatientDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute allowedRoles={[ROLE.BENH_NHAN]}>
              <PatientHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/alerts"
          element={
            <ProtectedRoute allowedRoles={[ROLE.BENH_NHAN]}>
              <PatientAlerts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patient/access"
          element={
            <ProtectedRoute allowedRoles={[ROLE.BENH_NHAN]}>
              <PatientAccess />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={[ROLE.BENH_NHAN]}>
              <PatientProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute allowedRoles={[ROLE.BENH_NHAN]}>
              <PatientChat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patient/history"
          element={
            <ProtectedRoute allowedRoles={[ROLE.BENH_NHAN]}>
              <PatientHistorySecond />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patient/devices"
          element={
            <ProtectedRoute allowedRoles={[ROLE.BENH_NHAN]}>
              <PatientDeviceRegistration />
            </ProtectedRoute>
          }
        />

        {/* Doctor Routes */}
        <Route
          path="/doctor/dashboard"
          element={
            <ProtectedRoute allowedRoles={[ROLE.BAC_SI]}>
              <DoctorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor/patients"
          element={
            <ProtectedRoute allowedRoles={[ROLE.BAC_SI]}>
              <DoctorPatients />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor/access-requests"
          element={
            <ProtectedRoute allowedRoles={[ROLE.BAC_SI]}>
              <DoctorAccessRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor/history"
          element={
            <ProtectedRoute allowedRoles={[ROLE.BAC_SI]}>
              <Navigate to="/doctor/patients" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor/history/:patientId"
          element={
            <ProtectedRoute allowedRoles={[ROLE.BAC_SI]}>
              <DoctorHistoryPanel />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor/patient/:patientId"
          element={
            <ProtectedRoute allowedRoles={[ROLE.BAC_SI]}>
              <PatientDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor/reports"
          element={
            <ProtectedRoute allowedRoles={[ROLE.BAC_SI]}>
              <DoctorReports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor/chat"
          element={
            <ProtectedRoute allowedRoles={[ROLE.BAC_SI]}>
              <DoctorChat />
            </ProtectedRoute>
          }
        />

        {/* Family Routes */}
        <Route
          path="/family/dashboard"
          element={
            <ProtectedRoute allowedRoles={[ROLE.GIA_DINH]}>
              <FamilyDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/family/monitoring"
          element={
            <ProtectedRoute allowedRoles={[ROLE.GIA_DINH]}>
              <FamilyMonitoring />
            </ProtectedRoute>
          }
        />
        <Route
          path="/family/access-requests"
          element={
            <ProtectedRoute allowedRoles={[ROLE.GIA_DINH]}>
              <FamilyAccessRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/family/history/:patientId"
          element={
            <ProtectedRoute allowedRoles={[ROLE.GIA_DINH]}>
              <FamilyHistoryPanel />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={[ROLE.ADMIN]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={[ROLE.ADMIN]}>
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/devices"
          element={
            <ProtectedRoute allowedRoles={[ROLE.ADMIN]}>
              <AdminDevices />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/logs"
          element={
            <ProtectedRoute allowedRoles={[ROLE.ADMIN]}>
              <AdminLogs />
            </ProtectedRoute>
          }
        />

        <Route
          path="/"
          element={
            <Navigate
              to={defaultRoute}
            />
          }
        />
      </Routes>

      {user && <Chatbot userId={user.user_id} userRole={user.role} />}

      <ToastContainer position="bottom-right" autoClose={3000} />
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
