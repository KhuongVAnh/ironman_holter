import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import { useAuth } from "../../contexts/AuthContext"
import { accessApi, doctorApi } from "../../services/api"
import { ACCESS_STATUS } from "../../services/string"
import { EmptyState, PatientAvatar, formatDate, getPatientFromAccess } from "./DoctorUi"

const DoctorAccessRequests = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [patients, setPatients] = useState([])
  const [respondingId, setRespondingId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchAll()
  }, [user])

  const fetchAll = async () => {
    try {
      setLoading(true)
      const [pendingResponse, patientsResponse] = await Promise.all([
        accessApi.getPending(),
        doctorApi.getPatients(user.user_id),
      ])
      setRequests(pendingResponse.data || [])
      setPatients(patientsResponse.data || [])
    } catch (error) {
      console.error("Lỗi tải quyền truy cập:", error)
      toast.error("Không thể tải yêu cầu truy cập")
    } finally {
      setLoading(false)
    }
  }

  const handleRespond = async (permissionId, action) => {
    try {
      setRespondingId(permissionId)
      const response = await accessApi.respond(permissionId, action)
      toast.success(response.data?.message || (action === "accept" ? "Đã chấp nhận" : "Đã từ chối"))
      await fetchAll()
    } catch (error) {
      console.error("Lỗi xử lý yêu cầu:", error)
      toast.error(error.response?.data?.error || "Không thể xử lý yêu cầu")
    } finally {
      setRespondingId(null)
    }
  }

  if (loading) return <div className="page-shell"><div className="empty-state-rich"><div className="empty-state-rich-icon info"><i className="fas fa-spinner fa-spin"></i></div><h3>Đang tải yêu cầu</h3><p>Hệ thống đang kiểm tra các quyền truy cập đang chờ.</p></div></div>

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="page-hero-icon"><i className="fas fa-user-shield"></i></div>
        <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand-700">Access control</p>
            <h1 className="mt-1 text-3xl font-bold text-ink-950">Yêu cầu truy cập bệnh nhân</h1>
            <p className="mt-2 text-sm text-ink-600">Duyệt quyền theo dõi, sau đó mở workspace lâm sàng của bệnh nhân.</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={fetchAll}>
            <i className="fas fa-rotate me-2"></i>Làm mới
          </button>
        </div>
      </section>

      <section className="clinical-panel overflow-hidden">
        <div className="clinical-panel-header">
          <div>
            <h2 className="section-title">Đang chờ duyệt</h2>
            <p className="section-subtitle">{requests.length} yêu cầu cần phản hồi.</p>
          </div>
        </div>
        <div className="clinical-panel-body">
          {requests.length ? (
            <div className="space-y-3">
              {requests.map((item) => {
                const patient = item.patient
                return (
                  <article key={item.permission_id} className="rounded-xl border border-surface-line bg-white p-4 shadow-soft">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <PatientAvatar name={patient?.name} />
                        <div>
                          <p className="font-bold text-ink-950">{patient?.name || "Bệnh nhân"}</p>
                          <p className="text-sm text-ink-500">{patient?.email || "-"}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="status-chip is-warning">Đang chờ</span>
                        {item.status === ACCESS_STATUS.PENDING ? (
                          <>
                            <button type="button" className="btn btn-outline-success btn-sm" disabled={respondingId === item.permission_id} onClick={() => handleRespond(item.permission_id, "accept")}>
                              <i className="fas fa-check me-1"></i>Đồng ý
                            </button>
                            <button type="button" className="btn btn-outline-danger btn-sm" disabled={respondingId === item.permission_id} onClick={() => handleRespond(item.permission_id, "reject")}>
                              <i className="fas fa-xmark me-1"></i>Từ chối
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <EmptyState icon="fas fa-inbox" title="Không có yêu cầu đang chờ" description="Các yêu cầu mới sẽ xuất hiện tại đây." />
          )}
        </div>
      </section>

      <section className="clinical-panel overflow-hidden">
        <div className="clinical-panel-header">
          <div>
            <h2 className="section-title">Đã cấp quyền</h2>
            <p className="section-subtitle">Bệnh nhân đang cho phép bác sĩ theo dõi.</p>
          </div>
        </div>
        <div className="clinical-panel-body space-y-3">
          {patients.length ? patients.map((item) => {
            const patient = getPatientFromAccess(item)
            return (
              <article key={patient.user_id} className="rounded-xl border border-surface-line bg-white p-4 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <PatientAvatar name={patient.name} />
                    <div className="min-w-0">
                      <p className="truncate font-bold text-ink-950">{patient.name}</p>
                      <p className="truncate text-sm text-ink-500">{patient.email}</p>
                      <p className="mt-1 text-xs font-medium text-ink-500">Cấp quyền: {formatDate(item.created_at)}</p>
                    </div>
                  </div>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(`/doctor/patient/${patient.user_id}`)}>
                    <i className="fas fa-folder-open me-1"></i>Mở workspace
                  </button>
                </div>
              </article>
            )
          }) : (
            <EmptyState icon="fas fa-user-lock" title="Chưa có bệnh nhân được cấp quyền" description="Khi bệnh nhân chấp nhận chia sẻ, họ sẽ xuất hiện tại đây." />
          )}
        </div>
      </section>
    </div>
  )
}

export default DoctorAccessRequests
