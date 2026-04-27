import { useEffect, useMemo, useState } from "react"
import { toast } from "react-toastify"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import { accessApi, familyApi } from "../../services/api"
import { ACCESS_STATUS } from "../../services/string"
import PaginationBar from "../shared/PaginationBar"

const ITEMS_PER_PAGE = 6

const badgeTone = (status) => status === ACCESS_STATUS.PENDING ? "status-chip is-warning" : "status-chip is-success"

const FamilyAccessRequests = () => {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [patients, setPatients] = useState([])
  const [respondingId, setRespondingId] = useState(null)
  const navigate = useNavigate()
  const [requestPage, setRequestPage] = useState(1)
  const [patientPage, setPatientPage] = useState(1)

  useEffect(() => {
    if (!user) return
    fetchPendingRequests()
    fetchAcceptedPatients()
  }, [user])

  useEffect(() => {
    setRequestPage(1)
    setPatientPage(1)
  }, [requests.length, patients.length])

  const fetchPendingRequests = async () => {
    try {
      const response = await accessApi.getPending()
      setRequests(response.data || [])
    } catch (error) {
      console.error("Lỗi tải danh sách yêu cầu:", error)
      toast.error("Không thể tải danh sách yêu cầu")
    }
  }

  const fetchAcceptedPatients = async () => {
    try {
      const response = await familyApi.getPatients(user.user_id, { limit: 1000, offset: 0 })
      setPatients(response.data || [])
    } catch (error) {
      console.error("Lỗi tải danh sách bệnh nhân:", error)
      toast.error("Không thể tải danh sách bệnh nhân")
    }
  }

  const requestTotalPages = Math.max(1, Math.ceil(requests.length / ITEMS_PER_PAGE))
  const patientTotalPages = Math.max(1, Math.ceil(patients.length / ITEMS_PER_PAGE))
  const visibleRequests = useMemo(() => requests.slice((requestPage - 1) * ITEMS_PER_PAGE, requestPage * ITEMS_PER_PAGE), [requests, requestPage])
  const visiblePatients = useMemo(() => patients.slice((patientPage - 1) * ITEMS_PER_PAGE, patientPage * ITEMS_PER_PAGE), [patients, patientPage])

  const handleRespond = async (permissionId, action) => {
    try {
      setRespondingId(permissionId)
      await accessApi.respond(permissionId, action)
      toast.success(action === "accept" ? "Đã chấp nhận yêu cầu" : "Đã từ chối yêu cầu")
      await fetchPendingRequests()
      await fetchAcceptedPatients()
    } catch (error) {
      console.error("Lỗi xử lý yêu cầu:", error)
      toast.error(error.response?.data?.error || "Không thể xử lý yêu cầu")
    } finally {
      setRespondingId(null)
    }
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="page-hero-icon"><i className="fas fa-user-shield"></i></div>
        <div className="min-w-0 flex-1">
          <p className="panel-eyebrow">Quyền theo dõi</p>
          <h1 className="page-hero-title">Yêu cầu truy cập bệnh nhân</h1>
          <p className="page-hero-subtitle">Phê duyệt yêu cầu theo dõi người thân và mở nhanh hồ sơ y tế đã được cấp quyền.</p>
        </div>
      </section>

      <section className="metric-grid">
        <div className="priority-metric metric-warning"><div className="metric-icon"><i className="fas fa-hourglass-half"></i></div><p className="metric-label">Đang chờ</p><p className="metric-value">{requests.length}</p><p className="metric-helper">Yêu cầu cần phản hồi</p></div>
        <div className="priority-metric metric-success"><div className="metric-icon"><i className="fas fa-heart-pulse"></i></div><p className="metric-label">Đang theo dõi</p><p className="metric-value">{patients.length}</p><p className="metric-helper">Bệnh nhân đã cấp quyền</p></div>
      </section>

      <section className="clinical-panel overflow-hidden">
        <div className="clinical-panel-header"><div><h2 className="section-title">Yêu cầu đang chờ</h2><p className="section-subtitle">Chấp nhận để bắt đầu theo dõi dữ liệu sức khỏe.</p></div></div>
        <div className="clinical-panel-body">
          {visibleRequests.length === 0 ? (
            <div className="empty-state-rich"><div className="empty-state-rich-icon success"><i className="fas fa-inbox"></i></div><h3>Không có yêu cầu đang chờ</h3><p>Các yêu cầu mới sẽ xuất hiện tại đây.</p></div>
          ) : (
            <div className="space-y-3">
              {visibleRequests.map((item) => (
                <article key={item.permission_id} className="flex flex-col gap-4 rounded-2xl border border-surface-line bg-white p-4 shadow-soft md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="font-bold text-ink-900">{item.patient?.name || "Bệnh nhân"}</p>
                    <p className="text-sm text-ink-500">{item.patient?.email || "-"}</p>
                    <div className="mt-2 flex flex-wrap gap-2"><span className="status-chip is-info">{item.role}</span><span className={badgeTone(item.status)}>{item.status === ACCESS_STATUS.PENDING ? "Đang chờ" : "Đã chấp nhận"}</span></div>
                  </div>
                  {item.status === ACCESS_STATUS.PENDING ? <div className="flex flex-wrap gap-2"><button type="button" className="btn btn-outline-success btn-sm" disabled={respondingId === item.permission_id} onClick={() => handleRespond(item.permission_id, "accept")}><i className="fas fa-check me-1"></i>Đồng ý</button><button type="button" className="btn btn-outline-danger btn-sm" disabled={respondingId === item.permission_id} onClick={() => handleRespond(item.permission_id, "reject")}><i className="fas fa-xmark me-1"></i>Từ chối</button></div> : null}
                </article>
              ))}
            </div>
          )}
          <PaginationBar
            currentPage={requestPage}
            totalPages={requestTotalPages}
            onPageChange={setRequestPage}
            summaryText={requests.length > 0 ? `Hiển thị ${Math.min((requestPage - 1) * ITEMS_PER_PAGE + 1, requests.length)}-${Math.min(requestPage * ITEMS_PER_PAGE, requests.length)} / ${requests.length} yêu cầu` : "Chưa có yêu cầu để phân trang"}
            className="mt-4"
          />
        </div>
      </section>

      <section className="clinical-panel overflow-hidden">
        <div className="clinical-panel-header"><div><h2 className="section-title">Người thân đang theo dõi</h2><p className="section-subtitle">Mở nhanh hồ sơ y tế của từng bệnh nhân đã được cấp quyền.</p></div></div>
        <div className="clinical-panel-body">
          {visiblePatients.length === 0 ? (
            <div className="empty-state-rich"><div className="empty-state-rich-icon info"><i className="fas fa-heart-pulse"></i></div><h3>Chưa có bệnh nhân nào</h3><p>Khi bệnh nhân cấp quyền, danh sách sẽ xuất hiện tại đây.</p></div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {visiblePatients.map((item) => (
                <article key={item.patient?.user_id} className="rounded-2xl border border-surface-line bg-white p-4 shadow-soft">
                  <p className="font-bold text-ink-900">{item.patient?.name}</p>
                  <p className="text-sm text-ink-500">{item.patient?.email}</p>
                  <button type="button" className="btn btn-outline-primary btn-sm mt-4" onClick={() => navigate(`/family/history/${item.patient.user_id}`)}><i className="fas fa-folder-open me-1"></i>Xem hồ sơ</button>
                </article>
              ))}
            </div>
          )}
          <PaginationBar
            currentPage={patientPage}
            totalPages={patientTotalPages}
            onPageChange={setPatientPage}
            summaryText={patients.length > 0 ? `Hiển thị ${Math.min((patientPage - 1) * ITEMS_PER_PAGE + 1, patients.length)}-${Math.min(patientPage * ITEMS_PER_PAGE, patients.length)} / ${patients.length} bệnh nhân` : "Chưa có bệnh nhân để phân trang"}
            className="mt-4"
          />
        </div>
      </section>
    </div>
  )
}

export default FamilyAccessRequests
