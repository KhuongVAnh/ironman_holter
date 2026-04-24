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

const formatTimes = (times) => {
  if (!times) return "Chưa có"
  if (Array.isArray(times)) return times.filter(Boolean).join(", ") || "Chưa có"
  return String(times)
}

const MedicationPlanList = ({ plans, onEdit, onDelete, role }) => {
  const canManage = role === ROLE.BENH_NHAN || role === ROLE.BAC_SI

  if (!plans || plans.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-surface-line bg-surface-soft px-5 py-8 text-center text-sm text-ink-600">
        Chưa có kế hoạch thuốc nào.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {plans.map((plan) => (
        <details key={plan.plan_id} className="rounded-xl border border-surface-line bg-white p-5 shadow-soft" open>
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-ink-900">{displayText(plan.title, "Kế hoạch thuốc")}</h3>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${plan.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                  {plan.is_active ? "Đang dùng" : "Đã kết thúc"}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-600">
                {formatDate(plan.start_date)} - {plan.end_date ? formatDate(plan.end_date) : "Hiện tại"}
                {plan.doctor?.name ? ` | ${plan.doctor.name}` : ""}
              </p>
            </div>
            <span className="rounded-full bg-category-50 px-3 py-1 text-xs font-semibold text-category-500">Chi tiết</span>
          </summary>

          {plan.notes ? <p className="mt-4 rounded-xl bg-surface-soft p-4 text-sm text-ink-700">{plan.notes}</p> : null}

          <div className="mt-4 overflow-x-auto">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Thuốc</th>
                  <th>Liều dùng</th>
                  <th>Thời điểm</th>
                  <th>Loại thuốc</th>
                  <th>Mô tả</th>
                </tr>
              </thead>
              <tbody>
                {(plan.medications || []).map((medication) => (
                  <tr key={medication.medication_id}>
                    <td className="font-semibold text-ink-900">{displayText(medication.name)}</td>
                    <td>{displayText(medication.dosage)}</td>
                    <td>{formatTimes(medication.times)}</td>
                    <td>{displayText(medication.type)}</td>
                    <td>{displayText(medication.description)}</td>
                  </tr>
                ))}
                {!plan.medications?.length ? (
                  <tr>
                    <td colSpan="5" className="text-center text-ink-500">Chưa có thuốc trong kế hoạch này.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {canManage ? (
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => onEdit?.(plan)}>
                <i className="fas fa-pen me-1"></i>Sửa
              </button>
              <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => onDelete?.(plan.plan_id)}>
                <i className="fas fa-trash me-1"></i>Xóa
              </button>
            </div>
          ) : null}
        </details>
      ))}
    </div>
  )
}

export default MedicationPlanList
