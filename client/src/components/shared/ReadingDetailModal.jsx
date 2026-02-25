"use client"

import { useEffect, useMemo, useState } from "react"
import { Modal, Button, Spinner, Alert } from "react-bootstrap"
import { toast } from "react-toastify"
import ECGChart from "../patient/ECGChart"
import { readingsApi } from "../../services/api"

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
            <div className="col-md-4">
              <div className="card border-0 bg-light h-100">
                <div className="card-body">
                  <p className="mb-2"><strong>Reading ID:</strong> {reading.reading_id}</p>
                  <p className="mb-2"><strong>Thời gian:</strong> {formatDate(reading.timestamp)}</p>
                  <p className="mb-2"><strong>Nhịp tim:</strong> {reading.heart_rate} BPM</p>
                  <p className="mb-2"><strong>Kết quả AI:</strong> {reading.ai_result || "-"}</p>
                  <p className="mb-2"><strong>Trạng thái:</strong> {reading.abnormal_detected ? "Bất thường" : "Bình thường"}</p>
                  <p className="mb-2"><strong>Serial:</strong> {reading.device?.serial_number || "-"}</p>
                  <p className="mb-1"><strong>Bệnh nhân:</strong> {reading.patient?.name || "-"}</p>
                  <small className="text-muted">{reading.patient?.email || ""}</small>
                </div>
              </div>
            </div>
            <div className="col-md-8">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <ECGChart data={ecgSignal} />
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