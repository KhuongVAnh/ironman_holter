import DiagnosisBadge from "./DiagnosisBadge"
import { ROLE } from "../../services/string"

const parseSymptoms = (value) => {
  if (!value) return []
  if (Array.isArray(value)) return value
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const MedicalHistoryList = ({ histories, onEdit, onDelete, role }) => {
  if (!histories || histories.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-surface-line bg-surface px-5 py-8 text-center text-sm text-ink-600">
        Chua co benh su nao.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {histories.map((item) => {
        const symptoms = parseSymptoms(item.symptoms)
        return (
          <details key={item.history_id} className="rounded-[24px] border border-surface-line bg-white p-5 shadow-soft" open>
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-ink-500">{new Date(item.created_at).toLocaleString("vi-VN")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <DiagnosisBadge type="ai" value={item.ai_diagnosis} />
                  <DiagnosisBadge type="doctor" value={item.doctor_diagnosis} />
                </div>
              </div>
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">Chi tiet</span>
            </summary>
            <div className="mt-4 grid gap-3 text-sm text-ink-700 md:grid-cols-2">
              <div className="rounded-2xl bg-surface p-4"><strong className="mr-2 text-ink-900">Trieu chung:</strong>{symptoms.length > 0 ? symptoms.join(", ") : "Chua co"}</div>
              <div className="rounded-2xl bg-surface p-4"><strong className="mr-2 text-ink-900">Thuoc:</strong>{item.medication || "Chua co"}</div>
              <div className="rounded-2xl bg-surface p-4"><strong className="mr-2 text-ink-900">Tinh trang:</strong>{item.condition || "Chua co"}</div>
              <div className="rounded-2xl bg-surface p-4"><strong className="mr-2 text-ink-900">Ghi chu:</strong>{item.notes || "Khong co"}</div>
            </div>
            {role === ROLE.BAC_SI ? (
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => onEdit?.(item)}>
                  <i className="fas fa-pen me-1"></i>
                  Sua
                </button>
                <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => onDelete?.(item.history_id)}>
                  <i className="fas fa-trash me-1"></i>
                  Xoa
                </button>
              </div>
            ) : null}
          </details>
        )
      })}
    </div>
  )
}

export default MedicalHistoryList
