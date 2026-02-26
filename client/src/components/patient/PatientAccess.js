"use client"

import React, { useState, useEffect } from "react"
import { Card, Button, Form, Table, Badge } from "react-bootstrap"
import { toast } from "react-toastify"
import { useAuth } from "../../contexts/AuthContext"
import io from "socket.io-client"
import { API_BASE_URL } from "../../config/env"
import { accessApi } from "../../services/api"
import { ACCESS_ROLE, ACCESS_STATUS } from "../../services/string"

const socket = io(API_BASE_URL)

const PatientAccess = () => {
    const { user } = useAuth() // ⚡ chỉ cần user, token interceptor tự thêm rồi
    const [viewerEmail, setViewerEmail] = useState("")
    const [role, setRole] = useState(ACCESS_ROLE.BAC_SI)
    const [accessList, setAccessList] = useState([])

    // --- Khi mở trang ---
    useEffect(() => {
        if (!user) return

        socket.emit("join-user-room", user.user_id)
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
            const res = await accessApi.list(user.user_id)
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
            const res = await accessApi.share(viewerEmail, role)

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
            await accessApi.revoke(id)
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
                    <i className="fas fa-user-shield me-2"></i>Quản lý quyền truy cập vào bệnh sử của bạn
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
                                <option value={ACCESS_ROLE.BAC_SI}>Bác sĩ</option>
                                <option value={ACCESS_ROLE.GIA_DINH}>Gia đình</option>
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
                                                a.status === ACCESS_STATUS.ACCEPTED
                                                    ? "success"
                                                    : a.status === ACCESS_STATUS.PENDING
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
