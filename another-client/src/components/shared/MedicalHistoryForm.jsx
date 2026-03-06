import { useEffect, useState } from "react"
import ModalFrame from "./ModalFrame"
import { ROLE } from "../../services/string"

const initialState = {
  history_id: null,
  doctor_diagnosis: "",
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
        doctor_diagnosis: initialData.doctor_diagnosis || "",
        medication: initialData.medication || "",
        condition: initialData.condition || "",
        notes: initialData.notes || "",
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
    onSubmit(formData)
  }

  const footer = (
    <>
      <button type="button" className="btn btn-outline-secondary" onClick={handleClose}>Huy</button>
      <button type="submit" form="medical-history-form" className="btn btn-primary">
        {formData.history_id ? "Cap nhat" : "Luu moi"}
      </button>
    </>
  )

  return (
    <ModalFrame
      show={show}
      onClose={handleClose}
      title={formData.history_id ? "Cap nhat benh su" : role === ROLE.BAC_SI ? "Them benh su moi" : "Them ghi chu benh su"}
      footer={footer}
    >
      <form id="medical-history-form" className="space-y-4" onSubmit={submit}>
        {role === ROLE.BAC_SI ? (
          <>
            <div>
              <label className="form-label">Chan doan</label>
              <textarea className="form-control min-h-[110px]" name="doctor_diagnosis" value={formData.doctor_diagnosis} onChange={handleChange} required />
            </div>
            <div>
              <label className="form-label">Thuoc dieu tri</label>
              <input className="form-control" name="medication" value={formData.medication} onChange={handleChange} />
            </div>
            <div>
              <label className="form-label">Tinh trang</label>
              <input className="form-control" name="condition" value={formData.condition} onChange={handleChange} />
            </div>
          </>
        ) : null}
        <div>
          <label className="form-label">Ghi chu</label>
          <textarea className="form-control min-h-[120px]" name="notes" value={formData.notes} onChange={handleChange} />
        </div>
      </form>
    </ModalFrame>
  )
}

export default MedicalHistoryForm
