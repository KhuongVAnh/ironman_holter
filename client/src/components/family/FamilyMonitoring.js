"use client"

import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import { useAuth } from "../../contexts/AuthContext"
import ECGChart from "../patient/ECGChart"
import RecentAlertsPanel, { getAlertTypeLabel } from "../shared/RecentAlertsPanel"
import ReadingDetailModal from "../shared/ReadingDetailModal"
import { alertsApi, familyApi, readingsApi } from "../../services/api"

const FamilyMonitoring = () => {
  const { user } = useAuth()
  const [familyMembers, setFamilyMembers] = useState([])
  const [selectedMember, setSelectedMember] = useState(null)
  const [memberReadings, setMemberReadings] = useState([])
  const [memberAlerts, setMemberAlerts] = useState([])
  const [selectedReadingId, setSelectedReadingId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.user_id) {
      fetchFamilyMembers()
    }
  }, [user?.user_id])

  useEffect(() => {
    if (selectedMember?.user_id) {
      fetchMemberData(selectedMember.user_id)
    }
  }, [selectedMember?.user_id])

  const fetchFamilyMembers = async () => {
    try {
      setLoading(true)
      const response = await familyApi.getPatients(user.user_id)

      const patients = (response.data || []).map((item) => ({
        user_id: item.patient?.user_id,
        name: item.patient?.name || "Không rõ",
        email: item.patient?.email || "-",
        is_active: item.status === "accepted",
      }))

      setFamilyMembers(patients)

      if (patients.length > 0) {
        setSelectedMember(patients[0])
      } else {
        setSelectedMember(null)
        setMemberReadings([])
        setMemberAlerts([])
      }
    } catch (error) {
      console.error("Lỗi lấy danh sách người thân:", error)
      toast.error("Không thể tải danh sách người thân")
    } finally {
      setLoading(false)
    }
  }

  const fetchMemberData = async (memberId) => {
    try {
      if (!memberId) return

      const readingsResponse = await readingsApi.getHistory(memberId, { limit: 10 })
      setMemberReadings(readingsResponse.data?.readings || [])

      const alertsResponse = await alertsApi.getByUser(memberId)
      setMemberAlerts((alertsResponse.data?.alerts || []).slice(0, 5))
      setSelectedReadingId(null)
    } catch (error) {
      console.error("Lỗi lấy dữ liệu người thân:", error)
      toast.error("Không thể tải dữ liệu người thân")
    }
  }

  const formatDate = (dateString) => new Date(dateString).toLocaleString("vi-VN")

  const latestReading = memberReadings.length > 0 ? memberReadings[0] : null

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
    <div className="container py-4">
      <div className="row">
        <div className="col-12">
          <h1 className="h3 mb-4">
            <i className="fas fa-heart me-2 text-danger"></i>
            Theo dõi người thân
          </h1>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0">
              <h5 className="card-title mb-0">
                <i className="fas fa-users me-2 text-primary"></i>
                Danh sách người thân
              </h5>
            </div>
            <div className="card-body p-0">
              {familyMembers.length > 0 ? (
                <div className="list-group list-group-flush">
                  {familyMembers.map((member) => (
                    <button
                      key={member.user_id}
                      className={`list-group-item list-group-item-action ${
                        selectedMember?.user_id === member.user_id ? "active" : ""
                      }`}
                      onClick={() => setSelectedMember(member)}
                    >
                      <div className="d-flex align-items-center">
                        <div className="avatar-circle bg-primary text-white me-3">{member.name.charAt(0).toUpperCase()}</div>
                        <div>
                          <h6 className="mb-1">{member.name}</h6>
                          <small className={selectedMember?.user_id === member.user_id ? "text-white-50" : "text-muted"}>
                            {member.is_active ? "Hoạt động" : "Ngưng"}
                          </small>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted">Chưa có người thân nào</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4">
            <RecentAlertsPanel
              title="Cảnh báo gần nhất"
              subtitle="Theo dõi cảnh báo mới nhất của người thân được chọn."
              alerts={memberAlerts}
              onAlertClick={(alert) => setSelectedReadingId(alert?.reading_id || null)}
              isAlertDisabled={(alert) => !alert?.reading_id}
              getAlertTitle={(alert) => getAlertTypeLabel(alert.alert_type)}
              getAlertStatus={(alert) =>
                alert?.resolved
                  ? { label: "Đã xử lý", variant: "is-resolved" }
                  : { label: "Mới", variant: "is-pending" }
              }
              getAlertTimestamp={(alert) => alert.timestamp}
              formatDate={formatDate}
              getAlertHint={(_alert, disabled, canClick) => {
                if (disabled) return "Không có reading"
                if (canClick) return "Nhấn để xem đồ thị ECG"
                return ""
              }}
              emptyText="Không có cảnh báo"
            />
          </div>
        </div>

        <div className="col-md-8">
          {selectedMember ? (
            <>
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                  <div className="row align-items-center">
                    <div className="col-md-8">
                      <div className="d-flex align-items-center">
                        <div className="avatar-circle bg-primary text-white me-3" style={{ width: "60px", height: "60px" }}>
                          <span className="fs-4">{selectedMember.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <h3 className="h4 mb-1">{selectedMember.name}</h3>
                          <p className="text-muted mb-1">{selectedMember.email}</p>
                          <span className={`badge ${selectedMember.is_active ? "bg-success" : "bg-secondary"}`}>
                            {selectedMember.is_active ? "Đang hoạt động" : "Ngưng hoạt động"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4 text-end">
                      {latestReading && (
                        <div>
                          <h2 className="text-primary mb-0">{latestReading.heart_rate} BPM</h2>
                          <small className="text-muted">Nhịp tim gần nhất</small>
                          <div className="mt-1">
                            {latestReading.abnormal_detected ? (
                              <span className="badge bg-danger">Bất thường</span>
                            ) : (
                              <span className="badge bg-success">Bình thường</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="row g-4">
                <div className="col-12">
                  <div className="card border-0 shadow-sm">
                    <div className="card-header bg-white border-0">
                      <h5 className="card-title mb-0">
                        <i className="fas fa-chart-line me-2 text-success"></i>
                        Biểu đồ ECG gần nhất
                      </h5>
                    </div>
                    <div className="card-body">
                      {latestReading ? (
                        <ECGChart data={latestReading.ecg_signal || []} />
                      ) : (
                        <div className="text-center py-4">
                          <i className="fas fa-chart-line fa-3x text-muted mb-3"></i>
                          <p className="text-muted">Chưa có dữ liệu ECG</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="row mt-4">
                <div className="col-12">
                  <div className="card border-0 shadow-sm">
                    <div className="card-header bg-white border-0">
                      <h5 className="card-title mb-0">
                        <i className="fas fa-history me-2 text-info"></i>
                        Lịch sử đo gần đây
                      </h5>
                    </div>
                    <div className="card-body">
                      {memberReadings.length > 0 ? (
                        <div className="table-responsive">
                          <table className="table table-hover">
                            <thead className="table-light">
                              <tr>
                                <th>Thời gian</th>
                                <th>Nhịp tim</th>
                                <th>Trạng thái</th>
                              </tr>
                            </thead>
                            <tbody>
                              {memberReadings.map((reading) => (
                                <tr key={reading.reading_id}>
                                  <td>{formatDate(reading.timestamp)}</td>
                                  <td>
                                    <span
                                      className={`fw-bold ${
                                        reading.heart_rate < 60
                                          ? "text-warning"
                                          : reading.heart_rate > 100
                                          ? "text-danger"
                                          : "text-success"
                                      }`}
                                    >
                                      {reading.heart_rate} BPM
                                    </span>
                                  </td>
                                  <td>
                                    {reading.abnormal_detected ? (
                                      <span className="badge bg-danger">Bất thường</span>
                                    ) : (
                                      <span className="badge bg-success">Bình thường</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <i className="fas fa-heartbeat fa-3x text-muted mb-3"></i>
                          <p className="text-muted">Chưa có dữ liệu đo</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center py-5">
                <i className="fas fa-user-friends fa-3x text-muted mb-3"></i>
                <h5 className="text-muted">Chọn người thân để theo dõi</h5>
                <p className="text-muted">Hãy chọn một người thân từ danh sách bên trái để xem thông tin chi tiết.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ReadingDetailModal
        show={Boolean(selectedReadingId)}
        onHide={() => setSelectedReadingId(null)}
        readingId={selectedReadingId}
      />
    </div>
  )
}

export default FamilyMonitoring
