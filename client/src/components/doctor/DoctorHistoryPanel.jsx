"use client"

import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { Card, Button, Spinner } from "react-bootstrap"
import { toast } from "react-toastify"
import { useAuth } from "../../contexts/AuthContext"
import MedicalHistoryList from "../shared/MedicalHistoryList"
import MedicalHistoryForm from "../shared/MedicalHistoryForm"
import ReadingDetailModal from "../shared/ReadingDetailModal"
import { alertsApi, historyApi } from "../../services/api"
import { ALERT_TYPE, ROLE } from "../../services/string"

const DoctorHistoryPanel = () => {
  const { patientId } = useParams()
  const { user } = useAuth()
  const [histories, setHistories] = useState([])
  const [alerts, setAlerts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [loadingAlerts, setLoadingAlerts] = useState(true)
  const [editData, setEditData] = useState(null)
  const [selectedReadingId, setSelectedReadingId] = useState(null)

  const fetchHistory = async () => {
    try {
      const res = await historyApi.getDoctorHistory(patientId)
      setHistories(res.data)
    } catch (err) {
      console.error(err)
      toast.error("Không thể tải bệnh sử")
    }
  }

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

  const handleUpdate = async (data) => {
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

  const handleOpenReadingDetail = (alert) => {
    if (!alert?.reading_id) {
      toast.warning("Cảnh báo này không có reading để xem")
      return
    }
    setSelectedReadingId(alert.reading_id)
  }

  const handleAlertKeyDown = (event, alert) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handleOpenReadingDetail(alert)
    }
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
              setEditData(null)
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
            setEditData(record)
            setShowForm(true)
          }}
          onDelete={handleDelete}
          role={ROLE.BAC_SI}
        />

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
      </Card>

      <Card className="shadow-sm border-0 p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="mb-0">
            <i className="fas fa-bell text-danger me-2"></i>Cảnh báo bệnh nhân
          </h4>
          <Button variant="outline-primary" size="sm" onClick={fetchAlerts}>
            <i className="fas fa-sync-alt me-1"></i>Làm mới
          </Button>
        </div>

        {loadingAlerts ? (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" />
          </div>
        ) : alerts.length > 0 ? (
          <div className="d-flex flex-column gap-3">
            {alerts.map((alert) => {
              const isDisabled = !alert.reading_id
              const cardStatusClass = alert.resolved ? "border-success" : "border-danger"

              return (
                <div
                  key={alert.alert_id}
                  className={`card border-start border-4 ${cardStatusClass} alert-clickable-surface ${isDisabled ? "is-disabled" : ""}`}
                  role="button"
                  tabIndex={isDisabled ? -1 : 0}
                  onClick={() => handleOpenReadingDetail(alert)}
                  onKeyDown={(event) => handleAlertKeyDown(event, alert)}
                >
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start gap-3">
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <span className={`badge ${getAlertPriority(alert.alert_type)}`}>{alert.alert_type}</span>
                          {alert.resolved ? (
                            <span className="badge bg-success">Đã xử lý</span>
                          ) : (
                            <span className="badge bg-danger">Chưa xử lý</span>
                          )}
                        </div>
                        <p className="mb-2 text-muted">{alert.message}</p>
                        <small className="text-muted">{formatDate(alert.timestamp)}</small>
                      </div>

                      <div className="d-flex align-items-center gap-2">
                        {isDisabled && <span className="badge bg-secondary">Không có reading</span>}

                        {!alert.resolved ? (
                          <Button
                            size="sm"
                            variant="outline-success"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleResolve(alert.alert_id)
                            }}
                          >
                            <i className="fas fa-check me-1"></i>Xử lý
                          </Button>
                        ) : (
                          <i className="fas fa-check-circle text-success"></i>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-4">
            <i className="fas fa-check-circle fa-2x text-success mb-2"></i>
            <p className="text-muted mb-0">Không có cảnh báo nào.</p>
          </div>
        )}
      </Card>

      <ReadingDetailModal
        show={Boolean(selectedReadingId)}
        readingId={selectedReadingId}
        onHide={() => setSelectedReadingId(null)}
      />
    </div>
  )
}

export default DoctorHistoryPanel