"use client";
import React, { useState, useEffect } from "react";
import { historyApi } from "../../services/api";
import { Card, Button } from "react-bootstrap";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-toastify";
import MedicalHistoryList from "../shared/MedicalHistoryList";
import MedicalHistoryForm from "../shared/MedicalHistoryForm";

const PatientMedicalHistory = () => {
    const { user } = useAuth();
    const [histories, setHistories] = useState([]);
    const [showForm, setShowForm] = useState(false);

    const fetchHistories = async () => {
        try {
            const res = await historyApi.getByUser(user.user_id);
            setHistories(res.data);
        } catch {
            toast.error("Không thể tải bệnh sử");
        }
    };

    useEffect(() => {
        if (user?.user_id) {
            fetchHistories();
        }
    }, [user?.user_id]);

    return (
        <div className="container mt-4">
            <Card className="shadow-sm border-0 p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4>
                        <i className="fas fa-notes-medical me-2"></i>Bệnh sử của tôi
                    </h4>
                    <Button onClick={() => setShowForm(true)}>
                        <i className="fas fa-plus me-2"></i>Thêm ghi chú
                    </Button>
                </div>

                <MedicalHistoryList histories={histories} role={user.role} />

                <MedicalHistoryForm
                    show={showForm}
                    handleClose={() => setShowForm(false)}
                    role={user.role}
                    onSubmit={(data) => toast.success("Đã gửi ghi chú!")}
                />
            </Card>
        </div>
    );
};

export default PatientMedicalHistory;
