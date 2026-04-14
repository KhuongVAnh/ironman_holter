import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { toast } from "react-toastify"
import MedicalHistoryList from "../shared/MedicalHistoryList"
import { historyApi } from "../../services/api"
import { ROLE } from "../../services/string"

const FamilyHistoryPanel = () => {
  const { patientId } = useParams()
  const [histories, setHistories] = useState([])

  useEffect(() => {
    if (patientId) fetchHistory()
  }, [patientId])

  const fetchHistory = async () => {
    try {
      const response = await historyApi.getByUser(patientId)
      setHistories(response.data || [])
    } catch (error) {
      console.error("Lỗi tải bệnh sử người thân:", error)
      toast.error("Không thể tải bệnh sử")
    }
  }

  return (
    <section className="app-card">
      <div className="app-card-header">
        <div>
          <h1 className="section-title"><i className="fas fa-heart-pulse me-2 text-brand-600"></i>Bệnh sử bệnh nhân #{patientId}</h1>
          <p className="section-subtitle">Bạn xem được lịch sử bệnh sử đã được chia sẻ từ bệnh nhân.</p>
        </div>
      </div>
      <div className="app-card-body"><MedicalHistoryList histories={histories} role={ROLE.GIA_DINH} /></div>
    </section>
  )
}

export default FamilyHistoryPanel
