"use client"

import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import { useAuth } from "../../contexts/AuthContext"
import { doctorApi } from "../../services/api"
import { DoctorStatCard, EmptyState, PatientAvatar, formatDate, getPatientFromAccess, normalizeText } from "./DoctorUi"

const DoctorPatients = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    if (user?.user_id) fetchPatients()
  }, [user?.user_id])

  const fetchPatients = async () => {
    try {
      setLoading(true)
      const response = await doctorApi.getPatients(user.user_id)
      setPatients((response.data || []).map(getPatientFromAccess).filter(Boolean))
    } catch (error) {
      console.error("Lỗi lấy danh sách bệnh nhân:", error)
      toast.error("Không thể tải danh sách bệnh nhân")
    } finally {
      setLoading(false)
    }
  }

  const filteredPatients = useMemo(() => {
    const keyword = normalizeText(searchTerm)
    return patients.filter((patient) => {
      const matchesSearch = !keyword || normalizeText(`${patient.name} ${patient.email}`).includes(keyword)
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && patient.is_active) ||
        (statusFilter === "inactive" && !patient.is_active)
      return matchesSearch && matchesStatus
    })
  }, [patients, searchTerm, statusFilter])

  if (loading) {
    return <div className="flex min-h-[55vh] items-center justify-center"><div className="spinner-border"></div></div>
  }

  return (
    <div className="space-y-6">
      <section className="app-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand-700">Patient directory</p>
            <h1 className="mt-1 text-3xl font-bold text-ink-950">Bệnh nhân đang theo dõi</h1>
            <p className="mt-2 text-sm text-ink-600">Mở workspace, tạo báo cáo hoặc chuyển sang trao đổi trực tiếp với từng bệnh nhân.</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={fetchPatients}>
            <i className="fas fa-rotate me-2"></i>Làm mới
          </button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <DoctorStatCard icon="fas fa-user-group" label="Tổng bệnh nhân" value={patients.length} tone="brand" />
        <DoctorStatCard icon="fas fa-user-check" label="Đang hoạt động" value={patients.filter((item) => item.is_active).length} tone="emerald" />
        <DoctorStatCard icon="fas fa-filter" label="Kết quả lọc" value={filteredPatients.length} tone="sky" />
      </div>

      <section className="app-card overflow-hidden">
        <div className="app-card-header">
          <div>
            <h2 className="section-title">Danh sách bệnh nhân</h2>
            <p className="section-subtitle">Tìm theo tên, email hoặc lọc trạng thái tài khoản.</p>
          </div>
        </div>
        <div className="app-card-body space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="relative">
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-ink-400"></i>
              <input
                className="form-control pl-11"
                placeholder="Tìm kiếm bệnh nhân..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <select className="form-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Ngưng hoạt động</option>
            </select>
          </div>

          {filteredPatients.length ? (
            <div className="space-y-3">
              {filteredPatients.map((patient) => (
                <article key={patient.user_id} className="rounded-xl border border-surface-line bg-white p-4 shadow-soft transition hover:border-brand-200 hover:shadow-medium">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <PatientAvatar name={patient.name} />
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-bold text-ink-950">{patient.name}</h3>
                        <p className="truncate text-sm text-ink-500">{patient.email}</p>
                        <p className="mt-1 text-xs font-medium text-ink-500">Tham gia: {formatDate(patient.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${patient.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                        {patient.is_active ? "Hoạt động" : "Ngưng"}
                      </span>
                      <Link to={`/doctor/patient/${patient.user_id}`} className="btn btn-primary btn-sm">
                        <i className="fas fa-folder-open me-1"></i>Workspace
                      </Link>
                      <button type="button" className="btn btn-outline-success btn-sm" onClick={() => navigate(`/doctor/patient/${patient.user_id}#create-report`)}>
                        <i className="fas fa-file-medical me-1"></i>Báo cáo
                      </button>
                      <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => navigate("/doctor/chat", { state: { patientId: patient.user_id } })}>
                        <i className="fas fa-message me-1"></i>Chat
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState icon="fas fa-user-magnifying-glass" title="Không tìm thấy bệnh nhân" description="Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái." />
          )}
        </div>
      </section>
    </div>
  )
}

export default DoctorPatients
