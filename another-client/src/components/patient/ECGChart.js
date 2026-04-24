"use client"

import { useMemo, useRef } from "react"
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
import {
  ECG_AI_CLASS_CODES,
  getAiColorByCode,
  getAiLabelFromCode,
  resolveAiCodeFromLabel,
  toRgba,
} from "../../strings/ecgAiStrings"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const DEFAULT_SAMPLE_RATE = 250

const normalizeEcgData = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item))
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => Number(item))
          .filter((item) => Number.isFinite(item))
      }
    } catch (error) {
      return []
    }
  }

  return []
}

const normalizeHighlights = (highlights = []) => {
  if (!Array.isArray(highlights)) return []

  return highlights
    .map((item) => {
      const startSample = Number.parseInt(item?.start_sample, 10)
      const endSample = Number.parseInt(item?.end_sample, 10)
      if (!Number.isInteger(startSample) || !Number.isInteger(endSample) || endSample <= startSample) {
        return null
      }

      const resolvedCode = String(
        item?.label_code || resolveAiCodeFromLabel(item?.label_text || item?.alert_type || "") || "Q"
      )
        .trim()
        .toUpperCase()

      return {
        start_sample: startSample,
        end_sample: endSample,
        label_code: resolvedCode,
        label_text: item?.label_text || getAiLabelFromCode(resolvedCode),
      }
    })
    .filter(Boolean)
}

const ECGChart = ({
  data = [],
  highlights = [],
  sampleRate = DEFAULT_SAMPLE_RATE,
  displayWindowSeconds = 5,
  height = 300,
}) => {
  const chartRef = useRef(null)

  const normalizedData = useMemo(() => normalizeEcgData(data), [data])
  const normalizedHighlights = useMemo(() => normalizeHighlights(highlights), [highlights])

  const windowSize = Math.max(1, Math.round(displayWindowSeconds * sampleRate))
  const visibleData = normalizedData.slice(-windowSize)
  const windowStartSample = Math.max(0, normalizedData.length - visibleData.length)
  const startTime = windowStartSample / sampleRate

  const visibleHighlightRanges = useMemo(() => {
    if (visibleData.length === 0) return []

    const maxVisibleIndex = visibleData.length - 1
    return normalizedHighlights
      .map((item) => {
        const startIndex = Math.max(0, item.start_sample - windowStartSample)
        const endIndex = Math.min(maxVisibleIndex, item.end_sample - windowStartSample)
        if (endIndex < 0 || startIndex > maxVisibleIndex || endIndex <= startIndex) return null
        return {
          ...item,
          start_index: startIndex,
          end_index: endIndex,
        }
      })
      .filter(Boolean)
  }, [normalizedHighlights, visibleData.length, windowStartSample])

  const pointLabelMap = useMemo(() => {
    const map = Array.from({ length: visibleData.length }, () => new Set())
    for (const range of visibleHighlightRanges) {
      for (let i = range.start_index; i <= range.end_index; i += 1) {
        if (map[i]) map[i].add(range.label_code)
      }
    }
    return map
  }, [visibleData.length, visibleHighlightRanges])

  const overlayDatasets = useMemo(() => {
    if (visibleData.length === 0) return []

    return ECG_AI_CLASS_CODES.map((code) => {
      const values = new Array(visibleData.length).fill(null)
      let hasData = false

      for (const range of visibleHighlightRanges) {
        if (range.label_code !== code) continue
        for (let i = range.start_index; i <= range.end_index; i += 1) {
          values[i] = visibleData[i]
          hasData = true
        }
      }

      if (!hasData) return null

      const color = getAiColorByCode(code)
      return {
        label: `Bất thường - ${getAiLabelFromCode(code)}`,
        data: values,
        borderColor: color,
        backgroundColor: color,
        fill: false,
        spanGaps: false,
        borderWidth: 3,
        pointRadius: 0,
      }
    }).filter(Boolean)
  }, [visibleData, visibleHighlightRanges])

  const chartData = useMemo(() => ({
    labels: visibleData.map((_, index) => (startTime + index / sampleRate).toFixed(2)),
    datasets: [
      {
        label: "ECG Signal",
        data: visibleData,
        borderColor: "#E11D48",
        backgroundColor: "rgba(13, 148, 136, 0.08)",
        fill: false,
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0,
      },
      ...overlayDatasets,
    ],
  }), [overlayDatasets, sampleRate, startTime, visibleData])

  const highlightBackgroundPlugin = useMemo(
    () => ({
      id: "ecg-highlight-background",
      beforeDatasetsDraw(chart) {
        const { ctx, chartArea, scales } = chart
        if (!chartArea || !scales?.x || visibleHighlightRanges.length === 0) return

        const xScale = scales.x
        const top = chartArea.top
        const heightValue = chartArea.bottom - chartArea.top

        ctx.save()
        for (const range of visibleHighlightRanges) {
          const left = xScale.getPixelForValue(Math.max(0, range.start_index - 0.5))
          const right = xScale.getPixelForValue(range.end_index + 0.5)
          const width = right - left
          if (!Number.isFinite(width) || width <= 0) continue

          ctx.fillStyle = toRgba(getAiColorByCode(range.label_code), 0.14)
          ctx.fillRect(left, top, width, heightValue)
        }
        ctx.restore()
      },
    }),
    [visibleHighlightRanges]
  )

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    scales: {
      x: {
        display: true,
        title: { display: true, text: "Thời gian (s)" },
        ticks: { maxTicksLimit: 10, color: "#6B7280" },
        grid: { color: "#FFE4E6", lineWidth: 0.5 },
      },
      y: {
        min: -2,
        max: 2,
        title: { display: true, text: "Biên độ (mV)" },
        ticks: { stepSize: 0.5, color: "#6B7280", font: { size: 10 } },
        grid: { color: "#FFE4E6", lineWidth: 0.5 },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        callbacks: {
          label: (context) => `Biên độ: ${Number(context.parsed?.y || 0).toFixed(3)} mV`,
          afterLabel: (context) => {
            const dataIndex = context.dataIndex
            const classes = Array.from(pointLabelMap[dataIndex] || [])
            if (classes.length === 0) return ""
            return `Lớp: ${classes.map((code) => getAiLabelFromCode(code)).join(", ")}`
          },
        },
      },
    },
    elements: { point: { radius: 0 }, line: { tension: 0 } },
  }), [pointLabelMap])

  return (
    <div className="h-full rounded-xl border border-surface-line bg-white p-3 shadow-soft">
      <div style={{ height: `${height}px`, position: "relative" }}>
        {visibleData.length > 0 ? (
          <Line ref={chartRef} data={chartData} options={options} plugins={[highlightBackgroundPlugin]} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="w-full max-w-sm rounded-2xl border border-surface-line bg-white px-6 py-7 text-center shadow-soft">
              <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-[11px] font-bold uppercase text-brand-700">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-600 opacity-40"></span>
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-600"></span>
                </span>
                Đang chờ tín hiệu
              </div>

              <div className="mt-5 flex items-end justify-center gap-1" aria-hidden="true">
                <span className="h-5 w-2 animate-pulse rounded-full bg-brand-600"></span>
                <span className="h-8 w-2 animate-pulse rounded-full bg-brand-600 [animation-delay:120ms]"></span>
                <span className="h-11 w-2 animate-pulse rounded-full bg-brand-600 [animation-delay:240ms]"></span>
                <span className="h-7 w-2 animate-pulse rounded-full bg-brand-600 [animation-delay:360ms]"></span>
                <span className="h-4 w-2 animate-pulse rounded-full bg-brand-600 [animation-delay:480ms]"></span>
              </div>

              <p className="mt-5 text-lg font-bold text-ink-900">Chưa có dữ liệu ECG trực tiếp</p>
              <p className="mt-2 text-sm leading-6 text-ink-600">
                Hệ thống sẽ hiển thị sóng ngay khi thiết bị gửi tín hiệu hoặc khi bạn tạo dữ liệu mô phỏng.
              </p>

              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-surface-soft px-4 py-2 text-xs font-medium text-ink-600">
                <i className="fas fa-wave-square text-brand-600"></i>
                Chế độ xem sẽ tự cập nhật theo thời gian thực
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ECGChart

