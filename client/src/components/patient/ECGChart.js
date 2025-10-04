"use client"

import { useRef } from "react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"
import { Line } from "react-chartjs-2"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const ECGChart = ({ data = [] }) => {
  const chartRef = useRef()

  // Cấu hình
  const sampleRate = 250
  const windowSize = 4 * sampleRate // 1000 mẫu = 4 giây

  // Lấy 1000 mẫu cuối, nếu chưa đủ thì pad 0 ở đầu
  let visibleData =
    data.length > windowSize ? data.slice(-windowSize) : data

  if (visibleData.length < windowSize) {
    const padding = new Array(windowSize - visibleData.length).fill(0)
    visibleData = [...padding, ...visibleData]
  }

  // Thời gian bắt đầu của cửa sổ
  const startTime = Math.max(0, data.length - windowSize) / sampleRate

  // Dữ liệu hiển thị
  const chartData = {
    labels: visibleData.map((_, index) =>
      (startTime + index / sampleRate).toFixed(2)
    ),
    datasets: [
      {
        label: "ECG Signal",
        data: visibleData.map(v => v/2),
        borderColor: "#dc3545",
        backgroundColor: "rgba(220, 53, 69, 0.1)",
        fill: false,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: "Thời gian (s)",
        },
        ticks: {
          maxTicksLimit: 10,
          color: "#666",
        },
        grid: {
          color: "#e0e0e0",
          lineWidth: 0.5,
        },
      },
      y: {
        min: -1.5,
        max: 1.5,
        title: {
          display: true,
          text: "Biên độ (mV)",
        },
        ticks: { stepSize: 0.5, color: "#666", font: { size: 10 } },
        grid: { color: "#e0e0e0", lineWidth: 0.5 },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    elements: {
      point: { radius: 0 },
      line: { borderWidth: 2, tension: 0 },
    },
  }

  return (
    <div style={{ height: "300px", position: "relative" }}>
      {visibleData.length > 0 ? (
        <Line ref={chartRef} data={chartData} options={options} />
      ) : (
        <div className="d-flex align-items-center justify-content-center h-100">
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Đang tải...</span>
            </div>
            <p className="text-muted">Đang chờ dữ liệu ECG...</p>
            <small className="text-muted">
              Nhấn "Tạo dữ liệu giả" để bắt đầu
            </small>
          </div>
        </div>
      )}
    </div>
  )
}

export default ECGChart
