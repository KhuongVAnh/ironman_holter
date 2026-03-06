import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import { accessApi, doctorApi } from "../../services/api"
import { ACCESS_STATUS } from "../../services/string"

const badgeTone = (status) => status === ACCESS_STATUS.PENDING ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"

const DoctorAccessRequests = () => {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [patients, setPatients] = useState([])
  const [respondingId, setRespondingId] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) return
    fetchPendingRequests()
    fetchAcceptedPatients()
  }, [user])

  const fetchPendingRequests = async () => {
    try {
      const response = await accessApi.getPending()
      setRequests(response.data || [])
    } catch (error) {
      console.error(error)
    }
  }

  const fetchAcceptedPatients = async () => {
    try {
      const response = await doctorApi.getPatients(user.user_id)
      setPatients(response.data || [])
    } catch (error) {
      console.error("Loi tai danh sach benh nhan:", error)
      toast.error("Khong the tai danh sach benh nhan")
    }
  }

  const handleRespond = async (permissionId, action) => {
    try {
      setRespondingId(permissionId)
      const response = await accessApi.respond(permissionId, action)
      toast.success(response.data?.message || (action === "accept" ? "Da chap nhan" : "Da tu choi"))
      await fetchPendingRequests()
      await fetchAcceptedPatients()
    } catch (error) {
      console.error("Loi xu ly yeu cau:", error)
      toast.error(error.response?.data?.error || "Khong the xu ly yeu cau")
    } finally {
      setRespondingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <section className="app-card">
        <div className="app-card-header"><div><h1 className="section-title"><i className="fas fa-user-check me-2 text-brand-600"></i>Yeu cau truy cap benh nhan</h1><p className="section-subtitle">Duyet quyen truy cap va mo ho so benh nhan sau khi chap nhan.</p></div></div>
        <div className="app-card-body table-responsive">
          <table className="table table-hover align-middle">
            <thead><tr><th>#</th><th>Benh nhan</th><th>Vai tro</th><th>Trang thai</th><th className="text-end">Thao tac</th></tr></thead>
            <tbody>
              {requests.length === 0 ? <tr><td colSpan="5" className="text-center text-muted py-4">Khong co yeu cau dang cho xu ly</td></tr> : requests.map((item, index) => (
                <tr key={item.permission_id}>
                  <td>{index + 1}</td>
                  <td>{item.patient?.name}</td>
                  <td>{item.role}</td>
                  <td><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeTone(item.status)}`}>{item.status}</span></td>
                  <td className="text-end">
                    {item.status === ACCESS_STATUS.PENDING ? (
                      <div className="btn-group justify-end">
                        <button type="button" className="btn btn-outline-success btn-sm" disabled={respondingId === item.permission_id} onClick={() => handleRespond(item.permission_id, "accept")}><i className="fas fa-check me-1"></i>Dong y</button>
                        <button type="button" className="btn btn-outline-danger btn-sm" disabled={respondingId === item.permission_id} onClick={() => handleRespond(item.permission_id, "reject")}><i className="fas fa-xmark me-1"></i>Tu choi</button>
                      </div>
                    ) : <span className="text-muted">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="app-card">
        <div className="app-card-header"><div><h2 className="section-title"><i className="fas fa-users me-2 text-brand-600"></i>Benh nhan dang duoc theo doi</h2><p className="section-subtitle">Truy cap nhanh ho so va lich su lam sang cua tung benh nhan.</p></div></div>
        <div className="app-card-body table-responsive">
          <table className="table table-hover align-middle">
            <thead><tr><th>#</th><th>Ten benh nhan</th><th>Email</th><th className="text-end">Mo ho so</th></tr></thead>
            <tbody>
              {patients.length === 0 ? <tr><td colSpan="4" className="text-center text-muted py-4">Chua co benh nhan nao duoc cap quyen</td></tr> : patients.map((item, index) => (
                <tr key={item.patient?.user_id}>
                  <td>{index + 1}</td>
                  <td>{item.patient?.name}</td>
                  <td>{item.patient?.email}</td>
                  <td className="text-end"><button type="button" className="btn btn-outline-primary btn-sm" onClick={() => navigate(`/doctor/history/${item.patient.user_id}`)}><i className="fas fa-folder-open me-1"></i>Xem ho so</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default DoctorAccessRequests
