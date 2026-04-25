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

const toArray = (value) => {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

const getTestImageUrl = (item) => {
  if (!item || typeof item !== "object") return ""
  return item.imageUrl || item.image_url || item.url || item.fileUrl || item.file_url || ""
}

const getTestComment = (item) => {
  if (!item || typeof item !== "object") return ""
  return item.doctorComment || item.doctor_comment || item.comment || item.note || item.result || ""
}

const SectionTitle = ({ icon, children }) => (
  <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.14em] text-ink-600">
    {icon ? <i className={`${icon} text-sky-700`}></i> : null}
    {children}
  </h3>
)

const renderTests = (tests) => {
  const items = toArray(tests)

  if (!items.length) {
    return <p className="mb-0 text-sm text-ink-500">Chưa có</p>
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item, index) => {
        const isObject = typeof item === "object" && item !== null
        const name = isObject ? displayText(item.name || item.ten, `Xét nghiệm ${index + 1}`) : displayText(item, `Xét nghiệm ${index + 1}`)
        const imageUrl = getTestImageUrl(item)
        const doctorComment = getTestComment(item)

        return (
          <article key={`${index}-${name}`} className="overflow-hidden rounded-xl border border-surface-line bg-white shadow-soft">
            {imageUrl ? (
              <a href={imageUrl} target="_blank" rel="noreferrer" className="block bg-surface-soft">
                <img src={imageUrl} alt={name} className="aspect-video w-full object-cover" loading="lazy" />
              </a>
            ) : null}
            <div className="space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="mb-0 inline-flex min-w-0 items-center gap-2 font-bold text-ink-900">
                  <i className="fas fa-file-medical text-emerald-600"></i>
                  <span className="truncate">{name}</span>
                </p>
                {imageUrl ? (
                  <a href={imageUrl} target="_blank" rel="noreferrer" className="btn btn-outline-success btn-sm">
                    <i className="fas fa-image"></i>
                    Mở ảnh
                  </a>
                ) : null}
              </div>
              <div className="rounded-lg bg-surface-soft px-3 py-2">
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-ink-500">Nhận xét bác sĩ</p>
                <p className="mb-0 whitespace-pre-line text-sm font-medium leading-6 text-ink-800">
                  {displayText(doctorComment)}
                </p>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

const renderPrescription = (prescription) => {
  const items = toArray(prescription)

  if (!items.length) {
    return <p className="mb-0 text-sm text-ink-500">Chưa có</p>
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        if (typeof item !== "object" || item === null) {
          return (
            <div key={`${index}-${item}`} className="rounded-xl border border-surface-line bg-surface-soft p-4">
              <p className="mb-0 whitespace-pre-line font-medium text-ink-800">{displayText(item)}</p>
            </div>
          )
        }

        return (
          <div key={`${index}-${item.name || "medicine"}`} className="rounded-xl border border-surface-line bg-surface-soft p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="mb-0 text-lg font-bold text-ink-900">{displayText(item.name || item.ten, `Thuốc ${index + 1}`)}</p>
                  {item.dosage ? (
                    <>
                      <span className="hidden h-5 w-px bg-surface-line sm:inline-block"></span>
                      <span className="font-semibold text-ink-500">{item.dosage}</span>
                    </>
                  ) : null}
                </div>
                <p className="mb-0 mt-2 whitespace-pre-line text-sm font-medium leading-6 text-ink-700">
                  {displayText(item.instruction || item.description || item.note || item.times)}
                </p>
              </div>
              {item.quantity || item.amount ? (
                <span className="rounded-full border border-surface-line bg-white px-4 py-2 text-sm font-bold text-sky-700 shadow-soft">
                  SL: {item.quantity || item.amount}
                </span>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const MedicalVisitDetailModal = ({ visit, canManage, onClose, onEdit, onDelete }) => {
  useEffect(() => {
    if (!visit) return undefined

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.()
    }

    window.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [visit, onClose])

  if (!visit) return null

  const doctorName = displayText(visit.doctor_name || visit.doctor?.name, "Chưa có bác sĩ")

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-panel max-w-4xl rounded-[24px]" onClick={(event) => event.stopPropagation()}>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-surface-line bg-white px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold leading-tight text-ink-950">Chi tiết khám bệnh</h2>
            <p className="mb-0 mt-2 flex flex-wrap items-center gap-2 text-sm font-medium text-ink-700">
              <i className="far fa-calendar text-ink-600"></i>
              <span>{formatDate(visit.visit_date)}</span>
              <span className="text-ink-400">•</span>
              <span className="truncate">{displayText(visit.facility, "Chưa có cơ sở y tế")}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canManage ? (
              <>
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-sky-50 text-sky-700 transition hover:bg-sky-100"
                  onClick={() => {
                    onClose?.()
                    onEdit?.(visit)
                  }}
                  aria-label="Sửa lần khám"
                >
                  <i className="fas fa-pen"></i>
                </button>
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600 transition hover:bg-red-100"
                  onClick={() => {
                    onDelete?.(visit.visit_id)
                    onClose?.()
                  }}
                  aria-label="Xóa lần khám"
                >
                  <i className="fas fa-trash-can"></i>
                </button>
              </>
            ) : null}
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-ink-900 transition hover:bg-surface-line"
              onClick={onClose}
              aria-label="Đóng"
            >
              <i className="fas fa-xmark text-xl"></i>
            </button>
          </div>
        </div>

        <div className="modal-body space-y-6 px-5 py-6 sm:px-6">
          <section>
            <SectionTitle>Bác sĩ phụ trách</SectionTitle>
            <p className="mb-0 text-xl font-bold text-ink-900">{doctorName}</p>
          </section>

          <section className="rounded-xl border border-surface-line bg-surface-soft p-5">
            <p className="mb-2 text-[13px] font-bold uppercase tracking-[0.14em] text-sky-500">Chẩn đoán xác định</p>
            <p className="mb-0 whitespace-pre-line text-base font-bold leading-7 text-ink-950">
              {displayText(visit.diagnosis, "Chưa có chẩn đoán")}
            </p>
            {visit.diagnosis_details ? (
              <p className="mb-0 mt-3 whitespace-pre-line text-sm font-medium leading-6 text-ink-700">
                {visit.diagnosis_details}
              </p>
            ) : null}
          </section>

          <section>
            <SectionTitle>Lý do khám / Triệu chứng ban đầu</SectionTitle>
            <p className="mb-0 whitespace-pre-line text-sm font-medium leading-7 text-ink-800">{displayText(visit.reason)}</p>
          </section>

          <section>
            <SectionTitle>Kết quả xét nghiệm / Chụp chiếu</SectionTitle>
            {renderTests(visit.tests)}
          </section>

          <section className="border-t border-surface-line pt-6">
            <SectionTitle icon="fas fa-prescription-bottle-medical">Đơn thuốc</SectionTitle>
            {renderPrescription(visit.prescription)}
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-xl border border-surface-line bg-white p-4">
              <SectionTitle>Lời khuyên</SectionTitle>
              <p className="mb-0 whitespace-pre-line text-sm font-medium leading-6 text-ink-800">{displayText(visit.advice)}</p>
            </section>
            <section className="rounded-xl border border-surface-line bg-white p-4">
              <SectionTitle>Lịch hẹn</SectionTitle>
              <p className="mb-0 whitespace-pre-line text-sm font-medium leading-6 text-ink-800">{displayText(visit.appointment)}</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

const MedicalVisitList = ({ visits, onEdit, onDelete, role, onCreate }) => {
  const canManage = role === ROLE.BENH_NHAN || role === ROLE.BAC_SI
  const [selectedVisit, setSelectedVisit] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil((visits?.length || 0) / PAGE_SIZE))

  useEffect(() => {
    setCurrentPage(1)
    setSelectedVisit(null)
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

        {visibleVisits.map((item) => (
          <article key={item.visit_id} className="relative">
            <span className="absolute -left-[51px] top-2 z-10 h-6 w-6 rounded-full border-4 border-white bg-sky-500 shadow-soft"></span>
            <button
              type="button"
              className="w-full rounded-[28px] border border-sky-100 bg-white px-5 py-5 text-left shadow-soft transition hover:border-sky-200 hover:shadow-medium focus:outline-none focus:ring-2 focus:ring-sky-100 sm:px-7"
              onClick={() => setSelectedVisit(item)}
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
                  <span className="inline-flex items-center gap-2 text-sm font-bold text-sky-600">
                    Xem chi tiết
                    <i className="fas fa-chevron-right text-xs"></i>
                  </span>
                </div>
              </div>
            </button>
          </article>
        ))}
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

      <MedicalVisitDetailModal
        visit={selectedVisit}
        canManage={canManage}
        onClose={() => setSelectedVisit(null)}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  )
}

export default MedicalVisitList
