import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "react-toastify"
import { readingsApi } from "../../services/api"
import { formatAiResultForDisplay } from "../../strings/ecgAiStrings"
import ModalFrame from "./ModalFrame"
import PaginationBar from "./PaginationBar"
import ReadingDetailModal from "./ReadingDetailModal"

const ITEMS_PER_PAGE = 8

const formatDateTime = (value) => {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString("vi-VN")
}

const getAiStatusLabel = (reading) => {
  const status = String(reading?.ai_status || "").toUpperCase()
  if (status === "PENDING") return "Đang phân tích"
  if (status === "FAILED") return reading?.ai_error || "AI lỗi"
  return formatAiResultForDisplay(reading?.ai_result) || "Hoàn tất"
}

const DeviceReadingsModal = ({ show, onClose, device }) => {
  const [loading, setLoading] = useState(false)
  const [readings, setReadings] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalReadings, setTotalReadings] = useState(0)
  const [selectedReadingId, setSelectedReadingId] = useState(null)
  const skipNextPageFetchRef = useRef(false)

  const deviceId = device?.device_id
  const serialNumber = device?.serial_number || "-"

  const fetchReadings = async (page = currentPage) => {
    if (!deviceId) return
    try {
      setLoading(true)
      const offset = (page - 1) * ITEMS_PER_PAGE
      const response = await readingsApi.getByDevice(deviceId, { limit: ITEMS_PER_PAGE, offset })
      const list = Array.isArray(response.data?.readings) ? response.data.readings : []
      const total = response.data?.total ?? list.length

      setReadings(list)
      setTotalReadings(total)
      setTotalPages(Math.max(1, Math.ceil(total / ITEMS_PER_PAGE)))
    } catch (error) {
      console.error("Lỗi tải readings theo thiết bị:", error)
      toast.error(error.response?.data?.message || "Không thể tải dữ liệu thiết bị")
      setReadings([])
      setTotalReadings(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!show) {
      setReadings([])
      setSelectedReadingId(null)
      setCurrentPage(1)
      setTotalPages(1)
      setTotalReadings(0)
      skipNextPageFetchRef.current = false
      return
    }
    skipNextPageFetchRef.current = true
    setCurrentPage(1)
    fetchReadings(1)
  }, [show, deviceId])

  useEffect(() => {
    if (!show || !deviceId) return
    if (skipNextPageFetchRef.current) {
      skipNextPageFetchRef.current = false
      return
    }
    fetchReadings(currentPage)
  }, [currentPage, show, deviceId])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const summary = useMemo(() => {
    const abnormal = readings.filter((item) => item.abnormal_detected).length
    const latest = readings[0] || null
    return {
      total: totalReadings,
      abnormal,
      latestHeartRate: latest?.heart_rate ? `${latest.heart_rate} BPM` : "--",
      pageInfo: totalReadings > 0 ? `${currentPage}/${totalPages}` : "0/1",
    }
  }, [currentPage, readings, totalPages, totalReadings])

  return (
    <>
      <ModalFrame
        show={show}
        onClose={onClose}
        title="Chi tiết thiết bị"
        size="xl"
        footer={
          <>
            <button type="button" className="btn btn-outline-primary" onClick={fetchReadings} disabled={loading}>
              <i className="fas fa-rotate-right me-2"></i>Làm mới
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Đóng</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-surface-line bg-white p-4 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="panel-eyebrow">Device readings</p>
                <h4 className="break-words text-xl font-bold text-ink-900">{serialNumber}</h4>
                <p className="mt-1 text-sm text-ink-500">ID thiết bị: {deviceId || "-"}</p>
              </div>
              <div className="grid min-w-[260px] gap-2 sm:grid-cols-3">
                <div className="rounded-xl bg-surface-soft px-3 py-2 text-center">
                  <p className="text-[11px] font-bold uppercase text-ink-500">Bản ghi</p>
                  <p className="text-lg font-bold text-ink-900">{summary.total}</p>
                </div>
                <div className="rounded-xl bg-red-50 px-3 py-2 text-center">
                  <p className="text-[11px] font-bold uppercase text-red-600">Bất thường</p>
                  <p className="text-lg font-bold text-red-700">{summary.abnormal}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 px-3 py-2 text-center">
                  <p className="text-[11px] font-bold uppercase text-emerald-600">Trang</p>
                  <p className="text-lg font-bold text-emerald-700">{summary.pageInfo}</p>
                </div>
                <div className="rounded-xl bg-sky-50 px-3 py-2 text-center">
                  <p className="text-[11px] font-bold uppercase text-sky-600">Mới nhất</p>
                  <p className="text-lg font-bold text-sky-700">{summary.latestHeartRate}</p>
                </div>
              </div>
            </div>
          </div>

          <section className="rounded-xl border border-surface-line bg-white shadow-soft">
            {loading ? (
              <div className="flex justify-center py-12"><div className="spinner-border" role="status" /></div>
            ) : readings.length ? (
              <div className="overflow-hidden rounded-xl">
                <div className="overflow-x-auto">
                  <table className="table align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Thời gian</th>
                        <th>Nhịp tim</th>
                        <th>AI</th>
                        <th>Trạng thái</th>
                        <th className="text-end">Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody>
                      {readings.map((reading) => (
                        <tr key={reading.reading_id}>
                          <td>{formatDateTime(reading.timestamp)}</td>
                          <td className="font-bold text-ink-900">{reading.heart_rate} BPM</td>
                          <td className="max-w-[340px] truncate text-sm text-ink-700">{getAiStatusLabel(reading)}</td>
                          <td>
                            <span className={`status-chip ${reading.abnormal_detected ? "is-danger" : "is-success"}`}>
                              {reading.abnormal_detected ? "Bất thường" : "Bình thường"}
                            </span>
                          </td>
                          <td className="text-end">
                            <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setSelectedReadingId(reading.reading_id)}>
                              <i className="fas fa-eye me-1"></i>Xem ECG
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 pb-4">
                  <PaginationBar
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    summaryText={
                      totalReadings > 0
                        ? `Hiển thị ${Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalReadings)}-${Math.min(currentPage * ITEMS_PER_PAGE, totalReadings)} / ${totalReadings} bản ghi`
                        : "Chưa có bản ghi để phân trang"
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="empty-state-rich py-12">
                <div className="empty-state-rich-icon info"><i className="fas fa-wave-square"></i></div>
                <h3>Chưa có bản ghi</h3>
                <p>Thiết bị này chưa có dữ liệu ECG trong hệ thống.</p>
              </div>
            )}
          </section>
        </div>
      </ModalFrame>

      <ReadingDetailModal
        show={Boolean(selectedReadingId)}
        readingId={selectedReadingId}
        onHide={() => setSelectedReadingId(null)}
      />
    </>
  )
}

export default DeviceReadingsModal
