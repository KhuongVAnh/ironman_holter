import { ROLE } from "../../services/string"

const displayText = (value, emptyText = "Chưa có") => {
  const text = value === null || value === undefined ? "" : String(value).trim()
  return text || emptyText
}

const formatDate = (value) => {
  if (!value) return "Chưa có"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Chưa có" : date.toLocaleDateString("vi-VN")
}

const toTextArray = (value) => {
  if (!value) return []
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
  const text = String(value).trim()
  return text ? [text] : []
}

const getPlanTone = (plan) => {
  if (plan.is_active) return "border-emerald-100 bg-emerald-50 text-emerald-700"
  return "border-slate-200 bg-slate-50 text-slate-700"
}

const MedicationCard = ({ medication, index }) => {
  const times = toTextArray(medication.times)

  return (
    <article className="rounded-xl border border-surface-line bg-white p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <i className="fas fa-pills"></i>
          </span>
          <div className="min-w-0">
            <p className="mb-0 text-base font-bold leading-6 text-ink-950">
              {displayText(medication.name, `Thuốc ${index + 1}`)}
            </p>
            {medication.type ? (
              <p className="mb-0 mt-1 text-xs font-bold uppercase tracking-[0.08em] text-ink-500">{medication.type}</p>
            ) : null}
          </div>
        </div>
        <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">
          {displayText(medication.dosage, "Chưa có liều")}
        </span>
      </div>

      <div className="mt-4 rounded-xl bg-surface-soft p-3">
        <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-ink-500">
          <i className="far fa-clock"></i>
          Thời điểm uống
        </p>
        {times.length ? (
          <div className="flex flex-wrap gap-2">
            {times.map((time, timeIndex) => (
              <span key={`${timeIndex}-${time}`} className="rounded-full border border-surface-line bg-white px-3 py-1 text-xs font-semibold text-ink-700">
                {time}
              </span>
            ))}
          </div>
        ) : (
          <p className="mb-0 text-sm text-ink-500">Chưa có</p>
        )}
      </div>

      {medication.description ? (
        <p className="mb-0 mt-3 whitespace-pre-line text-sm font-medium leading-6 text-ink-700">{medication.description}</p>
      ) : null}
    </article>
  )
}

const MedicationPlanList = ({ plans, onEdit, onDelete, role }) => {
  const canManage = role === ROLE.BENH_NHAN || role === ROLE.BAC_SI

  if (!plans || plans.length === 0) {
    return (
      <div className="empty-state-rich">
        <div className="empty-state-rich-icon success"><i className="fas fa-prescription-bottle-medical"></i></div>
        <h3 className="mt-4 text-lg font-bold text-ink-900">Chưa có kế hoạch thuốc</h3>
        <p className="mb-0 mt-2 text-sm text-ink-600">Khi có đơn thuốc, thông tin liều dùng và thời điểm uống sẽ hiển thị tại đây.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {plans.map((plan) => {
        const medications = plan.medications || []

        return (
          <article key={plan.plan_id} className="overflow-hidden rounded-2xl border border-surface-line bg-white shadow-soft">
            <div className="border-b border-surface-line bg-surface-soft/70 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-white text-xl text-emerald-700 shadow-soft">
                    <i className="fas fa-briefcase-medical"></i>
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="mb-0 text-lg font-bold leading-7 text-ink-950">{displayText(plan.title, "Kế hoạch thuốc")}</h3>
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getPlanTone(plan)}`}>
                        {plan.is_active ? "Đang dùng" : "Đã kết thúc"}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold text-ink-700">
                      <span className="inline-flex items-center gap-2 rounded-full border border-surface-line bg-white px-3 py-1">
                        <i className="far fa-calendar-plus text-emerald-700"></i>
                        {formatDate(plan.start_date)}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-surface-line bg-white px-3 py-1">
                        <i className="far fa-calendar-check text-sky-700"></i>
                        {plan.end_date ? formatDate(plan.end_date) : "Hiện tại"}
                      </span>
                      {plan.doctor?.name ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-surface-line bg-white px-3 py-1">
                          <i className="fas fa-user-doctor text-ink-600"></i>
                          {plan.doctor.name}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-emerald-100 bg-white px-4 py-2 text-sm font-bold text-emerald-700 shadow-soft">
                    {medications.length} thuốc
                  </span>
                  {canManage ? (
                    <>
                      <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => onEdit?.(plan)}>
                        <i className="fas fa-pen"></i>
                        Sửa
                      </button>
                      <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => onDelete?.(plan.plan_id)}>
                        <i className="fas fa-trash"></i>
                        Xóa
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              {plan.notes ? (
                <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-900">
                  <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-amber-700">
                    <i className="fas fa-circle-info"></i>
                    Ghi chú
                  </p>
                  <p className="mb-0 whitespace-pre-line">{plan.notes}</p>
                </div>
              ) : null}
            </div>

            <div className="p-5">
              {medications.length ? (
                <div className="grid gap-3 xl:grid-cols-2">
                  {medications.map((medication, index) => (
                    <MedicationCard key={medication.medication_id || `${plan.plan_id}-${index}`} medication={medication} index={index} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-surface-line bg-surface-soft px-4 py-6 text-center text-sm text-ink-500">
                  Chưa có thuốc trong kế hoạch này.
                </div>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}

export default MedicationPlanList
