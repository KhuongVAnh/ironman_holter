import React, { useState, useEffect } from "react"
import { Modal, Button, Form } from "react-bootstrap"

const MedicalHistoryForm = ({ show, handleClose, onSubmit, initialData, role }) => {
    const [formData, setFormData] = useState({
        history_id: null,
        doctor_diagnosis: "",
        medication: "",
        condition: "",
        notes: "",
    })

    // Khi mở form hoặc có dữ liệu sửa thì load lại
    useEffect(() => {
        if (initialData) {
            setFormData({
                history_id: initialData.history_id || null,
                doctor_diagnosis: initialData.doctor_diagnosis || "",
                medication: initialData.medication || "",
                condition: initialData.condition || "",
                notes: initialData.notes || "",
            })
        } else {
            setFormData({
                history_id: null,
                doctor_diagnosis: "",
                medication: "",
                condition: "",
                notes: "",
            })
        }
    }, [initialData, show])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        console.log("Submit formData:", formData) // ✅ check tại đây
        onSubmit(formData)
    }

    return (
        <Modal show={show} onHide={handleClose} centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    {formData.history_id
                        ? "Cập nhật bệnh sử"
                        : role === "bác sĩ"
                            ? "Thêm bệnh sử mới"
                            : "Cập nhật triệu chứng"}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <Form onSubmit={handleSubmit}>
                    {role === "bác sĩ" && (
                        <>
                            <Form.Group className="mb-3">
                                <Form.Label>Chuẩn đoán</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    name="doctor_diagnosis"
                                    value={formData.doctor_diagnosis}
                                    onChange={handleChange}
                                    required
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Thuốc điều trị</Form.Label>
                                <Form.Control
                                    name="medication"
                                    value={formData.medication}
                                    onChange={handleChange}
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Tình trạng</Form.Label>
                                <Form.Control
                                    name="condition"
                                    value={formData.condition}
                                    onChange={handleChange}
                                />
                            </Form.Group>
                        </>
                    )}

                    <Form.Group className="mb-3">
                        <Form.Label>Ghi chú</Form.Label>
                        <Form.Control
                            as="textarea"
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                        />
                    </Form.Group>

                    <div className="d-flex justify-content-end gap-2 mt-3">
                        <Button variant="secondary" onClick={handleClose}>
                            Hủy
                        </Button>
                        <Button type="submit" variant="primary">
                            {formData.history_id ? "Cập nhật" : "Lưu mới"}
                        </Button>
                    </div>
                </Form>
            </Modal.Body>
        </Modal>
    )
}

export default MedicalHistoryForm
