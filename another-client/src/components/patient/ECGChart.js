"use client"

import { useEffect, useMemo, useRef } from "react"
import uPlot from "uplot"
import "uplot/dist/uPlot.min.css"
import {
  ECG_AI_CLASS_CODES,
  getAiColorByCode,
  getAiLabelFromCode,
  resolveAiCodeFromLabel,
  toRgba,
} from "../../strings/ecgAiStrings"

const DEFAULT_SAMPLE_RATE = 250
const ECG_GRID_TIME_STEP_SECONDS = 0.1
const ECG_GRID_VOLTAGE_STEP = 0.1
const ECG_GRID_MAJOR_EVERY = 5

const normalizeEcgData = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => Number(item)).filter((item) => Number.isFinite(item))
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.map((item) => Number(item)).filter((item) => Number.isFinite(item))
      }
    } catch (_error) {
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
      if (!Number.isInteger(startSample) || !Number.isInteger(endSample) || endSample <= startSample) return null

      const labelCode = String(
        item?.label_code || resolveAiCodeFromLabel(item?.label_text || item?.alert_type || "") || "Q"
      ).trim().toUpperCase()

      return {
        start_sample: startSample,
        end_sample: endSample,
        label_code: labelCode,
        label_text: item?.label_text || getAiLabelFromCode(labelCode),
        confidence: Number.isFinite(Number(item?.confidence))
          ? Number(item.confidence)
          : Number.isFinite(Number(item?.score))
            ? Number(item.score)
            : null,
      }
    })
    .filter(Boolean)
}

const formatSeconds = (value) => `${Number(value).toFixed(2)}s`

const buildHighlightPlugin = (ranges) => ({
  hooks: {
    draw: [
      (chart) => {
        if (!ranges.length) return
        const { ctx, bbox } = chart

        ctx.save()
        for (const range of ranges) {
          const left = Math.round(chart.valToPos(range.start_time, "x", true))
          const right = Math.round(chart.valToPos(range.end_time, "x", true))
          const width = right - left
          if (!Number.isFinite(width) || width <= 0) continue

          ctx.fillStyle = toRgba(getAiColorByCode(range.label_code), 0.12)
          ctx.fillRect(left, bbox.top, width, bbox.height)
        }
        ctx.restore()
      },
    ],
  },
})

const isMajorGridLine = (value, step) => {
  const index = Math.round(value / step)
  return Math.abs(value / step - index) < 0.001 && Math.abs(index) % ECG_GRID_MAJOR_EVERY === 0
}

const drawGridLine = (ctx, x1, y1, x2, y2, major) => {
  ctx.beginPath()
  ctx.strokeStyle = major ? "rgba(225, 29, 72, 0.18)" : "rgba(225, 29, 72, 0.08)"
  ctx.lineWidth = major ? 1.2 : 0.7
  ctx.moveTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5)
  ctx.lineTo(Math.round(x2) + 0.5, Math.round(y2) + 0.5)
  ctx.stroke()
}

const buildEcgGridPlugin = () => ({
  hooks: {
    drawClear: [
      (chart) => {
        const { ctx, bbox } = chart
        const xMin = Number(chart.scales.x.min)
        const xMax = Number(chart.scales.x.max)
        const yMin = Number(chart.scales.y.min)
        const yMax = Number(chart.scales.y.max)

        if (![xMin, xMax, yMin, yMax].every(Number.isFinite)) return

        ctx.save()
        ctx.rect(bbox.left, bbox.top, bbox.width, bbox.height)
        ctx.clip()

        const firstTimeLine = Math.ceil(xMin / ECG_GRID_TIME_STEP_SECONDS) * ECG_GRID_TIME_STEP_SECONDS
        for (let value = firstTimeLine; value <= xMax + 0.0001; value += ECG_GRID_TIME_STEP_SECONDS) {
          const x = chart.valToPos(Number(value.toFixed(6)), "x", true)
          drawGridLine(ctx, x, bbox.top, x, bbox.top + bbox.height, isMajorGridLine(value, ECG_GRID_TIME_STEP_SECONDS))
        }

        const firstVoltageLine = Math.ceil(yMin / ECG_GRID_VOLTAGE_STEP) * ECG_GRID_VOLTAGE_STEP
        for (let value = firstVoltageLine; value <= yMax + 0.0001; value += ECG_GRID_VOLTAGE_STEP) {
          const y = chart.valToPos(Number(value.toFixed(6)), "y", true)
          drawGridLine(ctx, bbox.left, y, bbox.left + bbox.width, y, isMajorGridLine(value, ECG_GRID_VOLTAGE_STEP))
        }

        ctx.restore()
      },
    ],
  },
})

const buildHoverValuePlugin = () => {
  let marker = null
  let tooltip = null
  let leaveHandler = null

  const hideHover = () => {
    if (marker) marker.style.display = "none"
    if (tooltip) tooltip.style.display = "none"
  }

  return {
    hooks: {
      ready: [
        (chart) => {
          const hoverLayer = chart.root.querySelector(".u-wrap") || chart.root
          hoverLayer.style.position = "relative"

          marker = document.createElement("div")
          marker.className = "ecg-hover-marker"
          marker.style.display = "none"

          tooltip = document.createElement("div")
          tooltip.className = "ecg-hover-tooltip"
          tooltip.style.display = "none"

          hoverLayer.appendChild(marker)
          hoverLayer.appendChild(tooltip)

          leaveHandler = hideHover
          chart.root.addEventListener("mouseleave", leaveHandler)
        },
      ],
      setCursor: [
        (chart) => {
          const index = chart.cursor.idx
          const time = chart.data?.[0]?.[index]
          const amplitude = chart.data?.[1]?.[index]

          if (!Number.isInteger(index) || !Number.isFinite(time) || !Number.isFinite(amplitude)) {
            hideHover()
            return
          }

          const x = chart.bbox.left + chart.valToPos(time, "x", false)
          const y = chart.bbox.top + chart.valToPos(amplitude, "y", false)
          const tooltipOffsetX = x > chart.bbox.left + chart.bbox.width - 160 ? -152 : 12
          const tooltipOffsetY = y < chart.bbox.top + 54 ? 14 : -44

          marker.style.display = "block"
          marker.style.transform = `translate(${x - 6}px, ${y - 6}px)`

          tooltip.style.display = "block"
          tooltip.style.transform = `translate(${x + tooltipOffsetX}px, ${y + tooltipOffsetY}px)`
          tooltip.innerHTML = `
            <span class="ecg-hover-tooltip-label">Biên độ</span>
            <strong>${amplitude.toFixed(3)} V</strong>
            <small>${time.toFixed(2)}s</small>
          `
        },
      ],
      destroy: [
        (chart) => {
          if (leaveHandler) chart.root.removeEventListener("mouseleave", leaveHandler)
          marker?.remove()
          tooltip?.remove()
        },
      ],
    },
  }
}

const ECGChart = ({
  data = [],
  highlights = [],
  sampleRate = DEFAULT_SAMPLE_RATE,
  displayWindowSeconds = 5,
  height = 300,
}) => {
  const containerRef = useRef(null)
  const chartRef = useRef(null)

  const resolveContainerWidth = (element) => {
    if (!element) return 320
    const ownWidth = Math.floor(element.getBoundingClientRect().width)
    const parentWidth = Math.floor(element.parentElement?.getBoundingClientRect().width || 0)
    return Math.max(320, ownWidth, parentWidth)
  }

  const normalizedData = useMemo(() => normalizeEcgData(data), [data])
  const normalizedHighlights = useMemo(() => normalizeHighlights(highlights), [highlights])

  const prepared = useMemo(() => {
    const safeSampleRate = Number.isFinite(Number(sampleRate)) && Number(sampleRate) > 0 ? Number(sampleRate) : DEFAULT_SAMPLE_RATE
    const windowSize = Math.max(1, Math.round(displayWindowSeconds * safeSampleRate))
    const visibleData = normalizedData.slice(-windowSize)
    const windowStartSample = Math.max(0, normalizedData.length - visibleData.length)
    const startTime = windowStartSample / safeSampleRate
    const xValues = visibleData.map((_, index) => startTime + index / safeSampleRate)

    const visibleRanges = normalizedHighlights
      .map((item) => {
        const startIndex = Math.max(0, item.start_sample - windowStartSample)
        const endIndex = Math.min(visibleData.length - 1, item.end_sample - windowStartSample)
        if (endIndex < 0 || startIndex >= visibleData.length || endIndex <= startIndex) return null
        return {
          ...item,
          start_index: startIndex,
          end_index: endIndex,
          start_time: xValues[startIndex] ?? startTime,
          end_time: xValues[endIndex] ?? startTime,
        }
      })
      .filter(Boolean)

    const overlaySeries = ECG_AI_CLASS_CODES.map((code) => {
      const values = new Array(visibleData.length).fill(null)
      let hasData = false

      for (const range of visibleRanges) {
        if (range.label_code !== code) continue
        for (let index = range.start_index; index <= range.end_index; index += 1) {
          values[index] = visibleData[index]
          hasData = true
        }
      }

      return hasData ? { code, values } : null
    }).filter(Boolean)

    return {
      xValues,
      visibleData,
      visibleRanges,
      overlaySeries,
    }
  }, [displayWindowSeconds, normalizedData, normalizedHighlights, sampleRate])

  useEffect(() => {
    if (!containerRef.current || prepared.visibleData.length === 0) return undefined

    const container = containerRef.current
    const width = resolveContainerWidth(container)
    const chartData = [
      prepared.xValues,
      prepared.visibleData,
      ...prepared.overlaySeries.map((series) => series.values),
    ]

    const chart = new uPlot(
      {
        width,
        height,
        padding: [76, 32, 0, 0],
        plugins: [buildEcgGridPlugin(), buildHighlightPlugin(prepared.visibleRanges), buildHoverValuePlugin()],
        cursor: {
          drag: { x: false, y: false },
          focus: { prox: 18 },
        },
        scales: {
          x: { time: false },
          y: { range: [-1.5, 1.5] },
        },
        axes: [
          {
            stroke: "#64748b",
            grid: { show: false },
            ticks: { stroke: "rgba(225, 29, 72, 0.16)", width: 1 },
            font: "11px Be Vietnam Pro, Arial, sans-serif",
            values: (_chart, values) => values.map((value) => `${Number(value).toFixed(1)}s`),
          },
          {
            labelSize: 28,
            labelFont: "12px Be Vietnam Pro, Arial, sans-serif",
            stroke: "#64748b",
            grid: { show: false },
            ticks: { stroke: "rgba(225, 29, 72, 0.16)", width: 1 },
            font: "11px Be Vietnam Pro, Arial, sans-serif",
            values: (_chart, values) => values.map((value) => `${Number(value).toFixed(1)}V`),
          },
        ],
        series: [
          {},
          {
            label: "ECG",
            stroke: "#E11D48",
            width: 2,
            points: { show: false },
          },
          ...prepared.overlaySeries.map((series) => ({
            label: getAiLabelFromCode(series.code),
            stroke: getAiColorByCode(series.code),
            width: 4,
            points: { show: false },
            spanGaps: false,
          })),
        ],
      },
      chartData,
      container
    )

    chartRef.current = chart

    const resizeObserver = new ResizeObserver(([entry]) => {
      const observedWidth = Math.floor(entry.contentRect.width)
      const fallbackWidth = Math.floor(container.parentElement?.getBoundingClientRect().width || 0)
      const nextWidth = Math.max(320, observedWidth, fallbackWidth)
      chart.setSize({ width: nextWidth, height })
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      chart.destroy()
      chartRef.current = null
    }
  }, [height, prepared])

  if (prepared.visibleData.length === 0) {
    return (
      <div className="ecg-paper-surface relative flex items-center justify-center overflow-hidden rounded-2xl border border-brand-100" style={{ minHeight: `${height}px` }}>
        <svg className="pointer-events-none absolute mx-10 inset-x-8 top-1/2 h-24 -translate-y-1/2 text-brand-500/30" viewBox="0 0 900 120" preserveAspectRatio="none" aria-hidden="true">
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points="0,62 90,62 108,62 118,42 132,82 146,22 164,98 180,62 290,62 306,62 316,50 326,74 338,62 470,62 488,62 498,42 512,82 526,22 544,98 560,62 700,62 716,54 728,70 742,62 900,62"
          />
        </svg>
        <div className="relative max-w-sm rounded-2xl border border-surface-line bg-white/90 px-5 py-4 text-center shadow-medium backdrop-blur">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-xl text-brand-600">
            <i className="fas fa-wave-square"></i>
          </div>
          <p className="mt-3 font-bold text-ink-900">Đang chờ tín hiệu ECG</p>
          <p className="mt-1 text-sm leading-6 text-ink-600">Tạo dữ liệu mô phỏng hoặc chờ thiết bị gửi tín hiệu.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="ecg-paper-surface w-full rounded-2xl border border-brand-100 p-1 sm:p-1.5 shadow-soft">
      <div ref={containerRef} className="ecg-uplot w-full min-w-0" />
      {prepared.visibleRanges.length > 0 && (
        <div className="mt-2 rounded-xl border border-brand-100 bg-white/85 px-3 py-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-500">Kết quả AI trong khung đang xem</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {prepared.visibleRanges.slice(0, 6).map((range, index) => (
              <span
                key={`${range.label_code}-${range.start_sample}-${range.end_sample}-${index}`}
                className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold"
                style={{
                  borderColor: toRgba(getAiColorByCode(range.label_code), 0.4),
                  color: getAiColorByCode(range.label_code),
                  backgroundColor: toRgba(getAiColorByCode(range.label_code), 0.12),
                }}
              >
                <span>{range.label_text}</span>
                <span className="text-ink-600">{formatSeconds(range.start_time)} - {formatSeconds(range.end_time)}</span>
                {range.confidence !== null && (
                  <span className="text-ink-700">{Math.round(range.confidence * 100)}%</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ECGChart
