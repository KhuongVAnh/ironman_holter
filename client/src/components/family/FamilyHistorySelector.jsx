"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card, Table, Button } from "react-bootstrap"
import { toast } from "react-toastify"
import { useAuth } from "../../contexts/AuthContext"
import { familyApi } from "../../services/api"

const FamilyHistorySelector = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.user_id) {
      fetchPatients()
    }
  }, [user?.user_id])

  const fetchPatients = async () => {
    try {
      setLoading(true)
      const res = await familyApi.getPatients(user.user_id)
      setPatients(res.data || [])
    } catch (err) {
      console.error("Lỗi tải danh sách bệnh nhân:", err)
      toast.error("Không thể tải danh sách bệnh nhân")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container py-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mt-4">
      <Card className="shadow-sm border-0 p-4">
        <h4 className="text-primary mb-3">
          <i className="fas fa-heartbeat me-2"></i>
          Bệnh sử người thân
        </h4>

        <Table hover responsive className="align-middle">
          <thead className="table-light">
            <tr>
              <th>#</th>
              <th>Tên bệnh nhân</th>
              <th>Email</th>
              <th className="text-end">Thao tác</th>
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
              patients.map((item, index) => (
                <tr key={item.permission_id || item.patient?.user_id}>
                  <td>{index + 1}</td>
                  <td>{item.patient?.name}</td>
                  <td>{item.patient?.email}</td>
                  <td className="text-end">
                    <Button
                      size="sm"
                      variant="outline-primary"
                      onClick={() => navigate(`/family/history/${item.patient.user_id}`)}
                    >
                      <i className="fas fa-folder-open me-1"></i>
                      Xem bệnh sử
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

export default FamilyHistorySelector
