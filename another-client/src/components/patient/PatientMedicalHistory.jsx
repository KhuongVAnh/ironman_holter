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
  const [submitting, setSubmitting] = useState(false)

  const fetchHistories = async () => {
    try {
      const response = await historyApi.getByUser(user.user_id)
      setHistories(response.data || [])
    } catch (error) {
      console.error(error)
      toast.error("Không thể tải bệnh sử")
    }
  }

  useEffect(() => {
    if (user?.user_id) fetchHistories()
  }, [user?.user_id])

  const handleCreate = async (data) => {
    try {
      setSubmitting(true)
      const response = await historyApi.create({
        user_id: user.user_id,
        symptoms: data.symptoms,
        condition: data.condition,
        notes: data.notes,
      })
      toast.success(response.data.message || "Đã lưu bệnh sử")
      setShowForm(false)
      fetchHistories()
    } catch (error) {
      console.error(error)
      toast.error(error.response?.data?.error || "Không thể lưu bệnh sử")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="app-card">
      <div className="app-card-header">
        <div>
          <h1 className="section-title"><i className="fas fa-notes-medical me-2 text-brand-600"></i>Bệnh sử của tôi</h1>
          <p className="section-subtitle">Lưu lại triệu chứng, tình trạng hiện tại và các ghi chú sức khỏe quan trọng theo thời gian.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)} disabled={submitting}>
          <i className="fas fa-plus me-2"></i>Thêm ghi chú
        </button>
      </div>
      <div className="app-card-body space-y-4">
        <MedicalHistoryList histories={histories} role={user.role} />
        <MedicalHistoryForm
          show={showForm}
          handleClose={() => setShowForm(false)}
          role={user.role}
          onSubmit={handleCreate}
        />
      </div>
    </div>
  )
}

export default PatientMedicalHistory
