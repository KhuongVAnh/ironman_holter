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
      console.error("Loi tai danh sach benh nhan:", error)
      toast.error("Khong the tai danh sach benh nhan")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="app-card">
      <div className="app-card-header"><div><h1 className="section-title"><i className="fas fa-book-medical me-2 text-brand-600"></i>Benh su nguoi than</h1><p className="section-subtitle">Chon benh nhan da duoc cap quyen de mo benh su chi tiet.</p></div></div>
      <div className="app-card-body table-responsive">
        {loading ? <div className="flex justify-center py-8"><div className="spinner-border"></div></div> : (
          <table className="table table-hover align-middle">
            <thead><tr><th>#</th><th>Ten benh nhan</th><th>Email</th><th className="text-end">Thao tac</th></tr></thead>
            <tbody>
              {patients.length === 0 ? <tr><td colSpan="4" className="text-center text-muted py-4">Chua co benh nhan nao duoc cap quyen</td></tr> : patients.map((item, index) => (
                <tr key={item.permission_id || item.patient?.user_id}>
                  <td>{index + 1}</td>
                  <td>{item.patient?.name}</td>
                  <td>{item.patient?.email}</td>
                  <td className="text-end"><button type="button" className="btn btn-outline-primary btn-sm" onClick={() => navigate(`/family/history/${item.patient.user_id}`)}><i className="fas fa-folder-open me-1"></i>Xem benh su</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}

export default FamilyHistorySelector
