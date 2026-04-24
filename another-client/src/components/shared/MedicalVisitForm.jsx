import { useEffect, useState } from "react"
import ModalFrame from "./ModalFrame"

const normalizeText = (value) => (value === null || value === undefined ? "" : String(value))

const toDateInput = (value) => {
  if (!value) return new Date().toISOString().slice(0, 10)
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10)
}

const jsonToLines = (value) => {
  if (!value) return ""
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === "object" && item !== null) {
        const name = item.name || item.ten || ""
        const result = item.result || item.dosage || item.note || ""
        return [name, result].filter(Boolean).join(" | ")
      }
      return String(item)
    }).join("\n")
  }
  if (typeof value === "object") {
    return Object.entries(value).map(([key, item]) => `${key}: ${item}`).join("\n")
  }
  return String(value)
}

const linesToJsonArray = (value) => {
  const lines = normalizeText(value).split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  return lines.length ? lines : null
}

const initialState = {
  visit_id: null,
  facility: "",
  doctor_name: "",
  visit_date: toDateInput(),
  diagnosis: "",
  reason: "",
  diagnosis_details: "",
  testsText: "",
  prescriptionText: "",
  advice: "",
  appointment: "",
}

const MedicalVisitForm = ({ show, handleClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState(initialState)

  useEffect(() => {
    if (initialData) {
      setFormData({
        visit_id: initialData.visit_id || null,
        facility: normalizeText(initialData.facility),
        doctor_name: normalizeText(initialData.doctor_name),
        visit_date: toDateInput(initialData.visit_date),
        diagnosis: normalizeText(initialData.diagnosis),
        reason: normalizeText(initialData.reason),
        diagnosis_details: normalizeText(initialData.diagnosis_details),
        testsText: jsonToLines(initialData.tests),
        prescriptionText: jsonToLines(initialData.prescription),
        advice: normalizeText(initialData.advice),
        appointment: normalizeText(initialData.appointment),
      })
      return
    }

    setFormData({ ...initialState, visit_date: toDateInput() })
  }, [initialData, show])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const submit = (event) => {
    event.preventDefault()
    onSubmit({
      visit_id: formData.visit_id,
      facility: formData.facility.trim(),
      doctor_name: formData.doctor_name.trim(),
      visit_date: formData.visit_date,
      diagnosis: formData.diagnosis.trim(),
      reason: formData.reason.trim(),
      diagnosis_details: formData.diagnosis_details.trim(),
      tests: linesToJsonArray(formData.testsText),
      prescription: linesToJsonArray(formData.prescriptionText),
      advice: formData.advice.trim(),
      appointment: formData.appointment.trim(),
    })
  }

  const footer = (
    <>
      <button type="button" className="btn btn-outline-secondary" onClick={handleClose}>Hủy</button>
      <button type="submit" form="medical-visit-form" className="btn btn-primary">
        <i className={`fas ${formData.visit_id ? "fa-rotate" : "fa-save"} me-2`}></i>
        {formData.visit_id ? "Cập nhật" : "Lưu mới"}
      </button>
    </>
  )

  return (
    <ModalFrame show={show} onClose={handleClose} title={formData.visit_id ? "Cập nhật lần khám" : "Thêm lần khám"} size="lg" footer={footer}>
      <form id="medical-visit-form" className="space-y-4" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="form-label">Cơ sở y tế</label>
            <input className="form-control" name="facility" value={formData.facility} onChange={handleChange} placeholder="Ví dụ: BV Tim mạch..." />
          </div>
          <div>
            <label className="form-label">Bác sĩ phụ trách</label>
            <input className="form-control" name="doctor_name" value={formData.doctor_name} onChange={handleChange} placeholder="Tên bác sĩ hoặc khoa khám" />
          </div>
          <div>
            <label className="form-label">Ngày khám</label>
            <input className="form-control" type="date" name="visit_date" value={formData.visit_date} onChange={handleChange} required />
          </div>
          <div>
            <label className="form-label">Chẩn đoán</label>
            <input className="form-control" name="diagnosis" value={formData.diagnosis} onChange={handleChange} required />
          </div>
        </div>

        <div>
          <label className="form-label">Lý do khám</label>
          <textarea className="form-control min-h-[90px]" name="reason" value={formData.reason} onChange={handleChange} />
        </div>
        <div>
          <label className="form-label">Chi tiết chẩn đoán</label>
          <textarea className="form-control min-h-[100px]" name="diagnosis_details" value={formData.diagnosis_details} onChange={handleChange} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="form-label">Xét nghiệm</label>
            <textarea className="form-control min-h-[120px]" name="testsText" value={formData.testsText} onChange={handleChange} placeholder="Mỗi dòng một xét nghiệm hoặc kết quả" />
          </div>
          <div>
            <label className="form-label">Đơn thuốc tại lần khám</label>
            <textarea className="form-control min-h-[120px]" name="prescriptionText" value={formData.prescriptionText} onChange={handleChange} placeholder="Mỗi dòng một thuốc hoặc chỉ định" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="form-label">Lời khuyên</label>
            <textarea className="form-control min-h-[100px]" name="advice" value={formData.advice} onChange={handleChange} />
          </div>
          <div>
            <label className="form-label">Lịch hẹn</label>
            <textarea className="form-control min-h-[100px]" name="appointment" value={formData.appointment} onChange={handleChange} />
          </div>
        </div>
      </form>
    </ModalFrame>
  )
}

export default MedicalVisitForm
