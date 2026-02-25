const fs = require("fs")
const path = require("path")
const tf = require("@tensorflow/tfjs")
const Fili = require("fili")

/**
 * ecgCnnService
 * Mục tiêu:
 * - Thay thế AI fake bằng suy luận CNN thật ngay trong Node backend.
 *
 * Vấn đề cần giải:
 * - Model được export TFJS local (model.json + shard .bin), cần load an toàn và chỉ load 1 lần.
 * - Dữ liệu telemetry có thể lỗi/quá ngắn/không có R-peak, cần fallback để không làm vỡ nghiệp vụ chính.
 * - Pipeline infer phải giống train: bandpass -> detect peak -> segment 125 -> z-score -> predict.
 *
 * Ý tưởng triển khai:
 * 1) initModel(): load preprocess config + label map + model và warmup.
 * 2) predictFromReading(): validate input, preprocess, infer beat-level, majority vote reading-level.
 * 3) Fallback theo reason code (AI_DISABLED, SHORT_SIGNAL, NO_PEAK, ...), trả về object chuẩn.
 *
 * Lưu ý:
 * - N và Q được xem là bình thường, các class còn lại là bất thường.
 * - Service này chỉ cung cấp logic infer; wiring vào controller thuộc phase P3.
 */
const NORMAL_CODES = new Set(["N", "Q"])
const DEFAULT_LABEL_CODES = ["F", "N", "Q", "S", "V"]

let model = null
let preprocessConfig = null
let labelMap = {}
let isLoaded = false
let initPromise = null

// ===== Nhóm helper đọc file và resolve cấu hình =====

// Đọc nội dung text từ file và loại bỏ BOM nếu có.
const readTextFile = (filePath) => {
  const raw = fs.readFileSync(filePath)
  let text = raw.toString("utf8")
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1)
  }
  return text
}

// Đọc và parse file JSON an toàn từ đường dẫn cung cấp.
const readJsonFile = (filePath) => JSON.parse(readTextFile(filePath))

// Chuyển env path thành đường dẫn tuyệt đối theo root của server.
const resolveServerPath = (envValue, fallbackRelative) => {
  const serverRoot = path.resolve(__dirname, "..")
  const value = String(envValue || fallbackRelative || "").trim()
  return path.isAbsolute(value) ? value : path.resolve(serverRoot, value)
}

// Kiểm tra có bật AI inference qua biến môi trường hay không.
const isAIEnabled = () => String(process.env.AI_ENABLE || "false").toLowerCase() === "true"

// Lấy bộ đường dẫn model và config AI từ env hoặc giá trị mặc định.
const getModelPaths = () => {
  return {
    modelPath: resolveServerPath(process.env.AI_MODEL_PATH, "model_CNN/ecg_tfjs/model.json"),
    preprocessPath: resolveServerPath(
      process.env.AI_PREPROCESS_CONFIG_PATH,
      "model_CNN/ecg/preprocess_config.json"
    ),
    labelMapPath: resolveServerPath(
      process.env.AI_LABEL_MAP_PATH,
      "model_CNN/ecg/label_map.json"
    ),
  }
}

// Xác thực preprocess_config có đầy đủ key bắt buộc và giá trị hợp lệ.
const validatePreprocessConfig = (config) => {
  const requiredKeys = [
    "fs",
    "half_window",
    "segment_len",
    "lowcut",
    "highcut",
    "filter_order",
    "rpeak_min_distance_sec",
    "rpeak_min_height",
    "classes",
    "scaler_mean",
    "scaler_scale",
  ]

  for (const key of requiredKeys) {
    if (!(key in config)) {
      throw new Error(`Missing preprocess_config key: ${key}`)
    }
  }

  if (!Array.isArray(config.classes) || config.classes.length === 0) {
    throw new Error("Invalid preprocess_config.classes")
  }

  const scalerScale = Number(config.scaler_scale)
  if (!Number.isFinite(scalerScale) || scalerScale === 0) {
    throw new Error("Invalid preprocess_config.scaler_scale")
  }
}

// ===== Nhóm helper model loading (TFJS local artifacts) =====

// Chuẩn hóa model topology để tương thích dữ liệu export Keras 3/InputLayer.
const normalizeModelTopology = (modelTopology) => {
  const clonedTopology = JSON.parse(JSON.stringify(modelTopology || {}))
  const layers = clonedTopology?.model_config?.config?.layers

  if (!Array.isArray(layers)) {
    return clonedTopology
  }

  for (const layer of layers) {
    if (layer?.class_name !== "InputLayer" || !layer.config || typeof layer.config !== "object") {
      continue
    }

    const batchShape = layer.config.batch_shape || layer.config.batchShape
    if (Array.isArray(batchShape)) {
      layer.config.batchInputShape = batchShape
    }
    delete layer.config.batch_shape
    delete layer.config.batchShape
    delete layer.config.inputShape
  }

  return clonedTopology
}

// Tạo custom IO handler để load model TFJS local từ model.json và shard .bin.
const buildCustomIoHandler = (modelPath) => {
  const modelDir = path.dirname(modelPath)
  const modelJson = readJsonFile(modelPath)

  if (!modelJson?.modelTopology || !Array.isArray(modelJson?.weightsManifest)) {
    throw new Error("Invalid TFJS model.json format")
  }

  const weightSpecs = []
  const weightBuffers = []

  for (const manifest of modelJson.weightsManifest) {
    if (Array.isArray(manifest.weights)) {
      weightSpecs.push(...manifest.weights)
    }

    for (const shardName of manifest.paths || []) {
      const shardPath = path.resolve(modelDir, shardName)
      weightBuffers.push(fs.readFileSync(shardPath))
    }
  }

  const merged = Buffer.concat(weightBuffers)
  const weightData = merged.buffer.slice(
    merged.byteOffset,
    merged.byteOffset + merged.byteLength
  )

  return {
    load: async () => ({
      modelTopology: normalizeModelTopology(modelJson.modelTopology),
      weightSpecs,
      weightData,
    }),
  }
}

// ===== Nhóm helper preprocessing ECG =====

// Tính hệ số bandpass IIR theo tham số trong preprocess config.
const buildBandpassCoefficients = (config) => {
  const low = Number(config.lowcut)
  const high = Number(config.highcut)
  const fsHz = Number(config.fs)
  const order = Number(config.filter_order)
  const center = (low + high) / 2
  const bandwidth = Math.max(0.001, high - low)

  const calculator = new Fili.CalcCascades()
  return calculator.bandpass({
    order,
    characteristic: "butterworth",
    Fs: fsHz,
    Fc: center,
    BW: bandwidth,
    gain: 0,
  })
}

// Áp dụng lọc bandpass hai chiều (forward + reverse) để giảm lệch pha.
const applyBandpass = (signal, coeffs) => {
  const forwardFilter = new Fili.IirFilter(coeffs)
  const forward = forwardFilter.multiStep(signal.slice())

  const reverseFilter = new Fili.IirFilter(coeffs)
  const reverse = reverseFilter.multiStep(forward.slice().reverse())
  return reverse.reverse()
}

// Tìm vị trí R-peak bằng local maxima, ngưỡng biên độ và khoảng cách tối thiểu.
const detectPeaks = (signal, minHeight, minDistance) => {
  const peaks = []
  let lastAccepted = -minDistance

  for (let i = 1; i < signal.length - 1; i += 1) {
    const current = signal[i]
    if (current < minHeight) continue
    if (!(current > signal[i - 1] && current >= signal[i + 1])) continue
    if (i - lastAccepted < minDistance) continue

    peaks.push(i)
    lastAccepted = i
  }

  return peaks
}

// ===== Nhóm helper normalize input/output =====

// Chuyển input reading về mảng số hợp lệ để phục vụ preprocessing.
const toNumericArray = (input) => {
  let data = input

  if (typeof data === "string") {
    try {
      data = JSON.parse(data)
    } catch (error) {
      return null
    }
  }

  if (!Array.isArray(data) && data && typeof data === "object") {
    if (Array.isArray(data.ecg_signal)) data = data.ecg_signal
    else if (Array.isArray(data.reading)) data = data.reading
  }

  if (!Array.isArray(data)) return null

  const normalized = data.map((value) => Number(value)).filter(Number.isFinite)
  return normalized.length > 0 ? normalized : null
}

// Map label code của model sang label text hiển thị.
const labelTextFromCode = (labelCode) => {
  if (!labelCode) return null
  return labelMap?.[labelCode] || labelCode
}

// Tạo kết quả skip chuẩn hóa khi không thể infer AI (giữ contract output ổn định).
const makeSkipResult = (reason, inferMs, options = {}) => {
  const labelCode = options.labelCode ?? null
  return {
    label_code: labelCode,
    label_text: labelTextFromCode(labelCode),
    confidence: null,
    abnormal_detected: labelCode ? !NORMAL_CODES.has(labelCode) : false,
    beat_count: Number.isInteger(options.beatCount) ? options.beatCount : 0,
    skipped: true,
    reason,
    infer_ms: inferMs,
  }
}

// ===== Public APIs của service =====

// Trả về trạng thái load model AI hiện tại cho runtime.
const getModelState = () => ({
  enabled: isAIEnabled(),
  loaded: isLoaded,
})

// Khởi tạo model/config/label map một lần và warmup model trước khi suy luận.
const initModel = async () => {
  if (!isAIEnabled()) {
    return { enabled: false, loaded: false, reason: "AI_DISABLED" }
  }

  if (isLoaded && model) {
    return { enabled: true, loaded: true }
  }

  if (initPromise) {
    return initPromise
  }

  initPromise = (async () => {
    try {
      const paths = getModelPaths()
      preprocessConfig = readJsonFile(paths.preprocessPath)
      validatePreprocessConfig(preprocessConfig)
      labelMap = fs.existsSync(paths.labelMapPath) ? readJsonFile(paths.labelMapPath) : {}

      const ioHandler = buildCustomIoHandler(paths.modelPath)
      model = await tf.loadLayersModel(ioHandler)

      const segmentLength = Number(preprocessConfig.segment_len)
      const warmInput = tf.zeros([1, segmentLength, 1], "float32")
      let warmOutput = model.predict(warmInput)
      if (Array.isArray(warmOutput)) {
        warmOutput.forEach((tensor) => tensor.dispose())
      } else {
        warmOutput.dispose()
      }
      warmInput.dispose()

      isLoaded = true
      console.log("AI model loaded: ecgCnnService (tfjs pure JS)")
      return { enabled: true, loaded: true }
    } catch (error) {
      console.error("AI model init failed:", error)
      model = null
      isLoaded = false
      return { enabled: true, loaded: false, reason: "MODEL_INIT_FAILED" }
    } finally {
      initPromise = null
    }
  })()

  return initPromise
}

// Suy luận reading-level từ ecg_signal: preprocess -> infer -> majority vote -> map output.
const predictFromReading = async (ecgSignal) => {
  const startedAt = Date.now()

  if (!isAIEnabled()) {
    return makeSkipResult("AI_DISABLED", Date.now() - startedAt)
  }

  if (!isLoaded || !model || !preprocessConfig) {
    const initResult = await initModel()
    if (!initResult.loaded || !model || !preprocessConfig) {
      return makeSkipResult("MODEL_NOT_READY", Date.now() - startedAt)
    }
  }

  const signal = toNumericArray(ecgSignal)
  if (!signal) {
    return makeSkipResult("INVALID_INPUT", Date.now() - startedAt)
  }

  const segmentLength = Number(preprocessConfig.segment_len)
  if (signal.length < segmentLength) {
    return makeSkipResult("SHORT_SIGNAL", Date.now() - startedAt, { labelCode: "Q" })
  }

  try {
    const coeffs = buildBandpassCoefficients(preprocessConfig)
    const filteredSignal = applyBandpass(signal, coeffs)

    const minDistance = Math.max(
      1,
      Math.round(
        Number(preprocessConfig.rpeak_min_distance_sec) * Number(preprocessConfig.fs)
      )
    )

    const peaks = detectPeaks(
      filteredSignal,
      Number(preprocessConfig.rpeak_min_height),
      minDistance
    )

    const halfWindow = Number(preprocessConfig.half_window)
    const segments = []
    for (const peakIndex of peaks) {
      const start = peakIndex - halfWindow
      const end = peakIndex + halfWindow + 1
      if (start < 0 || end > filteredSignal.length) continue
      const segment = filteredSignal.slice(start, end)
      if (segment.length === segmentLength) {
        segments.push(segment)
      }
    }

    if (segments.length === 0) {
      return makeSkipResult("NO_PEAK", Date.now() - startedAt, { labelCode: "Q" })
    }

    const scalerMean = Number(preprocessConfig.scaler_mean)
    const scalerScale = Number(preprocessConfig.scaler_scale)

    const beatCount = segments.length
    const flat = new Float32Array(beatCount * segmentLength)
    for (let beatIndex = 0; beatIndex < beatCount; beatIndex += 1) {
      const seg = segments[beatIndex]
      for (let i = 0; i < segmentLength; i += 1) {
        flat[beatIndex * segmentLength + i] = (Number(seg[i]) - scalerMean) / scalerScale
      }
    }

    const inputTensor = tf.tensor3d(flat, [beatCount, segmentLength, 1], "float32")
    let outputTensor = model.predict(inputTensor)
    if (Array.isArray(outputTensor)) {
      outputTensor = outputTensor[0]
    }

    const probabilities = outputTensor.arraySync()
    inputTensor.dispose()
    outputTensor.dispose()

    const classes = Array.isArray(preprocessConfig.classes)
      ? preprocessConfig.classes
      : DEFAULT_LABEL_CODES

    const voteCount = new Array(classes.length).fill(0)
    for (const beatProbabilities of probabilities) {
      let bestIndex = 0
      for (let i = 1; i < beatProbabilities.length; i += 1) {
        if (beatProbabilities[i] > beatProbabilities[bestIndex]) {
          bestIndex = i
        }
      }
      voteCount[bestIndex] += 1
    }

    let winnerIndex = 0
    for (let i = 1; i < voteCount.length; i += 1) {
      if (voteCount[i] > voteCount[winnerIndex]) {
        winnerIndex = i
      }
    }

    const labelCode = classes[winnerIndex] || "Q"
    const winnerConfidence =
      probabilities.reduce((sum, row) => sum + (row[winnerIndex] || 0), 0) / beatCount

    return {
      label_code: labelCode,
      label_text: labelTextFromCode(labelCode),
      confidence: Number(winnerConfidence.toFixed(6)),
      abnormal_detected: !NORMAL_CODES.has(labelCode),
      beat_count: beatCount,
      skipped: false,
      reason: null,
      infer_ms: Date.now() - startedAt,
    }
  } catch (error) {
    console.error("AI inference error:", error)
    return makeSkipResult("INFER_ERROR", Date.now() - startedAt, { labelCode: "Q" })
  }
}

// Suy luận theo từng segment ECG 125 mẫu để phục vụ kiểm thử khớp baseline beat-level.
const predictBeatSegmentsForTest = async (segmentsInput) => {
  const startedAt = Date.now()

  if (!isAIEnabled()) {
    return {
      skipped: true,
      reason: "AI_DISABLED",
      infer_ms: Date.now() - startedAt,
      beat_count: 0,
      predictions: [],
    }
  }

  if (!isLoaded || !model || !preprocessConfig) {
    const initResult = await initModel()
    if (!initResult.loaded || !model || !preprocessConfig) {
      return {
        skipped: true,
        reason: "MODEL_NOT_READY",
        infer_ms: Date.now() - startedAt,
        beat_count: 0,
        predictions: [],
      }
    }
  }

  const segmentLength = Number(preprocessConfig.segment_len)
  const classes = Array.isArray(preprocessConfig.classes)
    ? preprocessConfig.classes
    : DEFAULT_LABEL_CODES
  const scalerMean = Number(preprocessConfig.scaler_mean)
  const scalerScale = Number(preprocessConfig.scaler_scale)

  // Làm sạch dữ liệu segment đầu vào và chỉ giữ segment đúng độ dài.
  const validSegments = Array.isArray(segmentsInput)
    ? segmentsInput
        .map((segment) =>
          Array.isArray(segment) ? segment.map((value) => Number(value)).filter(Number.isFinite) : null
        )
        .filter((segment) => Array.isArray(segment) && segment.length === segmentLength)
    : []

  if (validSegments.length === 0) {
    return {
      skipped: true,
      reason: "INVALID_SEGMENTS",
      infer_ms: Date.now() - startedAt,
      beat_count: 0,
      predictions: [],
    }
  }

  try {
    const beatCount = validSegments.length
    const flat = new Float32Array(beatCount * segmentLength)
    for (let beatIndex = 0; beatIndex < beatCount; beatIndex += 1) {
      const segment = validSegments[beatIndex]
      for (let i = 0; i < segmentLength; i += 1) {
        flat[beatIndex * segmentLength + i] = (Number(segment[i]) - scalerMean) / scalerScale
      }
    }

    // Chạy model theo batch segment để lấy kết quả beat-level.
    const inputTensor = tf.tensor3d(flat, [beatCount, segmentLength, 1], "float32")
    let outputTensor = model.predict(inputTensor)
    if (Array.isArray(outputTensor)) {
      outputTensor = outputTensor[0]
    }
    const probabilities = outputTensor.arraySync()
    inputTensor.dispose()
    outputTensor.dispose()

    // Map xác suất mỗi beat về label và confidence tương ứng.
    const predictions = probabilities.map((row) => {
      let bestIndex = 0
      for (let i = 1; i < row.length; i += 1) {
        if (row[i] > row[bestIndex]) {
          bestIndex = i
        }
      }
      const labelCode = classes[bestIndex] || "Q"
      return {
        label_code: labelCode,
        label_text: labelTextFromCode(labelCode),
        confidence: Number((row[bestIndex] || 0).toFixed(6)),
      }
    })

    return {
      skipped: false,
      reason: null,
      infer_ms: Date.now() - startedAt,
      beat_count: beatCount,
      predictions,
    }
  } catch (error) {
    console.error("AI beat-level inference error:", error)
    return {
      skipped: true,
      reason: "INFER_ERROR",
      infer_ms: Date.now() - startedAt,
      beat_count: 0,
      predictions: [],
    }
  }
}

module.exports = {
  initModel,
  predictFromReading,
  predictBeatSegmentsForTest,
  getModelState,
}
