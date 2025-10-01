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
import DoctorDashboard from "./components/doctor/DoctorDashboard"
import DoctorPatients from "./components/doctor/DoctorPatients"
import DoctorReports from "./components/doctor/DoctorReports"
import PatientDetail from "./components/doctor/PatientDetail"
import FamilyDashboard from "./components/family/FamilyDashboard"
import FamilyMonitoring from "./components/family/FamilyMonitoring"
import ProtectedRoute from "./components/ProtectedRoute"
import Navbar from "./components/Navbar"
import Unauthorized from "./components/Unauthorized"
import AdminDashboard from "./components/admin/AdminDashboard"
import AdminUsers from "./components/admin/AdminUsers"
import AdminDevices from "./components/admin/AdminDevices"
import AdminLogs from "./components/admin/AdminLogs"
import Chatbot from "./components/shared/Chatbot"
import useSocket from "./hooks/useSocket"

const AppContent = () => {
  const { user, loading } = useAuth()

  const socketHook = useSocket(user?.id, user?.role)

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
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Patient Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["bệnh nhân"]}>
              <PatientDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute allowedRoles={["bệnh nhân"]}>
              <PatientHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/alerts"
          element={
            <ProtectedRoute allowedRoles={["bệnh nhân"]}>
              <PatientAlerts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={["bệnh nhân"]}>
              <PatientProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute allowedRoles={["bệnh nhân"]}>
              <PatientChat />
            </ProtectedRoute>
          }
        />

        {/* Doctor Routes */}
        <Route
          path="/doctor/dashboard"
          element={
            <ProtectedRoute allowedRoles={["bác sĩ"]}>
              <DoctorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor/patients"
          element={
            <ProtectedRoute allowedRoles={["bác sĩ"]}>
              <DoctorPatients />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor/patient/:patientId"
          element={
            <ProtectedRoute allowedRoles={["bác sĩ"]}>
              <PatientDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor/reports"
          element={
            <ProtectedRoute allowedRoles={["bác sĩ"]}>
              <DoctorReports />
            </ProtectedRoute>
          }
        />

        {/* Family Routes */}
        <Route
          path="/family/dashboard"
          element={
            <ProtectedRoute allowedRoles={["gia đình"]}>
              <FamilyDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/family/monitoring"
          element={
            <ProtectedRoute allowedRoles={["gia đình"]}>
              <FamilyMonitoring />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/devices"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDevices />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/logs"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminLogs />
            </ProtectedRoute>
          }
        />

        <Route
          path="/"
          element={
            <Navigate
              to={
                user?.role === "bác sĩ"
                  ? "/doctor/dashboard"
                  : user?.role === "gia đình"
                    ? "/family/dashboard"
                    : user?.role === "admin"
                      ? "/admin/dashboard"
                      : "/dashboard"
              }
            />
          }
        />
      </Routes>

      {user && <Chatbot userId={user.id} userRole={user.role} />}

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
