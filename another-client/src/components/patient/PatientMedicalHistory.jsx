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
    <div className="page-shell">
      <section className="page-hero">
        <div className="page-hero-icon"><i className="fas fa-notes-medical"></i></div>
        <div className="min-w-0 flex-1">
          <p className="panel-eyebrow">Hồ sơ y tế</p>
          <h1 className="page-hero-title">Lịch sử khám và đơn thuốc</h1>
          <p className="page-hero-subtitle">Gom các lần khám, nhận định và kế hoạch dùng thuốc để dễ đối chiếu với dữ liệu ECG.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => activeTab === "plans" ? setShowPlanForm(true) : setShowVisitForm(true)}>
          <i className="fas fa-plus me-2"></i>{activeTab === "plans" ? "Thêm đơn thuốc" : "Thêm lần khám"}
        </button>
      </section>

      <section className="metric-grid">
        <div className="priority-metric metric-info">
          <div className="metric-icon"><i className="fas fa-stethoscope"></i></div>
          <p className="metric-label">Lần khám</p>
          <p className="metric-value">{visits.length}</p>
          <p className="metric-helper">Mốc khám đã ghi nhận</p>
        </div>
        <div className="priority-metric metric-warning">
          <div className="metric-icon"><i className="fas fa-pills"></i></div>
          <p className="metric-label">Đơn thuốc</p>
          <p className="metric-value">{plans.length}</p>
          <p className="metric-helper">Kế hoạch dùng thuốc đã lưu</p>
        </div>
        <div className="priority-metric metric-success">
          <div className="metric-icon"><i className="fas fa-folder-open"></i></div>
          <p className="metric-label">Đang xem</p>
          <p className="metric-value text-2xl">{activeTab === "plans" ? "Đơn thuốc" : "Lần khám"}</p>
          <p className="metric-helper">Chuyển tab để xem nhóm còn lại</p>
        </div>
      </section>

      <section className="clinical-panel overflow-hidden">
        <div className="clinical-panel-header">
          <div>
            <p className="panel-eyebrow">Dữ liệu y tế</p>
            <h2 className="section-title">{activeTab === "plans" ? "Đơn thuốc đã uống" : "Lịch sử khám bệnh"}</h2>
            <p className="section-subtitle">Thông tin phụ trợ giúp bác sĩ hiểu bối cảnh khi đọc ECG.</p>
          </div>
          <div className="inline-flex rounded-xl border border-surface-line bg-surface-soft p-1">
            <button type="button" className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === "visits" ? "bg-white text-brand-700 shadow-soft" : "text-ink-600"}`} onClick={() => setActiveTab("visits")}>
              Lịch sử khám
            </button>
            <button type="button" className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === "plans" ? "bg-white text-brand-700 shadow-soft" : "text-ink-600"}`} onClick={() => setActiveTab("plans")}>
              Đơn thuốc
            </button>
          </div>
        </div>
        <div className="clinical-panel-body space-y-4">
          <div className="highlight-band info">
            <div className="highlight-band-icon"><i className="fas fa-circle-info"></i></div>
            <div>
              <h3>{activeTab === "plans" ? "Theo dõi thuốc đang dùng" : "Ghi lại bối cảnh thăm khám"}</h3>
              <p>{activeTab === "plans" ? "Đơn thuốc giúp đối chiếu triệu chứng và thay đổi nhịp tim theo thời gian." : "Các lần khám giúp hệ thống có thêm dữ liệu nền khi đánh giá bất thường."}</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><div className="spinner-border"></div></div>
          ) : activeTab === "visits" ? (
            <MedicalVisitList visits={visits} role={user.role} onCreate={() => setShowVisitForm(true)} onEdit={(record) => { setEditVisit(record); setShowVisitForm(true) }} onDelete={handleVisitDelete} />
          ) : (
            <MedicationPlanList plans={plans} role={user.role} onEdit={(record) => { setEditPlan(record); setShowPlanForm(true) }} onDelete={handlePlanDelete} />
          )}

          <MedicalVisitForm show={showVisitForm} handleClose={closeVisitForm} onSubmit={handleVisitSubmit} initialData={editVisit} />
          <MedicationPlanForm show={showPlanForm} handleClose={closePlanForm} onSubmit={handlePlanSubmit} initialData={editPlan} />
        </div>
      </section>
    </div>
  )
}

export default PatientMedicalHistory
