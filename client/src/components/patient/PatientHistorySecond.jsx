"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, Button } from "react-bootstrap";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-toastify";
import MedicalHistoryList from "../shared/MedicalHistoryList";
import MedicalHistoryForm from "../shared/MedicalHistoryForm";

const PatientHistorySecond = () => {
    const { user } = useAuth();
    const [histories, setHistories] = useState([]);
    const [showForm, setShowForm] = useState(false);

    const fetchHistories = async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/history/${user.user_id}`);
            setHistories(res.data);
        } catch {
            toast.error("Không thể tải bệnh sử");
        }
    };

    useEffect(() => {
        fetchHistories();
    }, []);

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

export default PatientHistorySecond;
