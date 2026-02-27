const DEFAULT_TELEMETRY_SAMPLE_RATE = 250

// Hàm chuẩn hóa tín hiệu ECG về mảng số hợp lệ để lưu và suy luận.
const normalizeEcgSignal = (input) => {
  let value = input
  if (typeof value === "string") {
    try {
      value = JSON.parse(value)
    } catch (error) {
      return []
    }
  }

  if (!Array.isArray(value)) return []
  return value.map((item) => Number(item)).filter(Number.isFinite)
}

// Hàm chuẩn hóa heart_rate từ đầu vào telemetry về số nguyên dương hợp lệ.
const toHeartRate = (value) => {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

// Hàm tính BPM từ số beat và độ dài tín hiệu khi telemetry không gửi heart_rate.
const deriveHeartRateFromBeatCount = (
  beatCount,
  sampleCount,
  sampleRate = DEFAULT_TELEMETRY_SAMPLE_RATE
) => {
  const beats = Number.parseInt(beatCount, 10)
  const samples = Number.parseInt(sampleCount, 10)
  const fs = Number(sampleRate)

  if (!Number.isInteger(beats) || beats <= 0) return null
  if (!Number.isInteger(samples) || samples <= 0) return null
  if (!Number.isFinite(fs) || fs <= 0) return null

  const durationSec = samples / fs
  if (!Number.isFinite(durationSec) || durationSec <= 0) return null

  return Math.max(1, Math.round((beats * 60) / durationSec))
}

module.exports = {
  DEFAULT_TELEMETRY_SAMPLE_RATE,
  normalizeEcgSignal,
  toHeartRate,
  deriveHeartRateFromBeatCount,
}
