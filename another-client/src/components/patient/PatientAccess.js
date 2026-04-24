import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import { useAuth } from "../../contexts/AuthContext"
import { accessApi } from "../../services/api"
import { ACCESS_ROLE, ACCESS_STATUS } from "../../services/string"

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
    fetchAccessList()

    const handleResponse = (event) => {
      const data = event.detail || {}
      if (String(data.patient_id) === String(user.user_id)) {
        fetchAccessList()
      }
    }
    const handleRevoke = (event) => {
      const data = event.detail || {}
      if (String(data.patient_id) === String(user.user_id)) {
        fetchAccessList()
      }
    }

    window.addEventListener("appAccessResponse", handleResponse)
    window.addEventListener("appAccessRevoke", handleRevoke)
    return () => {
      window.removeEventListener("appAccessResponse", handleResponse)
      window.removeEventListener("appAccessRevoke", handleRevoke)
    }
  }, [user?.user_id])

  const fetchAccessList = async () => {
    try {
      const response = await accessApi.list(user.user_id)
      setAccessList(response.data || [])
    } catch (error) {
      console.error("Không thể tải danh sách quyền:", error)
      toast.error("Không thể tải danh sách quyền truy cập")
    }
  }

  const handleShareAccess = async (event) => {
    event.preventDefault()
    try {
      const response = await accessApi.share(viewerEmail, role)
      toast.success(response.data?.message || "Đã gửi yêu cầu chia sẻ quyền")
      setViewerEmail("")
      fetchAccessList()
    } catch (error) {
      console.error("Lỗi chia sẻ quyền:", error)
      toast.error(error.response?.data?.error || "Lỗi khi gửi yêu cầu")
    }
  }

  const handleRevoke = async (id) => {
    if (!window.confirm("Bạn có chắc muốn thu hồi quyền này?")) return
    try {
      await accessApi.revoke(id)
      toast.warning("Đã thu hồi quyền truy cập")
      fetchAccessList()
    } catch (error) {
      console.error("Lỗi thu hồi quyền:", error)
      toast.error("Lỗi khi thu hồi quyền")
    }
  }

  return (
    <div className="space-y-6">
      <section className="app-card">
        <div className="app-card-header">
          <div>
            <h1 className="section-title"><i className="fas fa-key me-2 text-brand-600"></i>Quản lý quyền truy cập</h1>
            <p className="section-subtitle">Cấp quyền xem dữ liệu cho bác sĩ hoặc người thân theo từng email.</p>
          </div>
        </div>
        <div className="app-card-body">
          <form className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_240px_180px]" onSubmit={handleShareAccess}>
            <div>
              <label className="form-label">Email người được cấp quyền</label>
              <input className="form-control" type="email" value={viewerEmail} onChange={(event) => setViewerEmail(event.target.value)} placeholder="doctor@example.com" required />
            </div>
            <div>
              <label className="form-label">Vai trò</label>
              <select className="form-select" value={role} onChange={(event) => setRole(event.target.value)}>
                <option value={ACCESS_ROLE.BAC_SI}>Bác sĩ</option>
                <option value={ACCESS_ROLE.GIA_DINH}>Gia đình</option>
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn btn-primary w-100"><i className="fas fa-share-nodes me-2"></i>Gửi yêu cầu</button>
            </div>
          </form>
        </div>
      </section>

      <section className="app-card">
        <div className="app-card-header">
          <div>
            <h2 className="section-title"><i className="fas fa-user-shield me-2 text-brand-600"></i>Danh sách quyền đã cấp</h2>
            <p className="section-subtitle">Theo dõi trạng thái phê duyệt và thu hồi khi cần.</p>
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
                  <tr><td colSpan="6" className="text-center text-muted py-4">Chưa có ai được cấp quyền</td></tr>
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
