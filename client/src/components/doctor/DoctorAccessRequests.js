"use client"
import { useEffect, useState } from "react"
import { Table, Card, Button } from "react-bootstrap"
import { useAuth } from "../../contexts/AuthContext"
import axios from "axios"
import { toast } from "react-toastify"
import { useNavigate } from "react-router-dom"

const DoctorAccessRequests = () => {
    const { user } = useAuth()
    const [requests, setRequests] = useState([])
    const [patients, setPatients] = useState([])
    const navigate = useNavigate()

    useEffect(() => {
        if (!user) return
        fetchPendingRequests()
        fetchAcceptedPatients()
    }, [user])

    // --- API: lấy yêu cầu đang chờ ---
    const fetchPendingRequests = async () => {
        try {
            const res = await axios.get("http://localhost:4000/api/access/pending")
            setRequests(res.data)
        } catch (err) {
            console.error(err)
        }
    }

    // --- API: lấy danh sách bệnh nhân được cấp quyền ---
    const fetchAcceptedPatients = async () => {
        try {
            const res = await axios.get(`http://localhost:4000/api/doctor/patients/${user.user_id}`)
            setPatients(res.data)
        } catch (err) {
            console.error("❌ Lỗi tải danh sách bệnh nhân:", err)
            toast.error("Không thể tải danh sách bệnh nhân")
        }
    }

    return (
        <div className="container mt-4">
            {/* --- Bảng yêu cầu truy cập --- */}
            <Card className="shadow-sm border-0 p-4">
                <h4 className="text-primary mb-3">
                    <i className="fas fa-envelope-open me-2"></i>Yêu cầu truy cập bệnh nhân
                </h4>
                <Table hover responsive className="align-middle">
                    <thead className="table-light">
                        <tr>
                            <th>#</th>
                            <th>Bệnh nhân</th>
                            <th>Vai trò</th>
                            <th>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="text-center text-muted py-3">
                                    Không có yêu cầu nào đang chờ xử lý
                                </td>
                            </tr>
                        ) : (
                            requests.map((r, i) => (
                                <tr key={r.permission_id}>
                                    <td>{i + 1}</td>
                                    <td>{r.patient?.name}</td>
                                    <td>{r.role}</td>
                                    <td>
                                        <span className={`badge ${r.status === "pending" ? "bg-warning" : "bg-success"}`}>
                                            {r.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </Table>
            </Card>

            {/* --- Danh sách bệnh nhân --- */}
            <Card className="shadow-sm border-0 p-4 mt-4">
                <h4 className="text-success mb-3">
                    <i className="fas fa-users me-2"></i>Bệnh nhân đang được theo dõi
                </h4>
                <Table hover responsive className="align-middle">
                    <thead className="table-light">
                        <tr>
                            <th>#</th>
                            <th>Tên bệnh nhân</th>
                            <th>Email</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {patients.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="text-center text-muted py-3">
                                    Chưa có bệnh nhân nào được cấp quyền
                                </td>
                            </tr>
                        ) : (
                            patients.map((p, i) => (
                                <tr key={p.patient?.user_id}>
                                    <td>{i + 1}</td>
                                    <td>{p.patient?.name}</td>
                                    <td>{p.patient?.email}</td>
                                    <td className="text-end">
                                        <Button
                                            size="sm"
                                            variant="outline-primary"
                                            onClick={() => navigate(`/doctor/history/${p.patient.user_id}`)}
                                        >
                                            <i className="fas fa-folder-open me-1"></i> Xem hồ sơ
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </Table>
            </Card>
        </div>
    )
}

export default DoctorAccessRequests
