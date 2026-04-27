import { useEffect, useState } from "react"
import ModalFrame from "./ModalFrame"

const normalizeText = (value) => (value === null || value === undefined ? "" : String(value))

const toDateInput = (value) => {
  if (!value) return new Date().toISOString().slice(0, 10)
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10)
}

const emptyTest = () => ({ name: "", imageUrl: "", doctorComment: "" })
const emptyPrescription = () => ({ name: "", dosage: "", note: "" })

const normalizeTests = (value) => {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === "object" && item !== null) {
        return {
          name: normalizeText(item.name || item.ten),
          imageUrl: normalizeText(item.imageUrl || item.image_url || item.url || item.fileUrl || item.file_url),
          doctorComment: normalizeText(item.doctorComment || item.doctor_comment || item.comment || item.result || item.note),
        }
      }
      return { ...emptyTest(), name: normalizeText(item) }
    })
  }
  return [{ ...emptyTest(), name: normalizeText(value) }]
}

const normalizePrescription = (value) => {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === "object" && item !== null) {
        return {
          name: normalizeText(item.name || item.ten),
          dosage: normalizeText(item.dosage || item.dose || item.amount),
          note: normalizeText(item.instruction || item.description || item.note || item.times || item.doctorComment || item.doctor_comment),
        }
      }
      return { ...emptyPrescription(), name: normalizeText(item) }
    })
  }
  return [{ ...emptyPrescription(), name: normalizeText(value) }]
}

const compactTests = (items) => {
  const result = items
    .map((item) => ({
      name: item.name.trim(),
      imageUrl: item.imageUrl.trim(),
      doctorComment: item.doctorComment.trim(),
    }))
    .filter((item) => item.name || item.imageUrl || item.doctorComment)

  return result.length ? result : null
}

const compactPrescription = (items) => {
  const result = items
    .map((item) => ({
      name: item.name.trim(),
      dosage: item.dosage.trim(),
      note: item.note.trim(),
    }))
    .filter((item) => item.name || item.dosage || item.note)

  return result.length ? result : null
}

const updateListItem = (items, index, field, value) =>
  items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))

const removeListItem = (items, index) => items.filter((_item, itemIndex) => itemIndex !== index)

const ensureOneItem = (items, factory) => {
  if (items.length) return items
  return [factory()]
}

const MedicalVisitTestsEditor = ({ tests, onChange }) => (
  <div className="structured-entry-panel">
    <div className="structured-entry-header">
      <div>
        <label className="form-label mb-1">Xét nghiệm</label>
        <p className="structured-entry-hint">Mỗi dòng là một kết quả xét nghiệm/chụp chiếu.</p>
      </div>
      <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => onChange([...tests, emptyTest()])}>
        <i className="fas fa-plus"></i>
        Thêm
      </button>
    </div>

    <div className="space-y-3">
      {ensureOneItem(tests, emptyTest).map((item, index) => (
        <div key={index} className="structured-entry-row">
          <div className="grid gap-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div>
              <label className="form-label">Tên xét nghiệm</label>
              <input
                className="form-control"
                value={item.name}
                onChange={(event) => onChange(updateListItem(ensureOneItem(tests, emptyTest), index, "name", event.target.value))}
                placeholder="VD: Holter ECG"
              />
            </div>
            <div>
              <label className="form-label">Link ảnh/kết quả</label>
              <input
                className="form-control"
                value={item.imageUrl}
                onChange={(event) => onChange(updateListItem(ensureOneItem(tests, emptyTest), index, "imageUrl", event.target.value))}
                placeholder="https://..."
              />
            </div>
          </div>
          <div>
            <label className="form-label">Nhận xét bác sĩ</label>
            <textarea
              className="form-control min-h-[72px]"
              value={item.doctorComment}
              onChange={(event) => onChange(updateListItem(ensureOneItem(tests, emptyTest), index, "doctorComment", event.target.value))}
              placeholder="VD: Ổn định hơn, chưa ghi nhận cơn nguy hiểm kéo dài."
            />
          </div>
          {ensureOneItem(tests, emptyTest).length > 1 ? (
            <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => onChange(removeListItem(tests, index))}>
              <i className="fas fa-trash"></i>
              Xóa xét nghiệm này
            </button>
          ) : null}
        </div>
      ))}
    </div>
  </div>
)

const MedicalVisitPrescriptionEditor = ({ prescriptions, onChange }) => (
  <div className="structured-entry-panel">
    <div className="structured-entry-header">
      <div>
        <label className="form-label mb-1">Đơn thuốc tại lần khám</label>
        <p className="structured-entry-hint">Nhập từng thuốc/chỉ định theo các ô riêng.</p>
      </div>
      <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => onChange([...prescriptions, emptyPrescription()])}>
        <i className="fas fa-plus"></i>
        Thêm
      </button>
    </div>

    <div className="space-y-3">
      {ensureOneItem(prescriptions, emptyPrescription).map((item, index) => (
        <div key={index} className="structured-entry-row">
          <div className="grid gap-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div>
              <label className="form-label">Tên thuốc/chỉ định</label>
              <input
                className="form-control"
                value={item.name}
                onChange={(event) => onChange(updateListItem(ensureOneItem(prescriptions, emptyPrescription), index, "name", event.target.value))}
                placeholder="VD: Magie B6"
              />
            </div>
            <div>
              <label className="form-label">Liều lượng / cách dùng</label>
              <input
                className="form-control"
                value={item.dosage}
                onChange={(event) => onChange(updateListItem(ensureOneItem(prescriptions, emptyPrescription), index, "dosage", event.target.value))}
                placeholder="VD: Buổi tối trong 14 ngày"
              />
            </div>
          </div>
          <div>
            <label className="form-label">Ghi chú</label>
            <textarea
              className="form-control min-h-[72px]"
              value={item.note}
              onChange={(event) => onChange(updateListItem(ensureOneItem(prescriptions, emptyPrescription), index, "note", event.target.value))}
              placeholder="VD: Ngưng sau đợt hiện tại nếu không còn triệu chứng"
            />
          </div>
          {ensureOneItem(prescriptions, emptyPrescription).length > 1 ? (
            <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => onChange(removeListItem(prescriptions, index))}>
              <i className="fas fa-trash"></i>
              Xóa thuốc này
            </button>
          ) : null}
        </div>
      ))}
    </div>
  </div>
)

const initialState = {
  visit_id: null,
  facility: "",
  doctor_name: "",
  visit_date: toDateInput(),
  diagnosis: "",
  reason: "",
  diagnosis_details: "",
  tests: [],
  prescription: [],
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
        tests: normalizeTests(initialData.tests),
        prescription: normalizePrescription(initialData.prescription),
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
      tests: compactTests(formData.tests),
      prescription: compactPrescription(formData.prescription),
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
        <MedicalVisitTestsEditor
          tests={formData.tests}
          onChange={(tests) => setFormData((prev) => ({ ...prev, tests }))}
        />

        <MedicalVisitPrescriptionEditor
          prescriptions={formData.prescription}
          onChange={(prescription) => setFormData((prev) => ({ ...prev, prescription }))}
        />
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
