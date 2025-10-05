"use client"
import { useEffect, useState } from "react"
import { Table, Card, Button } from "react-bootstrap"
import { useAuth } from "../../contexts/AuthContext"
import axios from "axios"
import { toast } from "react-toastify"
import { useNavigate } from "react-router-dom"

const FamilyAccessRequests = () => {
    const { user } = useAuth()
    const [patients, setPatients] = useState([])
    const navigate = useNavigate()

    useEffect(() => {
        if (!user) return
        fetchAcceptedPatients()
    }, [user])

    const fetchAcceptedPatients = async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/family/patients/${user.user_id}`)
            setPatients(res.data)
        } catch (err) {
            console.error("❌ Lỗi tải danh sách bệnh nhân:", err)
            toast.error("Không thể tải danh sách bệnh nhân")
        }
    }

    return (
        <div className="container mt-4">
            <Card className="shadow-sm border-0 p-4">
                <h4 className="text-success mb-3">
                    <i className="fas fa-users me-2"></i>Bệnh nhân được theo dõi
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
                                            onClick={() => navigate(`/family/history/${p.patient.user_id}`)}
                                        >
                                            <i className="fas fa-folder-open me-1"></i>Xem hồ sơ
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

export default FamilyAccessRequests
