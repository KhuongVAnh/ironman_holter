"use client"

import { useEffect, useMemo, useState } from "react"
import { Modal, Button, Spinner, Alert } from "react-bootstrap"
import { toast } from "react-toastify"
import ECGChart from "../patient/ECGChart"
import { readingsApi } from "../../services/api"
import {
  formatAiResultForDisplay,
  isAbnormalAiResultText,
  getAiColorByCode,
  getAiLabelFromCode,
  resolveAiCodeFromLabel,
} from "../../strings/ecgAiStrings"

const normalizeEcgSignal = (signal) => {
  if (Array.isArray(signal)) return signal
  if (typeof signal === "string") {
    try {
      const parsed = JSON.parse(signal)
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      return []
    }
  }
  return []
}

const normalizeHighlightSegments = (alerts = [], signalLength = 0) => {
  if (!Array.isArray(alerts)) return []

  return alerts
    .map((alert) => {
      const start = Number.parseInt(alert?.segment_start_sample, 10)
      const end = Number.parseInt(alert?.segment_end_sample, 10)
      if (!Number.isInteger(start) || !Number.isInteger(end) || end <= start) return null

      const safeStart = Math.max(0, start)
      const safeEnd = signalLength > 0 ? Math.min(signalLength - 1, end) : end
      if (safeEnd <= safeStart) return null

      const labelCode = String(
        alert?.label_code || resolveAiCodeFromLabel(alert?.label_text || alert?.alert_type || "")
      )
        .trim()
        .toUpperCase()

      return {
        alert_id: alert?.alert_id || null,
        alert_type: alert?.alert_type || "",
        start_sample: safeStart,
        end_sample: safeEnd,
        label_code: labelCode || "Q",
        label_text: alert?.label_text || getAiLabelFromCode(labelCode || "Q"),
      }
    })
    .filter(Boolean)
}

const ReadingDetailModal = ({ show, onHide, readingId }) => {
  const [loading, setLoading] = useState(false)
  const [reading, setReading] = useState(null)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    if (!show) {
      setLoading(false)
      setReading(null)
      setErrorMessage("")
      return
    }

    if (!readingId) {
      setReading(null)
      setErrorMessage("Không có reading để hiển thị")
      return
    }

    const fetchDetail = async () => {
      try {
        setLoading(true)
        setReading(null)
        setErrorMessage("")

        const response = await readingsApi.getDetail(readingId)
        setReading(response.data?.reading || null)
      } catch (error) {
        console.error("Lỗi tải chi tiết reading:", error)
        const message = error.response?.data?.message || "Không thể tải chi tiết reading"
        setErrorMessage(message)
        toast.error(message)
      } finally {
        setLoading(false)
      }
    }

    fetchDetail()
  }, [show, readingId])

  const ecgSignal = useMemo(() => normalizeEcgSignal(reading?.ecg_signal), [reading?.ecg_signal])
  const aiResultDisplay = useMemo(
    () => formatAiResultForDisplay(reading?.ai_result),
    [reading?.ai_result]
  )
  const aiAbnormal = useMemo(
    () => isAbnormalAiResultText(reading?.ai_result, reading?.abnormal_detected),
    [reading?.ai_result, reading?.abnormal_detected]
  )
  const highlightSegments = useMemo(
    () => normalizeHighlightSegments(reading?.alerts, ecgSignal.length),
    [reading?.alerts, ecgSignal.length]
  )
  const highlightLegend = useMemo(() => {
    const countByCode = new Map()
    highlightSegments.forEach((segment) => {
      const code = segment.label_code || "Q"
      countByCode.set(code, (countByCode.get(code) || 0) + 1)
    })

    return Array.from(countByCode.entries()).map(([code, count]) => ({
      code,
      label: getAiLabelFromCode(code),
      color: getAiColorByCode(code),
      count,
    }))
  }, [highlightSegments])

  const formatDate = (value) => {
    if (!value) return "-"
    return new Date(value).toLocaleString("vi-VN")
  }

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>Chi tiết reading ECG</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" />
          </div>
        ) : errorMessage ? (
          <Alert variant="danger" className="mb-0">
            {errorMessage}
          </Alert>
        ) : reading ? (
          <div className="row g-3">
            <div className="col-md-3">
              <div className="card border-0 bg-light h-100">
                <div className="card-body">
                  <p className="mb-2"><strong>Reading ID:</strong> {reading.reading_id}</p>
                  <p className="mb-2"><strong>Thời gian:</strong> {formatDate(reading.timestamp)}</p>
                  <p className="mb-2"><strong>Nhịp tim:</strong> {reading.heart_rate} BPM</p>
                  <p className="mb-2"><strong>Kết quả AI:</strong> {aiResultDisplay}</p>
                  <p className="mb-2"><strong>Trạng thái:</strong> {aiAbnormal ? "Bất thường" : "Bình thường"}</p>
                  <p className="mb-2"><strong>Serial:</strong> {reading.device?.serial_number || "-"}</p>
                  <p className="mb-1"><strong>Bệnh nhân:</strong> {reading.patient?.name || "-"}</p>
                  <small className="text-muted">{reading.patient?.email || ""}</small>
                </div>
              </div>
            </div>
            <div className="col-md-9">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-lg-9">
                      <ECGChart data={ecgSignal} highlights={highlightSegments} />
                    </div>
                    <div className="col-lg-3">
                      <div className="border rounded p-2 h-100">
                        <h6 className="mb-2">Chú thích bất thường</h6>
                        {highlightLegend.length > 0 ? (
                          <div className="d-flex flex-column gap-2">
                            {highlightLegend.map((item) => (
                              <div key={item.code} className="d-flex align-items-center justify-content-between gap-2">
                                <div className="d-flex align-items-center gap-2">
                                  <span
                                    style={{
                                      display: "inline-block",
                                      width: 12,
                                      height: 12,
                                      borderRadius: 2,
                                      backgroundColor: item.color,
                                    }}
                                  />
                                  <small>{item.label}</small>
                                </div>
                                <small className="text-muted">{item.count}</small>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <small className="text-muted">Không có segment bất thường</small>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted py-4">Không tìm thấy dữ liệu reading</div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Đóng
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default ReadingDetailModal
