"use client"

import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { Card, Button, Table, Spinner } from "react-bootstrap"
import { toast } from "react-toastify"
import { useAuth } from "../../contexts/AuthContext"
import MedicalHistoryList from "../shared/MedicalHistoryList"
import MedicalHistoryForm from "../shared/MedicalHistoryForm"
import { alertsApi, historyApi } from "../../services/api"
import { ALERT_TYPE, ROLE } from "../../services/string"

const DoctorHistoryPanel = () => {
    const { patientId } = useParams()
    const { user } = useAuth()
    const [histories, setHistories] = useState([])
    const [alerts, setAlerts] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [loadingAlerts, setLoadingAlerts] = useState(true)
    const [editData, setEditData] = useState(null) // ⚡ lưu bản ghi đang được sửa
    const [historyId, setHistoryId] = useState(1)

    // --- Lấy dữ liệu bệnh sử ---
    const fetchHistory = async () => {
        try {
            const res = await historyApi.getDoctorHistory(patientId)
            setHistories(res.data)
        } catch (err) {
            console.error(err)
            toast.error("Không thể tải bệnh sử")
        }
    }

    // --- Lấy danh sách cảnh báo ---
    const fetchAlerts = async () => {
        try {
            setLoadingAlerts(true)
            const res = await alertsApi.getByUser(patientId)
            setAlerts(res.data.alerts || [])
        } catch (err) {
            console.error("Lỗi tải cảnh báo:", err)
            toast.error("Không thể tải danh sách cảnh báo")
        } finally {
            setLoadingAlerts(false)
        }
    }

    useEffect(() => {
        if (patientId) {
            fetchHistory()
            fetchAlerts()
        }
    }, [patientId])

    // --- Thêm bản ghi ---
    const handleCreate = async (data) => {
        try {
            const payload = { ...data, patient_id: patientId, doctor_id: user.user_id }
            const res = await historyApi.addDoctorHistory(payload)
            toast.success(res.data.message)
            setShowForm(false)
            setEditData(null)
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
            await historyApi.deleteDoctorHistory(id)
            toast.warning("Đã xoá bản ghi")
            fetchHistory()
        } catch (err) {
            console.error(err)
            toast.error("Không thể xoá")
        }
    }

    // --- Cập nhật bản ghi ---
    const handleUpdate = async (data) => {
        console.log(data)
        try {
            const res = await historyApi.updateDoctorHistory(data.history_id, data)
            toast.info(res.data.message)
            setShowForm(false)
            setEditData(null)
            fetchHistory()
        } catch (err) {
            console.error(err)
            toast.error("Không thể cập nhật bệnh sử")
        }
    }

    // --- Xử lý cảnh báo ---
    const handleResolve = async (alertId) => {
        if (!window.confirm("Xác nhận xử lý cảnh báo này?")) return
        try {
            await alertsApi.resolve(alertId)
            toast.success("Đã đánh dấu cảnh báo đã xử lý")
            fetchAlerts()
        } catch (err) {
            console.error("Lỗi xử lý cảnh báo:", err)
            toast.error("Không thể xử lý cảnh báo")
        }
    }

    const formatDate = (dateString) => new Date(dateString).toLocaleString("vi-VN")

    const getAlertPriority = (type) => {
        if (!type) return "bg-secondary"
        const t = type.toLowerCase()
        if (t.includes("ngưng tim") || t.includes(ALERT_TYPE.RUNG_NHI)) return "bg-danger"
        if (t.includes(ALERT_TYPE.NGOAI_TAM_THU)) return "bg-warning"
        if (t.includes(ALERT_TYPE.NHIP_NHANH)) return "bg-info"
        return "bg-secondary"
    }

    return (
        <div className="container mt-4">
            <Card className="shadow-sm border-0 p-4 mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4>
                        <i className="fas fa-notes-medical me-2"></i>Bệnh sử bệnh nhân #{patientId}
                    </h4>
                    <Button
                        onClick={() => {
                            setEditData(null) // reset nếu là thêm mới
                            setShowForm(true)
                        }}
                        variant="primary"
                    >
                        <i className="fas fa-plus me-1"></i>Thêm bệnh sử
                    </Button>
                </div>

                <MedicalHistoryList
                    histories={histories}
                    onEdit={(record) => {
                        setHistoryId(record.history_id)
                        setEditData(record) // ⚡ lưu bản ghi đang sửa
                        setShowForm(true)
                    }}
                    onDelete={handleDelete}
                    role={ROLE.BAC_SI}
                />

                {/* --- Form thêm/sửa --- */}
                <MedicalHistoryForm
                    show={showForm}
                    handleClose={() => {
                        setShowForm(false)
                        setEditData(null)
                    }}
                    onSubmit={editData ? handleUpdate : handleCreate}
                    initialData={editData}
                    role={ROLE.BAC_SI}
                />
            </Card >

            {/* --- Bảng cảnh báo của bệnh nhân --- */}
            < Card className="shadow-sm border-0 p-4" >
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="mb-0">
                        <i className="fas fa-bell text-danger me-2"></i>Cảnh báo bệnh nhân
                    </h4>
                    <Button variant="outline-primary" size="sm" onClick={fetchAlerts}>
                        <i className="fas fa-sync-alt me-1"></i>Làm mới
                    </Button>
                </div>

                {
                    loadingAlerts ? (
                        <div className="text-center py-4">
                            <Spinner animation="border" variant="primary" />
                        </div>
                    ) : alerts.length > 0 ? (
                        <Table hover responsive className="align-middle">
                            <thead>
                                <tr className="table-light">
                                    <th>Loại cảnh báo</th>
                                    <th>Nội dung</th>
                                    <th>Thời gian</th>
                                    <th>Trạng thái</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {alerts.map((a) => (
                                    <tr key={a.alert_id}>
                                        <td>
                                            <span className={`badge ${getAlertPriority(a.alert_type)}`}>
                                                {a.alert_type}
                                            </span>
                                        </td>
                                        <td>{a.message}</td>
                                        <td>{formatDate(a.timestamp)}</td>
                                        <td>
                                            {a.resolved ? (
                                                <span className="badge bg-success">Đã xử lý</span>
                                            ) : (
                                                <span className="badge bg-danger">Chưa xử lý</span>
                                            )}
                                        </td>
                                        <td>
                                            {!a.resolved ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline-success"
                                                    onClick={() => handleResolve(a.alert_id)}
                                                >
                                                    <i className="fas fa-check me-1"></i>Xử lý
                                                </Button>
                                            ) : (
                                                <i className="fas fa-check-circle text-success"></i>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    ) : (
                        <div className="text-center py-4">
                            <i className="fas fa-check-circle fa-2x text-success mb-2"></i>
                            <p className="text-muted mb-0">Không có cảnh báo nào.</p>
                        </div>
                    )
                }
            </Card >
        </div >
    )
}

export default DoctorHistoryPanel
