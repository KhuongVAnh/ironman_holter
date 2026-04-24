import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import { medicalVisitsApi, medicationPlansApi } from "../../services/api"
import { useAuth } from "../../contexts/AuthContext"
import MedicalVisitList from "../shared/MedicalVisitList"
import MedicalVisitForm from "../shared/MedicalVisitForm"
import MedicationPlanList from "../shared/MedicationPlanList"
import MedicationPlanForm from "../shared/MedicationPlanForm"

const PatientMedicalHistory = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("visits")
  const [visits, setVisits] = useState([])
  const [plans, setPlans] = useState([])
  const [showVisitForm, setShowVisitForm] = useState(false)
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [editVisit, setEditVisit] = useState(null)
  const [editPlan, setEditPlan] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchRecords = async () => {
    if (!user?.user_id) return
    try {
      setLoading(true)
      const [visitResponse, planResponse] = await Promise.all([
        medicalVisitsApi.getByUser(user.user_id),
        medicationPlansApi.getByUser(user.user_id),
      ])
      setVisits(visitResponse.data || [])
      setPlans(planResponse.data || [])
    } catch (error) {
      console.error(error)
      toast.error("Không thể tải hồ sơ y tế")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [user?.user_id])

  const closeVisitForm = () => {
    setShowVisitForm(false)
    setEditVisit(null)
  }

  const closePlanForm = () => {
    setShowPlanForm(false)
    setEditPlan(null)
  }

  const handleVisitSubmit = async (data) => {
    try {
      const response = data.visit_id ? await medicalVisitsApi.update(data.visit_id, data) : await medicalVisitsApi.create(data)
      toast.success(response.data.message || "Đã lưu lần khám")
      closeVisitForm()
      fetchRecords()
    } catch (error) {
      console.error(error)
      toast.error(error.response?.data?.error || "Không thể lưu lần khám")
    }
  }

  const handleVisitDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa lần khám này?")) return
    try {
      await medicalVisitsApi.delete(id)
      toast.warning("Đã xóa lần khám")
      fetchRecords()
    } catch (error) {
      console.error(error)
      toast.error(error.response?.data?.error || "Không thể xóa lần khám")
    }
  }

  const handlePlanSubmit = async (data) => {
    try {
      const response = data.plan_id ? await medicationPlansApi.update(data.plan_id, data) : await medicationPlansApi.create(data)
      toast.success(response.data.message || "Đã lưu đơn thuốc")
      closePlanForm()
      fetchRecords()
    } catch (error) {
      console.error(error)
      toast.error(error.response?.data?.error || "Không thể lưu đơn thuốc")
    }
  }

  const handlePlanDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa đơn thuốc này?")) return
    try {
      await medicationPlansApi.delete(id)
      toast.warning("Đã xóa đơn thuốc")
      fetchRecords()
    } catch (error) {
      console.error(error)
      toast.error(error.response?.data?.error || "Không thể xóa đơn thuốc")
    }
  }

  return (
    <div className="app-card">
      <div className="app-card-header">
        <div>
          <h1 className="section-title"><i className="fas fa-notes-medical me-2 text-brand-600"></i>Hồ sơ y tế của tôi</h1>
          <p className="section-subtitle">Quản lý lịch sử khám chữa bệnh, đơn thuốc và kế hoạch thuốc đang theo dõi.</p>
        </div>
        {activeTab === "plans" ? (
          <button type="button" className="btn btn-primary" onClick={() => setShowPlanForm(true)}>
            <i className="fas fa-plus me-2"></i>Thêm đơn thuốc
          </button>
        ) : null}
      </div>
      <div className="app-card-body space-y-4">
        <div className="inline-flex rounded-xl border border-surface-line bg-surface-soft p-1">
          <button type="button" className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === "visits" ? "bg-white text-brand-700 shadow-soft" : "text-ink-600"}`} onClick={() => setActiveTab("visits")}>
            Lịch sử khám bệnh
          </button>
          <button type="button" className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === "plans" ? "bg-white text-brand-700 shadow-soft" : "text-ink-600"}`} onClick={() => setActiveTab("plans")}>
            Đơn thuốc đã uống
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><div className="spinner-border"></div></div>
        ) : activeTab === "visits" ? (
          <MedicalVisitList visits={visits} role={user.role} onCreate={() => setShowVisitForm(true)} onEdit={(record) => { setEditVisit(record); setShowVisitForm(true) }} onDelete={handleVisitDelete} />
        ) : (
          <MedicationPlanList plans={plans} role={user.role} onEdit={(record) => { setEditPlan(record); setShowPlanForm(true) }} onDelete={handlePlanDelete} />
        )}

        <MedicalVisitForm show={showVisitForm} handleClose={closeVisitForm} onSubmit={handleVisitSubmit} initialData={editVisit} />
        <MedicationPlanForm show={showPlanForm} handleClose={closePlanForm} onSubmit={handlePlanSubmit} initialData={editPlan} />
      </div>
    </div>
  )
}

export default PatientMedicalHistory
