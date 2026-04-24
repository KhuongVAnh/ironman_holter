import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import { useAuth } from "../../contexts/AuthContext"
import { accessApi } from "../../services/api"
import { ACCESS_ROLE, ACCESS_STATUS } from "../../services/string"

const badgeTone = (status) => {
  if (status === ACCESS_STATUS.ACCEPTED) return "status-chip is-success"
  if (status === ACCESS_STATUS.PENDING) return "status-chip is-warning"
  return "status-chip is-danger"
}

const roleLabel = (value) => {
  if (value === ACCESS_ROLE.BAC_SI) return "Bác sĩ"
  if (value === ACCESS_ROLE.GIA_DINH) return "Gia đình"
  return value || "Chưa rõ"
}

const statusLabel = (value) => {
  if (value === ACCESS_STATUS.ACCEPTED) return "Đã chấp nhận"
  if (value === ACCESS_STATUS.PENDING) return "Đang chờ"
  return value || "Chưa rõ"
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

  const acceptedCount = accessList.filter((item) => item.status === ACCESS_STATUS.ACCEPTED).length
  const pendingCount = accessList.filter((item) => item.status === ACCESS_STATUS.PENDING).length

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="page-hero-icon"><i className="fas fa-key"></i></div>
        <div className="min-w-0 flex-1">
          <p className="panel-eyebrow">Quyền truy cập</p>
          <h1 className="page-hero-title">Chia sẻ dữ liệu ECG an toàn</h1>
          <p className="page-hero-subtitle">Cấp quyền cho bác sĩ hoặc người thân theo email, theo dõi trạng thái duyệt và thu hồi khi cần.</p>
        </div>
      </section>

      <section className="metric-grid">
        <div className="priority-metric metric-info">
          <div className="metric-icon"><i className="fas fa-users"></i></div>
          <p className="metric-label">Tổng quyền</p>
          <p className="metric-value">{accessList.length}</p>
          <p className="metric-helper">Tất cả người được mời xem dữ liệu</p>
        </div>
        <div className="priority-metric metric-success">
          <div className="metric-icon"><i className="fas fa-user-check"></i></div>
          <p className="metric-label">Đã chấp nhận</p>
          <p className="metric-value">{acceptedCount}</p>
          <p className="metric-helper">Có thể theo dõi dữ liệu hiện tại</p>
        </div>
        <div className="priority-metric metric-warning">
          <div className="metric-icon"><i className="fas fa-hourglass-half"></i></div>
          <p className="metric-label">Đang chờ</p>
          <p className="metric-value">{pendingCount}</p>
          <p className="metric-helper">Cần người nhận phản hồi</p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
        <section className="clinical-panel overflow-hidden">
          <div className="clinical-panel-header">
          <div>
              <p className="panel-eyebrow">Cấp quyền mới</p>
              <h2 className="section-title">Mời người theo dõi</h2>
              <p className="section-subtitle">Email được mời sẽ nhận quyền theo vai trò bạn chọn.</p>
          </div>
        </div>
          <div className="clinical-panel-body">
            <div className="highlight-band info mb-4">
              <div className="highlight-band-icon"><i className="fas fa-shield-heart"></i></div>
              <div>
                <h3>Chỉ chia sẻ cho người tin cậy</h3>
                <p>Bạn có thể thu hồi quyền bất kỳ lúc nào trong danh sách bên cạnh.</p>
              </div>
            </div>
            <form className="space-y-4" onSubmit={handleShareAccess}>
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
              <button type="submit" className="btn btn-primary w-100"><i className="fas fa-share-nodes me-2"></i>Gửi yêu cầu</button>
            </form>
          </div>
        </section>

        <section className="clinical-panel overflow-hidden">
          <div className="clinical-panel-header">
            <div>
              <p className="panel-eyebrow">Danh sách hiện tại</p>
              <h2 className="section-title">Quyền đã cấp</h2>
              <p className="section-subtitle">Màu trạng thái cho biết ai đang truy cập được dữ liệu.</p>
            </div>
          </div>
          <div className="clinical-panel-body">
            {accessList.length === 0 ? (
              <div className="empty-state-rich">
                <div className="empty-state-rich-icon success"><i className="fas fa-user-shield"></i></div>
                <h3>Chưa có ai được cấp quyền</h3>
                <p>Hãy gửi lời mời cho bác sĩ hoặc người thân để họ có thể theo dõi dữ liệu ECG khi cần.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {accessList.map((item) => (
                  <div key={item.permission_id} className="flex flex-col gap-4 rounded-2xl border border-surface-line bg-white p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-100 font-bold text-brand-700">
                        {item.viewer?.name?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-ink-900">{item.viewer?.name || "Chưa có tên"}</p>
                        <p className="truncate text-sm text-ink-500">{item.viewer?.email}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="status-chip is-info">{roleLabel(item.role)}</span>
                          <span className={badgeTone(item.status)}>{statusLabel(item.status)}</span>
                        </div>
                      </div>
                    </div>
                    <button type="button" className="btn btn-outline-danger btn-sm sm:self-center" onClick={() => handleRevoke(item.permission_id)}>
                      <i className="fas fa-user-slash me-1"></i>Thu hồi
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default PatientAccess
