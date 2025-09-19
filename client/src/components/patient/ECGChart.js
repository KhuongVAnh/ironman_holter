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

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0, // Tắt animation để hiển thị realtime mượt mà
    },
    scales: {
      x: {
        display: false, // Ẩn trục x
        grid: {
          color: "#e0e0e0",
          lineWidth: 0.5,
        },
      },
      y: {
        min: -1.5,
        max: 1.5,
        grid: {
          color: "#e0e0e0",
          lineWidth: 0.5,
        },
        ticks: {
          stepSize: 0.5,
          color: "#666",
          font: {
            size: 10,
          },
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false, // Tắt tooltip để tăng performance
      },
    },
    elements: {
      point: {
        radius: 0, // Ẩn các điểm để đường line mượt mà hơn
      },
      line: {
        borderWidth: 2,
        tension: 0, // Đường thẳng, không cong
      },
    },
  }

  const chartData = {
    labels: data.map((_, index) => index),
    datasets: [
      {
        label: "ECG Signal",
        data: data,
        borderColor: "#dc3545", // Màu đỏ cho tín hiệu ECG
        backgroundColor: "rgba(220, 53, 69, 0.1)",
        fill: false,
      },
    ],
  }

  return (
    <div style={{ height: "300px", position: "relative" }}>
      {data.length > 0 ? (
        <Line ref={chartRef} data={chartData} options={options} />
      ) : (
        <div className="d-flex align-items-center justify-content-center h-100">
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Đang tải...</span>
            </div>
            <p className="text-muted">Đang chờ dữ liệu ECG...</p>
            <small className="text-muted">Nhấn "Tạo dữ liệu giả" để bắt đầu</small>
          </div>
        </div>
      )}
    </div>
  )
}

export default ECGChart
