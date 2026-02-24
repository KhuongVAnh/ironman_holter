"use client"
import { useEffect, useState } from "react"
import { Table, Card, Button } from "react-bootstrap"
import { useAuth } from "../../contexts/AuthContext"
import { toast } from "react-toastify"
import { useNavigate } from "react-router-dom"
import { accessApi, familyApi } from "../../services/api"
import { ACCESS_STATUS } from "../../services/string"

const FamilyAccessRequests = () => {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [patients, setPatients] = useState([])
  const [respondingId, setRespondingId] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) return
    fetchPendingRequests()
    fetchAcceptedPatients()
  }, [user])

  const fetchPendingRequests = async () => {
    try {
      const res = await accessApi.getPending()
      setRequests(res.data)
    } catch (err) {
      console.error("Lỗi tải danh sách yêu cầu:", err)
      toast.error("Không thể tải danh sách yêu cầu")
    }
  }

  const fetchAcceptedPatients = async () => {
    try {
      const res = await familyApi.getPatients(user.user_id)
      setPatients(res.data)
    } catch (err) {
      console.error("Lỗi tải danh sách bệnh nhân:", err)
      toast.error("Không thể tải danh sách bệnh nhân")
    }
  }

  const handleRespond = async (permissionId, action) => {
    try {
      setRespondingId(permissionId)
      await accessApi.respond(permissionId, action)
      toast.success(action === "accept" ? "Đã chấp nhận yêu cầu" : "Đã từ chối yêu cầu")
      await fetchPendingRequests()
      await fetchAcceptedPatients()
    } catch (err) {
      console.error("Lỗi xử lý yêu cầu:", err)
      toast.error(err.response?.data?.error || err.response?.data?.message || "Không thể xử lý yêu cầu")
    } finally {
      setRespondingId(null)
    }
  }

  return (
    <div className="container mt-4">
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
              <th className="text-end">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center text-muted py-3">
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
                    <span className={`badge ${r.status === ACCESS_STATUS.PENDING ? "bg-warning" : "bg-success"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="text-end">
                    {r.status === ACCESS_STATUS.PENDING ? (
                      <div className="btn-group" role="group">
                        <Button
                          size="sm"
                          variant="outline-success"
                          disabled={respondingId === r.permission_id}
                          onClick={() => handleRespond(r.permission_id, "accept")}
                        >
                          <i className="fas fa-check me-1"></i> Đồng ý
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          disabled={respondingId === r.permission_id}
                          onClick={() => handleRespond(r.permission_id, "reject")}
                        >
                          <i className="fas fa-times me-1"></i> Từ chối
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>

      <Card className="shadow-sm border-0 p-4 mt-4">
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
