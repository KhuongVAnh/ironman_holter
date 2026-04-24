import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import { useAuth } from "../../contexts/AuthContext"
import { readingsApi } from "../../services/api"
import { formatAiResultForDisplay, isAbnormalAiResultText } from "../../strings/ecgAiStrings"
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
      label: "Dang phan tich",
      className: "bg-amber-100 text-amber-700",
    }
  }

  if (status === "FAILED") {
    return {
      label: "Phan tich that bai",
      className: "bg-rose-100 text-rose-700",
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
  const [selectedReadingId, setSelectedReadingId] = useState(null)

  useEffect(() => {
    fetchReadings()
  }, [currentPage])

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

  const pageWindow = Array.from({ length: totalPages }, (_, index) => index + 1).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-ink-600">Patient data</p>
          <h1 className="mt-2 text-2xl font-bold text-ink-900">Lịch sử theo dõi</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-600">Tra cứu các phiên đo trước đây, kiểm tra nhịp tim trung bình và mở nhanh bản ghi ECG chi tiết khi cần.</p>
        </div>
        <button className="btn btn-outline-primary" onClick={fetchReadings}>
          <i className="fas fa-rotate"></i>
          Làm mới dữ liệu
        </button>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="app-card p-5"><p className="text-sm text-ink-500">Số bản ghi trang này</p><p className="mt-2 text-2xl font-bold text-ink-900">{readings.length}</p></div>
        <div className="app-card p-5"><p className="text-sm text-ink-500">Trang hiện tại</p><p className="mt-2 text-2xl font-bold text-ink-900">{currentPage}/{totalPages}</p></div>
        <div className="app-card p-5"><p className="text-sm text-ink-500">Bản ghi bất thường</p><p className="mt-2 text-2xl font-bold text-red-600">{readings.filter((item) => isReadingAbnormal(item)).length}</p></div>
      </section>

      <section className="app-card overflow-hidden">
        <div className="app-card-header">
          <div>
            <h2 className="section-title">Danh sách bản ghi</h2>
            <p className="section-subtitle">Mỗi hàng tương ứng một lần đo đã lưu trên hệ thống.</p>
          </div>
        </div>
        <div className="app-card-body">
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

              {totalPages > 1 ? (
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-ink-500">Điều hướng qua các trang để xem toàn bộ lịch sử đo.</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Trước</button>
                    {pageWindow.map((page) => (
                      <button key={page} type="button" className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-semibold ${page === currentPage ? "bg-brand-600 text-white" : "border border-surface-line bg-white text-ink-700 hover:bg-surface-soft"}`} onClick={() => setCurrentPage(page)}>{page}</button>
                    ))}
                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Sau</button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>

      <ReadingDetailModal show={Boolean(selectedReadingId)} readingId={selectedReadingId} onHide={() => setSelectedReadingId(null)} />
    </div>
  )
}

export default PatientHistory
