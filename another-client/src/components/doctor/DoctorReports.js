"use client"

import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "react-toastify"
import { reportsApi } from "../../services/api"
import ModalFrame from "../shared/ModalFrame"
import { DoctorStatCard, EmptyState, formatDateTime, normalizeText } from "./DoctorUi"

const DoctorReports = () => {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedReport, setSelectedReport] = useState(null)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      setLoading(true)
      const response = await reportsApi.getDoctorReports()
      setReports(response.data?.reports || [])
    } catch (error) {
      console.error("Lỗi lấy báo cáo:", error)
      toast.error("Không thể tải danh sách báo cáo")
    } finally {
      setLoading(false)
    }
  }

  const filteredReports = useMemo(() => {
    const keyword = normalizeText(searchTerm)
    if (!keyword) return reports
    return reports.filter((report) => normalizeText(`${report.summary} ${report.patient?.name} ${report.patient?.email}`).includes(keyword))
  }, [reports, searchTerm])

  const reportsToday = reports.filter((report) => new Date(report.created_at).toDateString() === new Date().toDateString())

  if (loading) return <div className="page-shell"><div className="empty-state-rich"><div className="empty-state-rich-icon info"><i className="fas fa-spinner fa-spin"></i></div><h3>Đang tải báo cáo</h3><p>Hệ thống đang lấy danh sách báo cáo chuyên môn.</p></div></div>

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="page-hero-icon"><i className="fas fa-file-medical"></i></div>
        <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand-700">Clinical reports</p>
            <h1 className="mt-1 text-3xl font-bold text-ink-950">Báo cáo chuyên môn</h1>
            <p className="mt-2 text-sm text-ink-600">Tra cứu báo cáo đã tạo, mở hồ sơ bệnh nhân và xem lại nội dung chi tiết.</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={fetchReports}>
            <i className="fas fa-rotate me-2"></i>Làm mới
          </button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <DoctorStatCard icon="fas fa-file-lines" label="Tổng báo cáo" value={reports.length} tone="brand" />
        <DoctorStatCard icon="fas fa-calendar-day" label="Hôm nay" value={reportsToday.length} tone="emerald" />
        <DoctorStatCard icon="fas fa-filter" label="Kết quả lọc" value={filteredReports.length} tone="sky" />
      </div>

      <section className="clinical-panel overflow-hidden">
        <div className="clinical-panel-header">
          <div>
            <h2 className="section-title">Danh sách báo cáo</h2>
            <p className="section-subtitle">Tìm theo bệnh nhân, email hoặc nội dung báo cáo.</p>
          </div>
        </div>
        <div className="clinical-panel-body space-y-4">
          <div className="relative">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-ink-400"></i>
            <input className="form-control pl-11" placeholder="Tìm kiếm báo cáo..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
          </div>

          {filteredReports.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredReports.map((report) => (
                <article key={report.report_id} className="rounded-xl border border-surface-line bg-white p-5 shadow-soft">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-brand-700">Báo cáo #{report.report_id}</p>
                      <h3 className="mt-1 font-bold text-ink-950">{report.patient?.name || "Bệnh nhân"}</h3>
                      <p className="text-sm text-ink-500">{report.patient?.email || "-"}</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Hoàn thành</span>
                  </div>
                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-ink-700">{report.summary}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-surface-line pt-4">
                    <span className="text-xs font-medium text-ink-500">{formatDateTime(report.created_at)}</span>
                    <div className="flex gap-2">
                      {report.user_id ? <Link to={`/doctor/patient/${report.user_id}`} className="btn btn-outline-primary btn-sm">Mở hồ sơ</Link> : null}
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => setSelectedReport(report)}>Chi tiết</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState icon="fas fa-file-circle-xmark" title="Không có báo cáo" description="Tạo báo cáo từ workspace bệnh nhân hoặc thay đổi từ khóa tìm kiếm." />
          )}
        </div>
      </section>

      <ModalFrame
        show={Boolean(selectedReport)}
        onClose={() => setSelectedReport(null)}
        title={selectedReport ? `Báo cáo #${selectedReport.report_id}` : "Báo cáo"}
        size="lg"
        footer={<button type="button" className="btn btn-primary" onClick={() => setSelectedReport(null)}>Đóng</button>}
      >
        {selectedReport ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl bg-surface-soft p-4">
                <p className="text-sm text-ink-500">Bệnh nhân</p>
                <p className="mt-1 font-bold text-ink-950">{selectedReport.patient?.name || "-"}</p>
                <p className="text-sm text-ink-600">{selectedReport.patient?.email || "-"}</p>
              </div>
              <div className="rounded-xl bg-surface-soft p-4">
                <p className="text-sm text-ink-500">Bác sĩ</p>
                <p className="mt-1 font-bold text-ink-950">{selectedReport.doctor?.name || "-"}</p>
                <p className="text-sm text-ink-600">{formatDateTime(selectedReport.created_at)}</p>
              </div>
            </div>
            <div className="rounded-xl border border-surface-line bg-white p-4">
              <p className="mb-2 font-bold text-ink-950">Nội dung</p>
              <p className="whitespace-pre-line text-sm leading-6 text-ink-700">{selectedReport.summary}</p>
            </div>
          </div>
        ) : null}
      </ModalFrame>
    </div>
  )
}

export default DoctorReports
