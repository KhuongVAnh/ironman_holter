import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import { useAuth } from "../../contexts/AuthContext"
import { readingsApi } from "../../services/api"
import { formatAiResultForDisplay, isAbnormalAiResultText } from "../../strings/ecgAiStrings"
import PaginationBar from "../shared/PaginationBar"
import ReadingDetailModal from "../shared/ReadingDetailModal"

const ITEMS_PER_PAGE = 20

const normalizeAiStatus = (value) => {
  const normalized = String(value || "").trim().toUpperCase()
  if (normalized === "DONE" || normalized === "FAILED" || normalized === "PENDING") {
    return normalized
  }
  return "PENDING"
}

const isReadingAbnormal = (reading) =>
  normalizeAiStatus(reading?.ai_status) === "DONE" &&
  isAbnormalAiResultText(reading?.ai_result, reading?.abnormal_detected)

const getAiStatusBadge = (reading) => {
  const status = normalizeAiStatus(reading?.ai_status)

  if (status === "PENDING") {
    return {
      label: "Đang phân tích",
      className: "bg-amber-100 text-amber-700",
    }
  }

  if (status === "FAILED") {
    return {
      label: "Phân tích thất bại",
      className: "bg-red-100 text-red-700",
    }
  }

  const abnormal = isReadingAbnormal(reading)
  return {
    label: formatAiResultForDisplay(reading?.ai_result),
    className: abnormal ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700",
  }
}

const PatientHistory = () => {
  const { user } = useAuth()
  const [readings, setReadings] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalReadings, setTotalReadings] = useState(0)
  const [selectedReadingId, setSelectedReadingId] = useState(null)

  useEffect(() => {
    fetchReadings()
  }, [currentPage])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  useEffect(() => {
    const handleReadingAiUpdated = (event) => {
      const payload = event.detail || {}
      const updatedReadingId = Number.parseInt(payload?.reading_id, 10)

      if (!Number.isInteger(updatedReadingId)) return

      setReadings((currentReadings) =>
        currentReadings.map((reading) => {
          if (reading.reading_id !== updatedReadingId) return reading

          return {
            ...reading,
            ai_status: payload.ai_status || reading.ai_status,
            ai_result: payload.ai_result !== undefined ? payload.ai_result : reading.ai_result,
            abnormal_detected:
              payload.abnormal_detected !== undefined
                ? Boolean(payload.abnormal_detected)
                : reading.abnormal_detected,
            ai_error: payload.ai_error !== undefined ? payload.ai_error : reading.ai_error,
            ai_completed_at: payload.timestamp || reading.ai_completed_at,
          }
        })
      )
    }

    window.addEventListener("readingAiUpdated", handleReadingAiUpdated)
    return () => window.removeEventListener("readingAiUpdated", handleReadingAiUpdated)
  }, [])

  const fetchReadings = async () => {
    try {
      setLoading(true)
      const offset = (currentPage - 1) * ITEMS_PER_PAGE
      const response = await readingsApi.getHistory(user.user_id, { limit: ITEMS_PER_PAGE, offset })
      const list = response.data?.readings || []
      const total = response.data?.total ?? list.length
      setReadings(list)
      setTotalReadings(total)
      setTotalPages(Math.max(1, Math.ceil(total / ITEMS_PER_PAGE)))
    } catch (error) {
      console.error("Lỗi lấy lịch sử:", error)
      toast.error("Không thể tải lịch sử dữ liệu")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => new Date(dateString).toLocaleString("vi-VN")

  const heartRateTone = (heartRate) => {
    if (heartRate < 60) return "text-amber-600"
    if (heartRate > 100) return "text-red-600"
    return "text-emerald-600"
  }

  const visibleStart = totalReadings === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1
  const visibleEnd = totalReadings === 0 ? 0 : Math.min(currentPage * ITEMS_PER_PAGE, totalReadings)

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="panel-eyebrow">Patient data</p>
            <h1 className="page-hero-title">Lịch sử theo dõi</h1>
            <p className="page-hero-subtitle">Tra cứu các phiên đo trước đây, kiểm tra nhịp tim trung bình và mở nhanh bản ghi ECG chi tiết khi cần.</p>
          </div>
          <button className="btn btn-outline-primary" onClick={fetchReadings}>
            <i className="fas fa-rotate"></i>
            Làm mới dữ liệu
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="priority-metric metric-info"><p className="metric-label">Số bản ghi trang này</p><p className="metric-value">{readings.length}</p><p className="metric-helper">Dữ liệu ECG đã đồng bộ</p></div>
        <div className="priority-metric metric-brand"><p className="metric-label">Trang hiện tại</p><p className="metric-value">{currentPage}/{totalPages}</p><p className="metric-helper">Điều hướng lịch sử đo</p></div>
        <div className="priority-metric metric-danger"><p className="metric-label">Bản ghi bất thường</p><p className="metric-value">{readings.filter((item) => isReadingAbnormal(item)).length}</p><p className="metric-helper">Cần ưu tiên kiểm tra</p></div>
      </section>

      <section className="clinical-panel">
        <div className="clinical-panel-header">
          <div>
            <h2 className="section-title">Danh sách bản ghi</h2>
            <p className="section-subtitle">Mỗi hàng tương ứng một lần đo đã lưu trên hệ thống.</p>
          </div>
        </div>
        <div className="clinical-panel-body">
          {loading ? (
            <div className="flex justify-center py-14"><div className="spinner-border" role="status" /></div>
          ) : readings.length === 0 ? (
            <div className="py-16 text-center">
              <i className="fas fa-chart-line fa-3x text-slate-300"></i>
              <h3 className="mt-5 text-xl font-bold text-ink-700">Chưa có dữ liệu theo dõi</h3>
              <p className="mt-2 text-sm text-ink-500">Dữ liệu sẽ xuất hiện khi thiết bị Holter bắt đầu ghi nhận và đồng bộ thành công.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-surface-line text-sm">
                  <thead>
                    <tr className="text-left text-xs font-bold uppercase text-ink-500">
                      <th className="pb-4 pr-4">Thời gian</th>
                      <th className="pb-4 pr-4">Nhịp tim</th>
                      <th className="pb-4 pr-4">Đánh giá AI</th>
                      <th className="pb-4 pr-4">Thiết bị</th>
                      <th className="pb-4 text-right">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-line">
                    {readings.map((reading) => {
                      const aiBadge = getAiStatusBadge(reading)
                      return (
                        <tr key={reading.reading_id} className="hover:bg-brand-50/60">
                          <td className="py-4 pr-4 text-ink-700">{formatDate(reading.timestamp)}</td>
                          <td className={`py-4 pr-4 text-lg font-bold ${heartRateTone(reading.heart_rate)}`}>{reading.heart_rate} BPM</td>
                          <td className="py-4 pr-4">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${aiBadge.className}`}>{aiBadge.label}</span>
                          </td>
                          <td className="py-4 pr-4 text-ink-600">{reading.device?.serial_number || reading.Device?.serial_number || "Không rõ serial"}</td>
                          <td className="py-4 text-right">
                            <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setSelectedReadingId(reading.reading_id)}>
                              <i className="fas fa-wave-square"></i>
                              Xem ECG
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <PaginationBar
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                summaryText={
                  totalReadings > 0
                    ? `Hiển thị ${visibleStart}-${visibleEnd} / ${totalReadings} bản ghi`
                    : "Chưa có bản ghi để phân trang"
                }
                className="mt-6"
              />
            </>
          )}
        </div>
      </section>

      <ReadingDetailModal show={Boolean(selectedReadingId)} readingId={selectedReadingId} onHide={() => setSelectedReadingId(null)} />
    </div>
  )
}

export default PatientHistory
