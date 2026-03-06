import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import io from "socket.io-client"
import { useAuth } from "../../contexts/AuthContext"
import { API_BASE_URL } from "../../config/env"
import { accessApi } from "../../services/api"
import { ACCESS_ROLE, ACCESS_STATUS } from "../../services/string"

const socket = io(API_BASE_URL)

const badgeTone = (status) => {
  if (status === ACCESS_STATUS.ACCEPTED) return "bg-emerald-100 text-emerald-700"
  if (status === ACCESS_STATUS.PENDING) return "bg-amber-100 text-amber-700"
  return "bg-red-100 text-red-700"
}

const PatientAccess = () => {
  const { user } = useAuth()
  const [viewerEmail, setViewerEmail] = useState("")
  const [role, setRole] = useState(ACCESS_ROLE.BAC_SI)
  const [accessList, setAccessList] = useState([])

  useEffect(() => {
    if (!user) return
    socket.emit("join-user-room", user.user_id)
    fetchAccessList()

    const handleResponse = (data) => {
      if (data.patient_id === user.user_id) {
        toast.info("Mot yeu cau truy cap da duoc phan hoi")
        fetchAccessList()
      }
    }
    const handleRevoke = (data) => {
      if (data.patient_id === user.user_id) {
        toast.warning("Mot quyen truy cap da bi thu hoi")
        fetchAccessList()
      }
    }

    socket.on("access-response", handleResponse)
    socket.on("access-revoke", handleRevoke)
    return () => {
      socket.off("access-response", handleResponse)
      socket.off("access-revoke", handleRevoke)
    }
  }, [user])

  const fetchAccessList = async () => {
    try {
      const response = await accessApi.list(user.user_id)
      setAccessList(response.data || [])
    } catch (error) {
      console.error("Khong the tai danh sach quyen:", error)
      toast.error("Khong the tai danh sach quyen truy cap")
    }
  }

  const handleShareAccess = async (event) => {
    event.preventDefault()
    try {
      const response = await accessApi.share(viewerEmail, role)
      toast.success(response.data?.message || "Da gui yeu cau chia se quyen")
      setViewerEmail("")
      fetchAccessList()
    } catch (error) {
      console.error("Loi chia se quyen:", error)
      toast.error(error.response?.data?.error || "Loi khi gui yeu cau")
    }
  }

  const handleRevoke = async (id) => {
    if (!window.confirm("Ban co chac muon thu hoi quyen nay?")) return
    try {
      await accessApi.revoke(id)
      toast.warning("Da thu hoi quyen truy cap")
      fetchAccessList()
    } catch (error) {
      console.error("Loi thu hoi quyen:", error)
      toast.error("Loi khi thu hoi quyen")
    }
  }

  return (
    <div className="space-y-6">
      <section className="app-card">
        <div className="app-card-header">
          <div>
            <h1 className="section-title"><i className="fas fa-key me-2 text-brand-600"></i>Quan ly quyen truy cap</h1>
            <p className="section-subtitle">Cap quyen xem du lieu cho bac si hoac nguoi than theo tung email.</p>
          </div>
        </div>
        <div className="app-card-body">
          <form className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_240px_180px]" onSubmit={handleShareAccess}>
            <div>
              <label className="form-label">Email nguoi duoc cap quyen</label>
              <input className="form-control" type="email" value={viewerEmail} onChange={(event) => setViewerEmail(event.target.value)} placeholder="doctor@example.com" required />
            </div>
            <div>
              <label className="form-label">Vai tro</label>
              <select className="form-select" value={role} onChange={(event) => setRole(event.target.value)}>
                <option value={ACCESS_ROLE.BAC_SI}>Bac si</option>
                <option value={ACCESS_ROLE.GIA_DINH}>Gia dinh</option>
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn btn-primary w-100"><i className="fas fa-share-nodes me-2"></i>Gui yeu cau</button>
            </div>
          </form>
        </div>
      </section>

      <section className="app-card">
        <div className="app-card-header">
          <div>
            <h2 className="section-title"><i className="fas fa-user-shield me-2 text-brand-600"></i>Danh sach quyen da cap</h2>
            <p className="section-subtitle">Theo doi trang thai phe duyet va thu hoi khi can.</p>
          </div>
        </div>
        <div className="app-card-body">
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Ten</th>
                  <th>Email</th>
                  <th>Vai tro</th>
                  <th>Trang thai</th>
                  <th className="text-end">Thao tac</th>
                </tr>
              </thead>
              <tbody>
                {accessList.length === 0 ? (
                  <tr><td colSpan="6" className="text-center text-muted py-4">Chua co ai duoc cap quyen</td></tr>
                ) : accessList.map((item, index) => (
                  <tr key={item.permission_id}>
                    <td>{index + 1}</td>
                    <td>{item.viewer?.name}</td>
                    <td>{item.viewer?.email}</td>
                    <td>{item.role}</td>
                    <td><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeTone(item.status)}`}>{item.status}</span></td>
                    <td className="text-end"><button type="button" className="btn btn-outline-danger btn-sm" onClick={() => handleRevoke(item.permission_id)}><i className="fas fa-user-slash me-1"></i>Thu hoi</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}

export default PatientAccess
