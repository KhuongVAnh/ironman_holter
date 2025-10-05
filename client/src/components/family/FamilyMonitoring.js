"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import ECGChart from "../patient/ECGChart"

const FamilyMonitoring = () => {
  const [familyMembers, setFamilyMembers] = useState([])
  const [selectedMember, setSelectedMember] = useState(null)
  const [memberReadings, setMemberReadings] = useState([])
  const [memberAlerts, setMemberAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFamilyMembers()
  }, [])

  useEffect(() => {
    if (selectedMember) {
      fetchMemberData(selectedMember.user_id)
    }
  }, [selectedMember])

  const fetchFamilyMembers = async () => {
    try {
      setLoading(true)
      // For demo purposes, get all patients as potential family members
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/users`)
      const patients = response.data.users.filter((u) => u.role === "bệnh nhân")
      setFamilyMembers(patients)
      if (patients.length > 0) {
        setSelectedMember(patients[0])
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
      // Fetch readings
      const readingsResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/readings/history/${memberId}?limit=10`)
      setMemberReadings(readingsResponse.data.readings)

      // Fetch alerts
      const alertsResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/alerts/${memberId}`)
      setMemberAlerts(alertsResponse.data.alerts.slice(0, 5))
    } catch (error) {
      console.error("Lỗi lấy dữ liệu người thân:", error)
      toast.error("Không thể tải dữ liệu người thân")
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("vi-VN")
  }

  const getLatestReading = () => {
    return memberReadings.length > 0 ? memberReadings[0] : null
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

  const latestReading = getLatestReading()

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
        {/* Family Members List */}
        <div className="col-md-3">
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
                      className={`list-group-item list-group-item-action ${selectedMember?.user_id === member.user_id ? "active" : ""
                        }`}
                      onClick={() => setSelectedMember(member)}
                    >
                      <div className="d-flex align-items-center">
                        <div className="avatar-circle bg-primary text-white me-3">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h6 className="mb-1">{member.name}</h6>
                          <small
                            className={selectedMember?.user_id === member.user_id ? "text-white-50" : "text-muted"}
                          >
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
        </div>

        {/* Member Details */}
        <div className="col-md-9">
          {selectedMember ? (
            <>
              {/* Member Info */}
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                  <div className="row align-items-center">
                    <div className="col-md-8">
                      <div className="d-flex align-items-center">
                        <div
                          className="avatar-circle bg-primary text-white me-3"
                          style={{ width: "60px", height: "60px" }}
                        >
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
                {/* ECG Chart */}
                <div className="col-md-8">
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

                {/* Alerts */}
                <div className="col-md-4">
                  <div className="card border-0 shadow-sm">
                    <div className="card-header bg-white border-0">
                      <h5 className="card-title mb-0">
                        <i className="fas fa-exclamation-triangle me-2 text-warning"></i>
                        Cảnh báo gần nhất
                      </h5>
                    </div>
                    <div className="card-body">
                      {memberAlerts.length > 0 ? (
                        <div className="list-group list-group-flush">
                          {memberAlerts.map((alert) => (
                            <div key={alert.alert_id} className="list-group-item px-0 border-0">
                              <div className="d-flex justify-content-between align-items-start">
                                <div>
                                  <h6 className="mb-1 text-danger">{alert.alert_type}</h6>
                                  <p className="mb-1 text-muted small">{alert.message}</p>
                                  <small className="text-muted">{formatDate(alert.timestamp)}</small>
                                </div>
                                {!alert.resolved && <span className="badge bg-danger">Mới</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <i className="fas fa-check-circle fa-3x text-success mb-3"></i>
                          <p className="text-muted">Không có cảnh báo</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Readings */}
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
                                      className={`fw-bold ${reading.heart_rate < 60
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
    </div>
  )
}

export default FamilyMonitoring
