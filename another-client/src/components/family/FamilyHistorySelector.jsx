import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import { useAuth } from "../../contexts/AuthContext"
import { familyApi } from "../../services/api"

const FamilyHistorySelector = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.user_id) fetchPatients()
  }, [user?.user_id])

  const fetchPatients = async () => {
    try {
      setLoading(true)
      const response = await familyApi.getPatients(user.user_id)
      setPatients(response.data || [])
    } catch (error) {
      console.error("Lỗi tải danh sách bệnh nhân:", error)
      toast.error("Không thể tải danh sách bệnh nhân")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="page-hero-icon"><i className="fas fa-book-medical"></i></div>
        <div className="min-w-0 flex-1">
          <p className="panel-eyebrow">Hồ sơ người thân</p>
          <h1 className="page-hero-title">Chọn bệnh nhân để xem hồ sơ</h1>
          <p className="page-hero-subtitle">Danh sách chỉ hiển thị các bệnh nhân đã cấp quyền cho tài khoản gia đình.</p>
        </div>
      </section>
      <section className="clinical-panel overflow-hidden">
        <div className="clinical-panel-header"><div><h2 className="section-title">Người thân được cấp quyền</h2><p className="section-subtitle">Mở hồ sơ để xem lần khám và đơn thuốc.</p></div></div>
        <div className="clinical-panel-body">
          {loading ? <div className="flex justify-center py-10"><div className="spinner-border"></div></div> : patients.length === 0 ? (
            <div className="empty-state-rich"><div className="empty-state-rich-icon info"><i className="fas fa-user-lock"></i></div><h3>Chưa có bệnh nhân nào</h3><p>Khi bệnh nhân cấp quyền, hồ sơ sẽ xuất hiện tại đây.</p></div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {patients.map((item) => (
                <article key={item.permission_id || item.patient?.user_id} className="rounded-2xl border border-surface-line bg-white p-4 shadow-soft">
                  <p className="font-bold text-ink-900">{item.patient?.name}</p>
                  <p className="text-sm text-ink-500">{item.patient?.email}</p>
                  <button type="button" className="btn btn-outline-primary btn-sm mt-4" onClick={() => navigate(`/family/history/${item.patient.user_id}`)}><i className="fas fa-folder-open me-1"></i>Xem hồ sơ</button>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default FamilyHistorySelector
