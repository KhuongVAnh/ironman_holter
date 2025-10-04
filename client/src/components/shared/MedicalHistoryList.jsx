import React from "react";
import { Accordion, Card, Button } from "react-bootstrap";
import DiagnosisBadge from "./DiagnosisBadge";

const MedicalHistoryList = ({ histories, onEdit, onDelete, role }) => {
    if (!histories || histories.length === 0)
        return <p className="text-muted">Chưa có bệnh sử nào.</p>;

    return (
        <Accordion defaultActiveKey="0">
            {histories.map((h, index) => (
                <Accordion.Item eventKey={index.toString()} key={h.history_id}>
                    <Accordion.Header>
                        <div className="d-flex flex-column w-100">
                            <span className="fw-bold">{new Date(h.created_at).toLocaleString()}</span>
                            <div>
                                <DiagnosisBadge type="ai" value={h.ai_diagnosis} />
                                <DiagnosisBadge type="doctor" value={h.doctor_diagnosis} />
                            </div>
                        </div>
                    </Accordion.Header>
                    <Accordion.Body>
                        <Card className="border-0">
                            <Card.Body>
                                <p>
                                    <strong>Triệu chứng:</strong>{" "}
                                    {h.symptoms ? JSON.parse(h.symptoms).join(", ") : "Chưa có"}
                                </p>
                                <p>
                                    <strong>Thuốc:</strong> {h.medication || "Chưa có"}
                                </p>
                                <p>
                                    <strong>Tình trạng:</strong> {h.condition || "Chưa có"}
                                </p>
                                <p>
                                    <strong>Ghi chú:</strong> {h.notes || "Không có"}
                                </p>
                                {role === "bác sĩ" && (
                                    <div className="text-end">
                                        <Button
                                            size="sm"
                                            variant="outline-primary"
                                            onClick={() => onEdit(h)}
                                            className="me-2"
                                        >
                                            <i className="fas fa-edit me-1"></i> Sửa
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline-danger"
                                            onClick={() => onDelete(h.history_id)}
                                        >
                                            <i className="fas fa-trash"></i> Xóa
                                        </Button>
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    </Accordion.Body>
                </Accordion.Item>
            ))}
        </Accordion>
    );
};

export default MedicalHistoryList;
