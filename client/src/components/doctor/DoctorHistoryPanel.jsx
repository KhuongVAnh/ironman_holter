"use client"

import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import axios from "axios"
import { Card, Button } from "react-bootstrap"
import { toast } from "react-toastify"
import { useAuth } from "../../contexts/AuthContext"
import MedicalHistoryList from "../shared/MedicalHistoryList"
import MedicalHistoryForm from "../shared/MedicalHistoryForm"

const DoctorHistoryPanel = () => {
    const { patientId } = useParams()
    const { user } = useAuth()
    const [histories, setHistories] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [editData, setEditData] = useState(null)

    // --- Lấy dữ liệu bệnh sử ---
    const fetchHistory = async () => {
        try {
            const res = await axios.get(`http://localhost:4000/api/doctor/history/${patientId}`)
            setHistories(res.data)
        } catch (err) {
            console.error(err)
            toast.error("Không thể tải bệnh sử")
        }
    }

    useEffect(() => {
        if (patientId) fetchHistory()
    }, [patientId])

    // --- Thêm bản ghi ---
    const handleCreate = async (data) => {
        try {
            const payload = { ...data, patient_id: patientId, doctor_id: user.user_id }
            const res = await axios.post("http://localhost:4000/api/doctor/history", payload)
            toast.success(res.data.message)
            setShowForm(false)
            fetchHistory()
        } catch (err) {
            console.error(err)
            toast.error("Lỗi khi thêm bệnh sử")
        }
    }

    // --- Xóa bản ghi ---
    const handleDelete = async (id) => {
        if (!window.confirm("Bạn có chắc muốn xoá bản ghi này?")) return
        try {
            await axios.delete(`http://localhost:4000/api/doctor/history/${id}`)
            toast.warning("Đã xoá bản ghi")
            fetchHistory()
        } catch (err) {
            console.error(err)
            toast.error("Không thể xoá")
        }
    }

    return (
        <div className="container mt-4">
            <Card className="shadow-sm border-0 p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4>
                        <i className="fas fa-notes-medical me-2"></i>Hồ sơ bệnh nhân #{patientId}
                    </h4>
                    <Button onClick={() => setShowForm(true)} variant="primary">
                        <i className="fas fa-plus me-1"></i>Thêm bệnh sử
                    </Button>
                </div>

                <MedicalHistoryList
                    histories={histories}
                    onDelete={handleDelete}
                    role="bác sĩ"
                />

                <MedicalHistoryForm
                    show={showForm}
                    handleClose={() => setShowForm(false)}
                    onSubmit={handleCreate}
                    role="bác sĩ"
                />
            </Card>
        </div>
    )
}

export default DoctorHistoryPanel
