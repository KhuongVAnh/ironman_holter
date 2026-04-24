import DiagnosisBadge from "./DiagnosisBadge"
import { ROLE } from "../../services/string"

const displayText = (value, emptyText = "Chưa có") => {
  const text = value === null || value === undefined ? "" : String(value).trim()
  return text || emptyText
}

const MedicalHistoryList = ({ histories, onEdit, onDelete, role }) => {
  if (!histories || histories.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-surface-line bg-surface-soft px-5 py-8 text-center text-sm text-ink-600">
        Chưa có bệnh sử nào.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {histories.map((item) => (
        <details key={item.history_id} className="rounded-xl border border-surface-line bg-white p-5 shadow-soft" open>
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink-500">{new Date(item.created_at).toLocaleString("vi-VN")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <DiagnosisBadge type="ai" value={item.ai_diagnosis} />
                <DiagnosisBadge type="doctor" value={item.doctor_diagnosis} />
              </div>
            </div>
            <span className="rounded-full bg-category-50 px-3 py-1 text-xs font-semibold text-category-500">Chi tiết</span>
          </summary>

          <div className="mt-4 grid gap-3 text-sm text-ink-700 md:grid-cols-2">
            <div className="rounded-2xl bg-surface-soft p-4">
              <strong className="mb-2 block text-ink-900">Triệu chứng</strong>
              <p className="mb-0 whitespace-pre-line">{displayText(item.symptoms)}</p>
            </div>
            <div className="rounded-2xl bg-surface-soft p-4">
              <strong className="mb-2 block text-ink-900">Thuốc</strong>
              <p className="mb-0 whitespace-pre-line">{displayText(item.medication)}</p>
            </div>
            <div className="rounded-2xl bg-surface-soft p-4">
              <strong className="mb-2 block text-ink-900">Tình trạng</strong>
              <p className="mb-0 whitespace-pre-line">{displayText(item.condition)}</p>
            </div>
            <div className="rounded-2xl bg-surface-soft p-4">
              <strong className="mb-2 block text-ink-900">Ghi chú</strong>
              <p className="mb-0 whitespace-pre-line">{displayText(item.notes)}</p>
            </div>
          </div>

          {role === ROLE.BAC_SI ? (
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => onEdit?.(item)}>
                <i className="fas fa-pen me-1"></i>
                Sửa
              </button>
              <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => onDelete?.(item.history_id)}>
                <i className="fas fa-trash me-1"></i>
                Xóa
              </button>
            </div>
          ) : null}
        </details>
      ))}
    </div>
  )
}

export default MedicalHistoryList
