import { useEffect, useState } from "react"
import ModalFrame from "./ModalFrame"
import { ROLE } from "../../services/string"

const normalizeText = (value) => (value === null || value === undefined ? "" : String(value))

const initialState = {
  history_id: null,
  doctor_diagnosis: "",
  symptoms: "",
  medication: "",
  condition: "",
  notes: "",
}

const MedicalHistoryForm = ({ show, handleClose, onSubmit, initialData, role }) => {
  const [formData, setFormData] = useState(initialState)

  useEffect(() => {
    if (initialData) {
      setFormData({
        history_id: initialData.history_id || null,
        doctor_diagnosis: normalizeText(initialData.doctor_diagnosis),
        symptoms: normalizeText(initialData.symptoms),
        medication: normalizeText(initialData.medication),
        condition: normalizeText(initialData.condition),
        notes: normalizeText(initialData.notes),
      })
      return
    }

    setFormData(initialState)
  }, [initialData, show])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const submit = (event) => {
    event.preventDefault()

    onSubmit({
      history_id: formData.history_id,
      doctor_diagnosis: formData.doctor_diagnosis.trim(),
      symptoms: formData.symptoms.trim(),
      medication: formData.medication.trim(),
      condition: formData.condition.trim(),
      notes: formData.notes.trim(),
    })
  }

  const footer = (
    <>
      <button type="button" className="btn btn-outline-secondary" onClick={handleClose}>Hủy</button>
      <button type="submit" form="medical-history-form" className="btn btn-primary">
        {formData.history_id ? "Cập nhật" : "Lưu mới"}
      </button>
    </>
  )

  const isDoctor = role === ROLE.BAC_SI

  return (
    <ModalFrame
      show={show}
      onClose={handleClose}
      title={
        formData.history_id
          ? "Cập nhật bệnh sử"
          : isDoctor
            ? "Thêm bệnh sử mới"
            : "Thêm ghi chú bệnh sử"
      }
      footer={footer}
    >
      <form id="medical-history-form" className="space-y-4" onSubmit={submit}>
        {isDoctor ? (
          <div>
            <label className="form-label">Chẩn đoán của bác sĩ</label>
            <textarea
              className="form-control min-h-[110px]"
              name="doctor_diagnosis"
              value={formData.doctor_diagnosis}
              onChange={handleChange}
              required
              placeholder="Nhập chẩn đoán hoặc kết luận của bác sĩ"
            />
          </div>
        ) : null}

        <div>
          <label className="form-label">Triệu chứng</label>
          <textarea
            className="form-control min-h-[110px]"
            name="symptoms"
            value={formData.symptoms}
            onChange={handleChange}
            placeholder="Nhập mô tả triệu chứng hiện tại"
          />
        </div>

        {isDoctor ? (
          <div>
            <label className="form-label">Thuốc và khuyến nghị</label>
            <textarea
              className="form-control min-h-[110px]"
              name="medication"
              value={formData.medication}
              onChange={handleChange}
              placeholder="Nhập thuốc đang dùng hoặc khuyến nghị điều trị"
            />
          </div>
        ) : null}

        <div>
          <label className="form-label">Tình trạng</label>
          <textarea
            className="form-control min-h-[90px]"
            name="condition"
            value={formData.condition}
            onChange={handleChange}
            placeholder="Ví dụ: Theo dõi thêm 2 tuần, tình trạng ổn định"
          />
        </div>

        <div>
          <label className="form-label">Ghi chú</label>
          <textarea
            className="form-control min-h-[120px]"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Nhập ghi chú cần lưu lại cho lần theo dõi sau"
          />
        </div>
      </form>
    </ModalFrame>
  )
}

export default MedicalHistoryForm
