import { Navigate, useParams } from "react-router-dom"

const DoctorHistoryPanel = () => {
  const { patientId } = useParams()
  return <Navigate to={`/doctor/patient/${patientId}`} replace />
}

export default DoctorHistoryPanel
