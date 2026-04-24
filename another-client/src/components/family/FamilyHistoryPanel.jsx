import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { toast } from "react-toastify"
import MedicalVisitList from "../shared/MedicalVisitList"
import MedicationPlanList from "../shared/MedicationPlanList"
import { medicalVisitsApi, medicationPlansApi } from "../../services/api"
import { ROLE } from "../../services/string"

const FamilyHistoryPanel = () => {
  const { patientId } = useParams()
  const [activeTab, setActiveTab] = useState("visits")
  const [visits, setVisits] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (patientId) fetchRecords()
  }, [patientId])

  const fetchRecords = async () => {
    try {
      setLoading(true)
      const [visitResponse, planResponse] = await Promise.all([
        medicalVisitsApi.getByUser(patientId),
        medicationPlansApi.getByUser(patientId),
      ])
      setVisits(visitResponse.data || [])
      setPlans(planResponse.data || [])
    } catch (error) {
      console.error("Lỗi tải hồ sơ y tế người thân:", error)
      toast.error("Không thể tải hồ sơ y tế")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="clinical-panel">
      <div className="clinical-panel-header">
        <div>
          <h1 className="section-title"><i className="fas fa-heart-pulse me-2 text-brand-600"></i>Hồ sơ y tế bệnh nhân #{patientId}</h1>
          <p className="section-subtitle">Bạn xem được lịch sử khám chữa bệnh và đơn thuốc đã được bệnh nhân chia sẻ.</p>
        </div>
      </div>
      <div className="clinical-panel-body space-y-4">
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
          <MedicalVisitList visits={visits} role={ROLE.GIA_DINH} />
        ) : (
          <MedicationPlanList plans={plans} role={ROLE.GIA_DINH} />
        )}
      </div>
    </section>
  )
}

export default FamilyHistoryPanel
