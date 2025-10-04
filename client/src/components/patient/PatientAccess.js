"use client"

import React, { useState, useEffect } from "react"
import axios from "axios"
import { Card, Button, Form, Table, Badge } from "react-bootstrap"
import { toast } from "react-toastify"
import { useAuth } from "../../contexts/AuthContext"
import io from "socket.io-client"

const socket = io("http://localhost:4000")

const PatientAccess = () => {
    const { user } = useAuth() // ⚡ chỉ cần user, token interceptor tự thêm rồi
    const [viewerEmail, setViewerEmail] = useState("")
    const [role, setRole] = useState("bác sĩ")
    const [accessList, setAccessList] = useState([])

    // --- Khi mở trang ---
    useEffect(() => {
        if (!user) return

        fetchAccessList()

        // --- Socket realtime ---
        socket.on("access-response", (data) => {
            if (data.patient_id === user.user_id) {
                toast.info("🔔 Một yêu cầu truy cập đã được phản hồi!")
                fetchAccessList()
            }
        })

        socket.on("access-revoke", (data) => {
            if (data.patient_id === user.user_id) {
                toast.warning("⚠️ Một quyền truy cập đã bị thu hồi!")
                fetchAccessList()
            }
        })

        return () => {
            socket.off("access-response")
            socket.off("access-revoke")
        }
    }, [user])

    // --- API: Lấy danh sách quyền ---
    const fetchAccessList = async () => {
        try {
            const res = await axios.get(`http://localhost:4000/api/access/list/${user.user_id}`)
            setAccessList(res.data)
        } catch (error) {
            console.error("❌ Lỗi tải danh sách:", error)
            toast.error("Không thể tải danh sách quyền truy cập")
        }
    }

    // --- Gửi yêu cầu chia sẻ quyền ---
    const handleShareAccess = async (e) => {
        e.preventDefault()
        if (!user) {
            toast.error("⚠️ Bạn chưa đăng nhập")
            return
        }

        try {
            const res = await axios.post("http://localhost:4000/api/access/share", {
                viewer_email: viewerEmail,
                role,
            })

            toast.success(res.data?.message || "✅ Đã gửi yêu cầu chia sẻ quyền")
            setViewerEmail("")
            fetchAccessList()
        } catch (err) {
            console.error("❌ Lỗi chia sẻ quyền:", err)
            toast.error(err.response?.data?.error || "Lỗi khi gửi yêu cầu")
        }
    }

    // --- Thu hồi quyền ---
    const handleRevoke = async (id) => {
        if (!window.confirm("Bạn có chắc muốn thu hồi quyền này?")) return
        try {
            await axios.delete(`http://localhost:4000/api/access/${id}`)
            toast.warning("❌ Đã thu hồi quyền truy cập")
            fetchAccessList()
        } catch (err) {
            console.error("❌ Lỗi thu hồi quyền:", err)
            toast.error("Lỗi khi thu hồi quyền")
        }
    }

    return (
        <div className="container mt-4">
            <Card className="shadow-sm border-0 p-4 animate__animated animate__fadeIn">
                <h4 className="text-primary mb-3">
                    <i className="fas fa-user-shield me-2"></i>Quản lý quyền truy cập
                </h4>

                {/* --- Form chia sẻ quyền --- */}
                <Form onSubmit={handleShareAccess} className="mb-4">
                    <div className="row g-3 align-items-end">
                        <div className="col-md-5">
                            <Form.Label>Email người được cấp quyền</Form.Label>
                            <Form.Control
                                type="email"
                                placeholder="Nhập email..."
                                value={viewerEmail}
                                onChange={(e) => setViewerEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="col-md-3">
                            <Form.Label>Vai trò</Form.Label>
                            <Form.Select value={role} onChange={(e) => setRole(e.target.value)}>
                                <option value="bác sĩ">Bác sĩ</option>
                                <option value="gia đình">Gia đình</option>
                            </Form.Select>
                        </div>

                        <div className="col-md-3">
                            <Button type="submit" variant="primary" className="w-100">
                                <i className="fas fa-share-alt me-2"></i>Gửi yêu cầu
                            </Button>
                        </div>
                    </div>
                </Form>

                {/* --- Danh sách quyền --- */}
                <h5 className="mb-3 text-secondary">
                    <i className="fas fa-users me-2"></i>Danh sách người được cấp quyền
                </h5>

                <Table hover responsive className="align-middle">
                    <thead className="table-light">
                        <tr>
                            <th>#</th>
                            <th>Tên</th>
                            <th>Email</th>
                            <th>Vai trò</th>
                            <th>Trạng thái</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {accessList.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="text-center text-muted py-3">
                                    Chưa có ai được cấp quyền
                                </td>
                            </tr>
                        ) : (
                            accessList.map((a, i) => (
                                <tr key={a.permission_id}>
                                    <td>{i + 1}</td>
                                    <td>{a.viewer?.name}</td>
                                    <td>{a.viewer?.email}</td>
                                    <td>{a.role}</td>
                                    <td>
                                        <Badge
                                            bg={
                                                a.status === "accepted"
                                                    ? "success"
                                                    : a.status === "pending"
                                                        ? "warning"
                                                        : "danger"
                                            }
                                        >
                                            {a.status}
                                        </Badge>
                                    </td>
                                    <td className="text-end">
                                        <Button
                                            size="sm"
                                            variant="outline-danger"
                                            onClick={() => handleRevoke(a.permission_id)}
                                        >
                                            <i className="fas fa-user-slash"></i> Thu hồi
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

export default PatientAccess
