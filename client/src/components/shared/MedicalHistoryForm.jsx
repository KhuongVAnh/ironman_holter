import React, { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";

const MedicalHistoryForm = ({ show, handleClose, onSubmit, initialData, role }) => {
    const [formData, setFormData] = useState(
        initialData || {
            doctor_diagnosis: "",
            medication: "",
            condition: "",
            notes: "",
        }
    );

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
        handleClose();
    };

    return (
        <Modal show={show} onHide={handleClose} centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    {role === "bác sĩ" ? "Thêm bệnh sử mới" : "Cập nhật triệu chứng"}
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

                    <Button type="submit" variant="primary" className="w-100">
                        Lưu lại
                    </Button>
                </Form>
            </Modal.Body>
        </Modal>
    );
};

export default MedicalHistoryForm;
