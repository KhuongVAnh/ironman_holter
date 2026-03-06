import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import { historyApi } from "../../services/api"
import { useAuth } from "../../contexts/AuthContext"
import MedicalHistoryList from "../shared/MedicalHistoryList"
import MedicalHistoryForm from "../shared/MedicalHistoryForm"

const PatientMedicalHistory = () => {
  const { user } = useAuth()
  const [histories, setHistories] = useState([])
  const [showForm, setShowForm] = useState(false)

  const fetchHistories = async () => {
    try {
      const response = await historyApi.getByUser(user.user_id)
      setHistories(response.data || [])
    } catch {
      toast.error("Khong the tai benh su")
    }
  }

  useEffect(() => {
    if (user?.user_id) fetchHistories()
  }, [user?.user_id])

  return (
    <div className="app-card">
      <div className="app-card-header">
        <div>
          <h1 className="section-title"><i className="fas fa-notes-medical me-2 text-brand-600"></i>Benh su cua toi</h1>
          <p className="section-subtitle">Luu lai trieu chung, ghi chu va cac thong tin y te quan trong theo thoi gian.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
          <i className="fas fa-plus me-2"></i>Them ghi chu
        </button>
      </div>
      <div className="app-card-body">
        <MedicalHistoryList histories={histories} role={user.role} />
        <MedicalHistoryForm show={showForm} handleClose={() => setShowForm(false)} role={user.role} onSubmit={() => { toast.success("Da gui ghi chu"); setShowForm(false) }} />
      </div>
    </div>
  )
}

export default PatientMedicalHistory
