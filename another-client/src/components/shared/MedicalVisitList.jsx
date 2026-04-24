import { useEffect, useMemo, useState } from "react"
import { ROLE } from "../../services/string"

const PAGE_SIZE = 3

const displayText = (value, emptyText = "Chưa có") => {
  const text = value === null || value === undefined ? "" : String(value).trim()
  return text || emptyText
}

const formatDate = (value) => {
  if (!value) return "Chưa có"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Chưa có" : date.toLocaleDateString("vi-VN")
}

const renderJsonValue = (value) => {
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return <p className="mb-0 text-ink-500">Chưa có</p>
  }

  if (Array.isArray(value)) {
    return (
      <div className="space-y-2">
        {value.map((item, index) => (
          <div key={`${index}-${JSON.stringify(item).slice(0, 20)}`} className="rounded-lg bg-white px-3 py-2">
            {typeof item === "object" && item !== null ? (
              <dl className="mb-0 grid gap-1 text-sm">
                {Object.entries(item).map(([key, entryValue]) => (
                  <div key={key} className="grid gap-1 sm:grid-cols-[130px_minmax(0,1fr)]">
                    <dt className="font-semibold text-ink-600">{key}</dt>
                    <dd className="mb-0 whitespace-pre-line text-ink-800">{displayText(entryValue)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mb-0 whitespace-pre-line">{displayText(item)}</p>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (typeof value === "object") {
    return (
      <dl className="mb-0 grid gap-2 text-sm">
        {Object.entries(value).map(([key, entryValue]) => (
          <div key={key} className="grid gap-1 sm:grid-cols-[130px_minmax(0,1fr)]">
            <dt className="font-semibold text-ink-600">{key}</dt>
            <dd className="mb-0 whitespace-pre-line text-ink-800">{displayText(entryValue)}</dd>
          </div>
        ))}
      </dl>
    )
  }

  return <p className="mb-0 whitespace-pre-line">{displayText(value)}</p>
}

const MedicalVisitList = ({ visits, onEdit, onDelete, role, onCreate }) => {
  const canManage = role === ROLE.BENH_NHAN || role === ROLE.BAC_SI
  const [expandedVisitId, setExpandedVisitId] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil((visits?.length || 0) / PAGE_SIZE))

  useEffect(() => {
    setCurrentPage(1)
    setExpandedVisitId(null)
  }, [visits?.length])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const visibleVisits = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return (visits || []).slice(start, start + PAGE_SIZE)
  }, [currentPage, visits])

  if (!visits || visits.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-ink-900">Lịch sử Y tế</h2>
          {canManage && onCreate ? (
            <button type="button" className="btn btn-primary rounded-pill px-4" onClick={onCreate}>
              <i className="fas fa-plus me-2"></i>Thêm lịch sử mới
            </button>
          ) : null}
        </div>
        <div className="rounded-xl border border-dashed border-surface-line bg-surface-soft px-5 py-8 text-center text-sm text-ink-600">
          Chưa có lần khám nào.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-ink-900">Lịch sử Y tế</h2>
        {canManage && onCreate ? (
          <button type="button" className="btn btn-primary rounded-pill px-4" onClick={onCreate}>
            <i className="fas fa-plus me-2"></i>Thêm lịch sử mới
          </button>
        ) : null}
      </div>

      <div className="relative space-y-8 pl-11">
        <div className="absolute bottom-0 left-[14px] top-2 w-px bg-sky-100"></div>

        {visibleVisits.map((item) => {
          const expanded = expandedVisitId === item.visit_id
          return (
            <article key={item.visit_id} className="relative">
              <span className="absolute -left-[51px] top-2 z-10 h-6 w-6 rounded-full border-4 border-white bg-sky-500 shadow-soft"></span>
              <div
                role="button"
                tabIndex={0}
                className={`rounded-[28px] border border-sky-100 bg-white px-5 py-5 shadow-soft transition hover:border-sky-200 hover:shadow-medium sm:px-7 ${expanded ? "ring-2 ring-sky-100" : ""}`}
                onClick={() => setExpandedVisitId((current) => current === item.visit_id ? null : item.visit_id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    setExpandedVisitId((current) => current === item.visit_id ? null : item.visit_id)
                  }
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold tracking-wide text-sky-500">{formatDate(item.visit_date)}</p>
                    <h3 className="mt-2 text-xl font-bold leading-7 text-ink-950">{displayText(item.diagnosis, "Chưa có chẩn đoán")}</h3>
                  </div>
                  <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-surface-line bg-surface-soft px-4 py-2 text-sm font-medium text-ink-700">
                    <i className="far fa-hospital text-sky-700"></i>
                    <span className="truncate">{displayText(item.facility, "Chưa có cơ sở y tế")}</span>
                  </span>
                </div>

                <div className="mt-5 border-t border-surface-line pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="mb-0 inline-flex items-center gap-2 text-sm font-semibold text-ink-700">
                      <i className="fas fa-stethoscope text-ink-600"></i>
                      {displayText(item.doctor_name || item.doctor?.name, "Chưa có bác sĩ")}
                    </p>
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-sky-200">
                      {expanded ? "Thu gọn" : "Xem chi tiết"}
                      <i className={`fas fa-chevron-right text-xs transition ${expanded ? "rotate-90" : ""}`}></i>
                    </span>
                  </div>
                </div>

                {expanded ? (
                  <div className="mt-5 grid gap-3 text-sm text-ink-700 md:grid-cols-2">
                    <div className="rounded-xl bg-surface-soft p-4">
                      <strong className="mb-2 block text-ink-900">Lý do khám</strong>
                      <p className="mb-0 whitespace-pre-line">{displayText(item.reason)}</p>
                    </div>
                    <div className="rounded-xl bg-surface-soft p-4">
                      <strong className="mb-2 block text-ink-900">Chi tiết chẩn đoán</strong>
                      <p className="mb-0 whitespace-pre-line">{displayText(item.diagnosis_details)}</p>
                    </div>
                    <div className="rounded-xl bg-surface-soft p-4">
                      <strong className="mb-2 block text-ink-900">Xét nghiệm</strong>
                      {renderJsonValue(item.tests)}
                    </div>
                    <div className="rounded-xl bg-surface-soft p-4">
                      <strong className="mb-2 block text-ink-900">Đơn thuốc tại lần khám</strong>
                      {renderJsonValue(item.prescription)}
                    </div>
                    <div className="rounded-xl bg-surface-soft p-4">
                      <strong className="mb-2 block text-ink-900">Lời khuyên</strong>
                      <p className="mb-0 whitespace-pre-line">{displayText(item.advice)}</p>
                    </div>
                    <div className="rounded-xl bg-surface-soft p-4">
                      <strong className="mb-2 block text-ink-900">Lịch hẹn</strong>
                      <p className="mb-0 whitespace-pre-line">{displayText(item.appointment)}</p>
                    </div>

                    {canManage ? (
                      <div className="flex flex-wrap justify-end gap-2 md:col-span-2">
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          onClick={(event) => {
                            event.stopPropagation()
                            onEdit?.(item)
                          }}
                        >
                          <i className="fas fa-pen me-1"></i>Sửa
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={(event) => {
                            event.stopPropagation()
                            onDelete?.(item.visit_id)
                          }}
                        >
                          <i className="fas fa-trash me-1"></i>Xóa
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-line pt-4">
          <p className="mb-0 text-sm font-medium text-ink-600">
            Trang {currentPage}/{totalPages} · {visits.length} lần khám
          </p>
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-outline-secondary btn-sm" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
              <i className="fas fa-chevron-left me-1"></i>Trước
            </button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <button key={page} type="button" className={`btn btn-sm ${page === currentPage ? "btn-primary" : "btn-outline-secondary"}`} onClick={() => setCurrentPage(page)}>
                {page}
              </button>
            ))}
            <button type="button" className="btn btn-outline-secondary btn-sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>
              Sau<i className="fas fa-chevron-right ms-1"></i>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default MedicalVisitList
