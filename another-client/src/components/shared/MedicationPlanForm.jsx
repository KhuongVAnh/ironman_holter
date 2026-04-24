import { useEffect, useState } from "react"
import ModalFrame from "./ModalFrame"

const normalizeText = (value) => (value === null || value === undefined ? "" : String(value))

const toDateInput = (value) => {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10)
}

const emptyMedication = () => ({
  name: "",
  dosage: "",
  timesText: "",
  type: "",
  description: "",
})

const initialState = {
  plan_id: null,
  title: "",
  start_date: new Date().toISOString().slice(0, 10),
  end_date: "",
  notes: "",
  is_active: true,
  medications: [emptyMedication()],
}

const medicationToForm = (item) => ({
  name: normalizeText(item.name),
  dosage: normalizeText(item.dosage),
  timesText: Array.isArray(item.times) ? item.times.join("\n") : normalizeText(item.times),
  type: normalizeText(item.type),
  description: normalizeText(item.description),
})

const MedicationPlanForm = ({ show, handleClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState(initialState)

  useEffect(() => {
    if (initialData) {
      setFormData({
        plan_id: initialData.plan_id || null,
        title: normalizeText(initialData.title),
        start_date: toDateInput(initialData.start_date) || new Date().toISOString().slice(0, 10),
        end_date: toDateInput(initialData.end_date),
        notes: normalizeText(initialData.notes),
        is_active: Boolean(initialData.is_active),
        medications: initialData.medications?.length ? initialData.medications.map(medicationToForm) : [emptyMedication()],
      })
      return
    }

    setFormData({ ...initialState, start_date: new Date().toISOString().slice(0, 10), medications: [emptyMedication()] })
  }, [initialData, show])

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }))
  }

  const updateMedication = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      medications: prev.medications.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }))
  }

  const addMedication = () => {
    setFormData((prev) => ({ ...prev, medications: [...prev.medications, emptyMedication()] }))
  }

  const removeMedication = (index) => {
    setFormData((prev) => ({
      ...prev,
      medications: prev.medications.length > 1 ? prev.medications.filter((_, itemIndex) => itemIndex !== index) : prev.medications,
    }))
  }

  const submit = (event) => {
    event.preventDefault()
    onSubmit({
      plan_id: formData.plan_id,
      title: formData.title.trim(),
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      notes: formData.notes.trim(),
      is_active: formData.is_active,
      medications: formData.medications
        .map((item) => ({
          name: item.name.trim(),
          dosage: item.dosage.trim(),
          times: item.timesText.split(/\r?\n/).map((time) => time.trim()).filter(Boolean),
          type: item.type.trim(),
          description: item.description.trim(),
        }))
        .filter((item) => item.name || item.dosage || item.times.length || item.type || item.description),
    })
  }

  const footer = (
    <>
      <button type="button" className="btn btn-outline-secondary" onClick={handleClose}>Hủy</button>
      <button type="submit" form="medication-plan-form" className="btn btn-primary">
        <i className={`fas ${formData.plan_id ? "fa-rotate" : "fa-save"} me-2`}></i>
        {formData.plan_id ? "Cập nhật" : "Lưu mới"}
      </button>
    </>
  )

  return (
    <ModalFrame show={show} onClose={handleClose} title={formData.plan_id ? "Cập nhật đơn thuốc" : "Thêm đơn thuốc"} size="xl" footer={footer}>
      <form id="medication-plan-form" className="space-y-4" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="form-label">Tên đơn/kế hoạch</label>
            <input className="form-control" name="title" value={formData.title} onChange={handleChange} required />
          </div>
          <div className="flex items-end">
            <label className="flex min-h-10 items-center gap-2 text-sm font-medium text-ink-800">
              <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} />
              Đang dùng
            </label>
          </div>
          <div>
            <label className="form-label">Ngày bắt đầu</label>
            <input className="form-control" type="date" name="start_date" value={formData.start_date} onChange={handleChange} required />
          </div>
          <div>
            <label className="form-label">Ngày kết thúc</label>
            <input className="form-control" type="date" name="end_date" value={formData.end_date} onChange={handleChange} />
          </div>
        </div>

        <div>
          <label className="form-label">Ghi chú</label>
          <textarea className="form-control min-h-[90px]" name="notes" value={formData.notes} onChange={handleChange} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-base font-bold text-ink-900">Danh sách thuốc</h4>
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={addMedication}>
              <i className="fas fa-plus me-1"></i>Thêm thuốc
            </button>
          </div>

          {formData.medications.map((item, index) => (
            <div key={index} className="rounded-xl border border-surface-line bg-surface-soft p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <strong className="text-sm text-ink-900">Thuốc #{index + 1}</strong>
                <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => removeMedication(index)} disabled={formData.medications.length === 1}>
                  <i className="fas fa-trash me-1"></i>Xóa
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="form-label">Tên thuốc</label>
                  <input className="form-control" value={item.name} onChange={(event) => updateMedication(index, "name", event.target.value)} required />
                </div>
                <div>
                  <label className="form-label">Liều dùng</label>
                  <input className="form-control" value={item.dosage} onChange={(event) => updateMedication(index, "dosage", event.target.value)} required />
                </div>
                <div>
                  <label className="form-label">Thời điểm uống</label>
                  <textarea className="form-control min-h-[90px]" value={item.timesText} onChange={(event) => updateMedication(index, "timesText", event.target.value)} required placeholder="Mỗi dòng một mốc giờ hoặc hướng dẫn" />
                </div>
                <div>
                  <label className="form-label">Loại thuốc</label>
                  <input className="form-control" value={item.type} onChange={(event) => updateMedication(index, "type", event.target.value)} />
                  <label className="form-label mt-3">Mô tả</label>
                  <textarea className="form-control min-h-[52px]" value={item.description} onChange={(event) => updateMedication(index, "description", event.target.value)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </form>
    </ModalFrame>
  )
}

export default MedicationPlanForm
