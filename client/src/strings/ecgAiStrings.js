// Bộ hằng số chuẩn cho 5 lớp AI ECG và quy tắc bình thường/bất thường ở frontend.
export const ECG_AI_CLASS_CODES = ["F", "N", "Q", "S", "V"]
export const ECG_AI_NORMAL_CODES = new Set(["N", "Q"])

export const ECG_AI_CLASS_LABELS_VI = {
  F: "Nhịp hợp nhất",
  N: "Bình thường",
  Q: "Không xác định",
  S: "Rung nhĩ",
  V: "Ngoại tâm thu",
}

export const ECG_AI_CLASS_COLORS = {
  F: "#8E44AD",
  N: "#16A085",
  Q: "#6C757D",
  S: "#E74C3C",
  V: "#F39C12",
}

const NORMAL_TEXTS = new Set(["normal", "binh thuong", "bình thường"])

const normalizeText = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()

// Hàm kiểm tra mã lớp có thuộc nhóm bình thường hay không.
export const isNormalAiCode = (code) => ECG_AI_NORMAL_CODES.has(String(code || "").trim().toUpperCase())

// Hàm lấy tên lớp tiếng Việt từ mã lớp AI.
export const getAiLabelFromCode = (code) => {
  const normalizedCode = String(code || "").trim().toUpperCase()
  return ECG_AI_CLASS_LABELS_VI[normalizedCode] || normalizedCode || "Không xác định"
}

// Hàm suy ra mã lớp AI từ chuỗi nhãn (code/English/Việt).
export const resolveAiCodeFromLabel = (label) => {
  const normalized = normalizeText(label)
  if (!normalized) return null

  const byCode = ECG_AI_CLASS_CODES.find((code) => code.toLowerCase() === normalized)
  if (byCode) return byCode

  if (normalized === "afib" || normalized === "rung nhi") return "S"
  if (normalized === "ngoai tam thu") return "V"
  if (normalized === "fusion" || normalized === "nhip hop nhat") return "F"
  if (normalized === "unknown" || normalized === "khong xac dinh") return "Q"
  if (NORMAL_TEXTS.has(normalized)) return "N"
  return null
}

// Hàm chuyển mã màu hex thành rgba để tô nền mờ cho vùng highlight.
export const toRgba = (hex, alpha = 0.2) => {
  const normalized = String(hex || "").trim().replace("#", "")
  if (normalized.length !== 6) return `rgba(108,117,125,${alpha})`
  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Hàm lấy màu hiển thị theo mã lớp AI.
export const getAiColorByCode = (code) => {
  const normalized = String(code || "").trim().toUpperCase()
  return ECG_AI_CLASS_COLORS[normalized] || ECG_AI_CLASS_COLORS.Q
}

// Hàm định dạng chuỗi ai_result để luôn hiển thị theo tên lớp tiếng Việt.
export const formatAiResultForDisplay = (text) => {
  const raw = String(text || "").trim()
  if (!raw) return "-"

  const normalizedRaw = normalizeText(raw)
  if (NORMAL_TEXTS.has(normalizedRaw)) return "Bình thường"

  const parts = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)

  if (parts.length === 0) return raw

  const mapped = parts.map((part) => {
    const [left, right] = part.split(":").map((item) => String(item || "").trim())
    const code = resolveAiCodeFromLabel(left)
    const label = code ? getAiLabelFromCode(code) : left
    if (!right) return label
    return `${label}:${right}`
  })

  return mapped.join(", ")
}

// Hàm xác định trạng thái bất thường từ ai_result text (fallback khi thiếu abnormal_detected).
export const isAbnormalAiResultText = (text, abnormalDetected) => {
  if (typeof abnormalDetected === "boolean") return abnormalDetected

  const raw = String(text || "").trim()
  if (!raw) return false

  const normalizedRaw = normalizeText(raw)
  if (NORMAL_TEXTS.has(normalizedRaw)) return false
  if (normalizedRaw.includes("bat thuong")) return true

  const parts = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)

  for (const part of parts) {
    const [left] = part.split(":")
    const code = resolveAiCodeFromLabel(left)
    if (!code) continue
    if (!isNormalAiCode(code)) return true
  }

  return false
}
