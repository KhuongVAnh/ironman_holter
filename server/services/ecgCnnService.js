const fs = require("fs")
const path = require("path")
const tf = require("@tensorflow/tfjs")
const Fili = require("fili")
const {
  ECG_AI_CLASS_CODES,
  ECG_AI_SUMMARY_ORDER,
  isNormalAiCode,
  getAiLabelFromCode,
} = require("../strings/ecgAiStrings")
// Tập reason code chuẩn cho toàn bộ luồng fallback của AI infer.
const AI_FALLBACK_REASON_CODES = new Set([
  "AI_DISABLED", // AI bị tắt qua biến môi trường.
  "MODEL_NOT_READY", // Model chưa sẵn sàng để suy luận.
  "MODEL_INIT_FAILED", // Khởi tạo model thất bại.
  "INVALID_INPUT", // Dữ liệu đầu vào sai định dạng hoặc rỗng.
  "SHORT_SIGNAL", // Tín hiệu quá ngắn, không đủ 1 segment chuẩn.
  "NO_PEAK", // Không phát hiện được R-peak hợp lệ.
  "INFER_ERROR", // Lỗi trong quá trình suy luận model.
  "INVALID_SEGMENTS", // Dữ liệu segment test không hợp lệ.
  "INPUT_TRUNCATED", // Đầu vào bị cắt bớt do vượt ngưỡng cho phép.
])
const DEFAULT_MAX_SIGNAL_SAMPLES = 10000 // Giới hạn số mẫu ECG tối đa cho một lần infer.

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
 * 2) predictFromReading(): validate input, preprocess, infer beat-level, gom nhóm bất thường theo segment liên tiếp.
 * 3) Fallback theo reason code (AI_DISABLED, SHORT_SIGNAL, NO_PEAK, ...), trả về object chuẩn.
 *
 * Lưu ý:
 * - N và Q được xem là bình thường, các class còn lại là bất thường.
 * - Service này chỉ cung cấp logic infer; wiring vào controller thuộc phase P3.
 */
let model = null // Model TensorFlowJS đã load vào bộ nhớ.
let preprocessConfig = null // Cấu hình tiền xử lý đồng bộ với bước train.
let labelMap = {} // Bảng ánh xạ mã lớp sang tên lớp hiển thị.
let isLoaded = false // Cờ cho biết model đã sẵn sàng hay chưa.
let initPromise = null // Promise khởi tạo dùng để chống load model trùng lặp.

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

// Hàm trả về giới hạn số mẫu ECG tối đa cho một lần infer từ biến môi trường.
const getMaxSignalSamples = () => {
  const parsed = Number.parseInt(process.env.AI_MAX_SIGNAL_SAMPLES, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_SIGNAL_SAMPLES
}

// Hàm ghi log JSON line thống nhất cho toàn bộ luồng AI để dễ truy vết production.
const logAiEvent = (event, payload = {}) => {
  const normalizedEvent = String(event || "AI_EVENT").trim() || "AI_EVENT"
  const record = {
    event: normalizedEvent,
    timestamp: new Date().toISOString(),
    ...payload,
  }
  console.log(JSON.stringify(record))
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

// Hàm xác thực các tham số số học runtime trước khi chạy infer để tránh NaN propagation.
const validateRuntimeNumericConfig = (config) => {
  const fsHz = Number(config.fs)
  const lowcut = Number(config.lowcut)
  const highcut = Number(config.highcut)
  const filterOrder = Number(config.filter_order)
  const segmentLength = Number(config.segment_len)
  const halfWindow = Number(config.half_window)
  const rpeakMinDistanceSec = Number(config.rpeak_min_distance_sec)
  const rpeakMinHeight = Number(config.rpeak_min_height)
  const scalerMean = Number(config.scaler_mean)
  const scalerScale = Number(config.scaler_scale)

  const isValid =
    Number.isFinite(fsHz) && fsHz > 0 &&
    Number.isFinite(lowcut) && lowcut > 0 &&
    Number.isFinite(highcut) && highcut > lowcut &&
    Number.isFinite(filterOrder) && filterOrder > 0 &&
    Number.isFinite(segmentLength) && segmentLength > 1 &&
    Number.isFinite(halfWindow) && halfWindow > 0 &&
    Number.isFinite(rpeakMinDistanceSec) && rpeakMinDistanceSec > 0 &&
    Number.isFinite(rpeakMinHeight) &&
    Number.isFinite(scalerMean) &&
    Number.isFinite(scalerScale) && scalerScale !== 0

  return {
    isValid,
    values: {
      fsHz,
      lowcut,
      highcut,
      filterOrder,
      segmentLength,
      halfWindow,
      rpeakMinDistanceSec,
      rpeakMinHeight,
      scalerMean,
      scalerScale,
    },
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

// Cắt tín hiệu đã lọc thành nhiều segment quanh từng peak theo cửa sổ cấu hình.
const extractSegmentsFromPeaks = (filteredSignal, peaks, halfWindow, segmentLength) => {
  const segments = []
  for (let segmentIndex = 0; segmentIndex < peaks.length; segmentIndex += 1) {
    const peakIndex = peaks[segmentIndex]
    const start = peakIndex - halfWindow
    const end = peakIndex + halfWindow + 1
    if (start < 0 || end > filteredSignal.length) continue

    const values = filteredSignal.slice(start, end)
    if (values.length !== segmentLength) continue

    segments.push({
      segment_index: segmentIndex,
      peak_sample: peakIndex,
      start_sample: start,
      end_sample: end,
      values,
    })
  }
  return segments
}

// Chuyển danh sách segment thành mảng phẳng để tạo tensor batch cho model.
const flattenSegmentsToModelInput = (segments, segmentLength, scalerMean, scalerScale) => {
  const flat = new Float32Array(segments.length * segmentLength)
  for (let beatIndex = 0; beatIndex < segments.length; beatIndex += 1) {
    const values = segments[beatIndex].values
    for (let i = 0; i < segmentLength; i += 1) {
      flat[beatIndex * segmentLength + i] = (Number(values[i]) - scalerMean) / scalerScale
    }
  }
  return flat
}

// Trích xuất danh sách nhãn dự đoán theo từng segment từ xác suất model trả về.
const buildSegmentPredictions = (segments, probabilities, classes) => {
  const predictions = []
  for (let i = 0; i < segments.length; i += 1) {
    const row = Array.isArray(probabilities[i]) ? probabilities[i] : []
    let bestIndex = 0
    for (let j = 1; j < row.length; j += 1) {
      if (row[j] > row[bestIndex]) {
        bestIndex = j
      }
    }

    const labelCode = classes[bestIndex] || "Q"
    const confidence = Number((row[bestIndex] || 0).toFixed(6))
    predictions.push({
      segment_index: segments[i].segment_index,
      peak_sample: segments[i].peak_sample,
      start_sample: segments[i].start_sample,
      end_sample: segments[i].end_sample,
      label_code: labelCode,
      label_text: labelTextFromCode(labelCode),
      confidence,
      abnormal: !isNormalAiCode(labelCode),
    })
  }
  return predictions
}

// Gộp các segment bất thường liên tiếp cùng lớp thành một nhóm cảnh báo duy nhất.
const groupContiguousAbnormalSegments = (segmentPredictions) => {
  const groups = []
  for (const prediction of segmentPredictions) {
    if (!prediction.abnormal) continue

    const lastGroup = groups[groups.length - 1]
    const isContiguousSameClass =
      lastGroup &&
      lastGroup.label_code === prediction.label_code &&
      prediction.segment_index === lastGroup.last_segment_index + 1

    if (isContiguousSameClass) {
      lastGroup.end_sample = prediction.end_sample
      lastGroup.segment_count += 1
      lastGroup.last_segment_index = prediction.segment_index
      continue
    }

    groups.push({
      label_code: prediction.label_code,
      label_text: prediction.label_text,
      start_sample: prediction.start_sample,
      end_sample: prediction.end_sample,
      segment_count: 1,
      first_segment_index: prediction.segment_index,
      last_segment_index: prediction.segment_index,
    })
  }

  return groups.map((group) => ({
    label_code: group.label_code,
    label_text: group.label_text,
    start_sample: group.start_sample,
    end_sample: group.end_sample,
    segment_count: group.segment_count,
  }))
}

// Tạo chuỗi tóm tắt số lượng segment bất thường theo từng lớp.
const buildAiResultSummary = (segmentPredictions) => {
  const counts = new Map()
  for (const prediction of segmentPredictions) {
    if (!prediction.abnormal) continue
    counts.set(prediction.label_code, (counts.get(prediction.label_code) || 0) + 1)
  }

  if (counts.size === 0) return "Bình thường"

  const unorderedCodes = Array.from(counts.keys()).filter((code) => !isNormalAiCode(code))
  const orderedCodes = [
    ...ECG_AI_SUMMARY_ORDER.filter((code) => unorderedCodes.includes(code)),
    ...unorderedCodes
      .filter((code) => !ECG_AI_SUMMARY_ORDER.includes(code))
      .sort((a, b) => a.localeCompare(b)),
  ]

  return orderedCodes.map((code) => `${getAiLabelFromCode(code)}:${counts.get(code)}`).join(", ")
}

// Chọn nhãn đại diện cho reading để giữ tương thích field cũ label_code/label_text/confidence.
const pickPrimaryPrediction = (segmentPredictions) => {
  if (!Array.isArray(segmentPredictions) || segmentPredictions.length === 0) {
    return null
  }

  const firstAbnormal = segmentPredictions.find((item) => item.abnormal)
  return firstAbnormal || segmentPredictions[0]
}

// ===== Nhóm helper normalize input/output =====

// Chuyển input reading về mảng số hợp lệ để phục vụ preprocessing.
const parseSignalInput = (input) => {
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

  return Array.isArray(data) ? data : null
}

// Hàm làm sạch và giới hạn độ dài tín hiệu ECG để tránh lỗi runtime khi infer.
const sanitizeSignalInput = (input) => {
  const raw = parseSignalInput(input)
  if (!raw) {
    return { signal: null, inputLength: 0, truncated: false, reason: "INVALID_INPUT" }
  }

  const normalized = raw.map((value) => Number(value)).filter(Number.isFinite)
  if (normalized.length === 0) {
    return { signal: null, inputLength: 0, truncated: false, reason: "INVALID_INPUT" }
  }

  const maxSignalSamples = getMaxSignalSamples() // dài hơn thì cắt bớt
  if (normalized.length > maxSignalSamples) {
    const truncatedSignal = normalized.slice(-maxSignalSamples)
    return {
      signal: truncatedSignal,
      inputLength: truncatedSignal.length,
      truncated: true,
      reason: "INPUT_TRUNCATED",
      rawInputLength: normalized.length,
    }
  }

  return {
    signal: normalized,
    inputLength: normalized.length,
    truncated: false,
    reason: null,
  }
}

// Hàm đảm bảo preprocess_config luôn sẵn sàng khi cần lọc tín hiệu độc lập với luồng load model.
const ensurePreprocessConfigLoaded = () => {
  if (preprocessConfig) return preprocessConfig

  const paths = getModelPaths()
  const loadedConfig = readJsonFile(paths.preprocessPath)
  validatePreprocessConfig(loadedConfig)
  preprocessConfig = loadedConfig
  return preprocessConfig
}

// Map label code của model sang label text hiển thị.
const labelTextFromCode = (labelCode) => {
  if (!labelCode) return null
  const configuredLabel = String(labelMap?.[labelCode] || "").trim()
  return configuredLabel || getAiLabelFromCode(labelCode)
}

// Hàm chuẩn hóa reason code fallback để chỉ dùng tập mã đã khóa.
const normalizeFallbackReason = (reason) => {
  const normalized = String(reason || "INFER_ERROR").trim().toUpperCase()
  return AI_FALLBACK_REASON_CODES.has(normalized) ? normalized : "INFER_ERROR"
}

// Tạo kết quả skip chuẩn hóa khi không thể infer AI (giữ contract output ổn định).
const makeSkipResult = (reason, inferMs, options = {}) => {
  const normalizedReason = normalizeFallbackReason(reason)
  const labelCode = options.labelCode ?? null
  return {
    label_code: labelCode,
    label_text: labelTextFromCode(labelCode),
    confidence: null,
    abnormal_detected: labelCode ? !isNormalAiCode(labelCode) : false,
    beat_count: Number.isInteger(options.beatCount) ? options.beatCount : 0,
    segment_predictions: Array.isArray(options.segmentPredictions) ? options.segmentPredictions : [],
    abnormal_groups: Array.isArray(options.abnormalGroups) ? options.abnormalGroups : [],
    ai_result_summary: typeof options.aiResultSummary === "string" ? options.aiResultSummary : "Bình thường",
    skipped: true,
    reason: normalizedReason,
    infer_ms: inferMs,
    input_len: Number.isInteger(options.inputLength) ? options.inputLength : 0,
    input_truncated: Boolean(options.inputTruncated),
  }
}

// Hàm lọc thông dải cho một reading để lưu xuống DB với tín hiệu đã qua preprocessing.
const filterReadingSignal = (ecgSignal, options = {}) => {
  const context = String(options?.context || "unknown")
  const parsed = parseSignalInput(ecgSignal)
  if (!parsed) {
    return {
      filtered_signal: [],
      skipped: true,
      reason: "INVALID_INPUT",
      input_len: 0,
    }
  }

  const signal = parsed.map((value) => Number(value)).filter(Number.isFinite)
  if (signal.length === 0) {
    return {
      filtered_signal: [],
      skipped: true,
      reason: "INVALID_INPUT",
      input_len: 0,
    }
  }

  try {
    const config = ensurePreprocessConfigLoaded()
    const runtimeConfig = validateRuntimeNumericConfig(config || {})
    if (!runtimeConfig.isValid) {
      return {
        filtered_signal: signal,
        skipped: true,
        reason: "MODEL_NOT_READY",
        input_len: signal.length,
      }
    }

    const coeffs = buildBandpassCoefficients(config)
    const filteredSignal = applyBandpass(signal, coeffs)
      .map((value) => Number(value))
      .filter(Number.isFinite)

    if (filteredSignal.length === 0) {
      return {
        filtered_signal: signal,
        skipped: true,
        reason: "INFER_ERROR",
        input_len: signal.length,
      }
    }

    return {
      filtered_signal: filteredSignal,
      skipped: false,
      reason: null,
      input_len: signal.length,
    }
  } catch (error) {
    logAiEvent("AI_FILTER_ERROR", {
      context,
      reason: "INFER_ERROR",
      input_len: signal.length,
      fallback_applied: true,
      message: error?.message || "UNKNOWN",
    })
    return {
      filtered_signal: signal,
      skipped: true,
      reason: "INFER_ERROR",
      input_len: signal.length,
    }
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
    logAiEvent("AI_MODEL_INIT_ERROR", {
      reason: "AI_DISABLED",
      fallback_applied: true,
    })
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
      logAiEvent("AI_MODEL_INIT_OK", {
        reason: null,
        loaded: true,
        fallback_applied: false,
      })
      return { enabled: true, loaded: true }
    } catch (error) {
      logAiEvent("AI_MODEL_INIT_ERROR", {
        reason: "MODEL_INIT_FAILED",
        message: error?.message || "UNKNOWN",
        fallback_applied: true,
      })
      model = null
      isLoaded = false
      return { enabled: true, loaded: false, reason: "MODEL_INIT_FAILED" }
    } finally {
      initPromise = null
    }
  })()

  return initPromise
}

// Suy luận reading-level từ ecg_signal: preprocess -> infer beat-level -> gom nhóm bất thường -> map output.
const predictFromReading = async (ecgSignal, options = {}) => {
  const startedAt = Date.now()
  const context = String(options?.context || "unknown")

  if (!isAIEnabled()) {
    const skip = makeSkipResult("AI_DISABLED", Date.now() - startedAt)
    logAiEvent("AI_INFER_SKIP", {
      context,
      reason: skip.reason,
      infer_ms: skip.infer_ms,
      input_len: skip.input_len,
      beat_count: skip.beat_count,
      abnormal_group_count: 0,
      ai_result_summary: skip.ai_result_summary,
      fallback_applied: true,
    })
    return skip
  }

  if (!isLoaded || !model || !preprocessConfig) {
    const initResult = await initModel()
    if (!initResult.loaded || !model || !preprocessConfig) {
      const initReason = initResult?.reason || "MODEL_NOT_READY"
      const skip = makeSkipResult(initReason, Date.now() - startedAt)
      logAiEvent("AI_INFER_SKIP", {
        context,
        reason: skip.reason,
        infer_ms: skip.infer_ms,
        input_len: skip.input_len,
        beat_count: skip.beat_count,
        abnormal_group_count: 0,
        ai_result_summary: skip.ai_result_summary,
        fallback_applied: true,
      })
      return skip
    }
  }

  const runtimeConfig = validateRuntimeNumericConfig(preprocessConfig || {})
  if (!runtimeConfig.isValid) {
    const skip = makeSkipResult("MODEL_NOT_READY", Date.now() - startedAt)
    logAiEvent("AI_INFER_SKIP", {
      context,
      reason: skip.reason,
      infer_ms: skip.infer_ms,
      input_len: skip.input_len,
      beat_count: skip.beat_count,
      abnormal_group_count: 0,
      ai_result_summary: skip.ai_result_summary,
      fallback_applied: true,
    })
    return skip
  }

  const sanitized = sanitizeSignalInput(ecgSignal)
  if (!sanitized.signal) {
    const skip = makeSkipResult("INVALID_INPUT", Date.now() - startedAt, {
      inputLength: sanitized.inputLength,
      inputTruncated: sanitized.truncated,
    })
    logAiEvent("AI_INFER_SKIP", {
      context,
      reason: skip.reason,
      infer_ms: skip.infer_ms,
      input_len: skip.input_len,
      beat_count: skip.beat_count,
      abnormal_group_count: 0,
      ai_result_summary: skip.ai_result_summary,
      fallback_applied: true,
    })
    return skip
  }

  if (sanitized.truncated) {
    logAiEvent("AI_INFER_SKIP", {
      context,
      reason: "INPUT_TRUNCATED",
      infer_ms: Date.now() - startedAt,
      input_len: sanitized.inputLength,
      raw_input_len: sanitized.rawInputLength || sanitized.inputLength,
      beat_count: 0,
      abnormal_group_count: 0,
      ai_result_summary: null,
      fallback_applied: false,
    })
  }

  const signal = sanitized.signal
  const { segmentLength, halfWindow, rpeakMinDistanceSec, fsHz, rpeakMinHeight, scalerMean, scalerScale } =
    runtimeConfig.values

  if (signal.length < segmentLength) {
    const skip = makeSkipResult("SHORT_SIGNAL", Date.now() - startedAt, {
      labelCode: "Q",
      inputLength: signal.length,
      inputTruncated: sanitized.truncated,
    })
    logAiEvent("AI_INFER_SKIP", {
      context,
      reason: skip.reason,
      infer_ms: skip.infer_ms,
      input_len: skip.input_len,
      beat_count: skip.beat_count,
      abnormal_group_count: 0,
      ai_result_summary: skip.ai_result_summary,
      fallback_applied: true,
    })
    return skip
  }

  try {
    // Lọc thông dải để làm sạch tín hiệu trước khi phát hiện peak.
    const coeffs = buildBandpassCoefficients(preprocessConfig)
    const filteredSignal = applyBandpass(signal, coeffs)

    // Phát hiện peak theo cấu hình để xác định tâm mỗi segment.
    const minDistance = Math.max(1, Math.round(rpeakMinDistanceSec * fsHz))
    const peaks = detectPeaks(filteredSignal, rpeakMinHeight, minDistance)

    // Trích xuất segment 0,5s quanh từng peak.
    const segments = extractSegmentsFromPeaks(filteredSignal, peaks, halfWindow, segmentLength)
    if (segments.length === 0) {
      const skip = makeSkipResult("NO_PEAK", Date.now() - startedAt, {
        labelCode: "Q",
        inputLength: signal.length,
        inputTruncated: sanitized.truncated,
      })
      logAiEvent("AI_INFER_SKIP", {
        context,
        reason: skip.reason,
        infer_ms: skip.infer_ms,
        input_len: skip.input_len,
        beat_count: skip.beat_count,
        abnormal_group_count: 0,
        ai_result_summary: skip.ai_result_summary,
        fallback_applied: true,
      })
      return skip
    }

    // Chuẩn hóa từng segment rồi nạp vào tensor batch [số segment, 125, 1].
    const beatCount = segments.length
    const flat = flattenSegmentsToModelInput(segments, segmentLength, scalerMean, scalerScale)
    const inputTensor = tf.tensor3d(flat, [beatCount, segmentLength, 1], "float32")
    let outputTensor = model.predict(inputTensor)
    if (Array.isArray(outputTensor)) {
      outputTensor = outputTensor[0]
    }

    // Chuyển tensor xác suất sang mảng JS rồi giải phóng bộ nhớ.
    const probabilities = outputTensor.arraySync()
    inputTensor.dispose()
    outputTensor.dispose()

    const classes = Array.isArray(preprocessConfig.classes)
      ? preprocessConfig.classes
      : ECG_AI_CLASS_CODES

    // Tạo dự đoán theo từng segment, sau đó gộp nhóm bất thường liên tiếp cùng lớp.
    const segmentPredictions = buildSegmentPredictions(segments, probabilities, classes)
    const abnormalGroups = groupContiguousAbnormalSegments(segmentPredictions)
    const aiResultSummary = buildAiResultSummary(segmentPredictions)
    const primaryPrediction = pickPrimaryPrediction(segmentPredictions)
    const labelCode = primaryPrediction?.label_code || "Q"
    const labelText = primaryPrediction?.label_text || labelTextFromCode(labelCode)
    const primaryConfidence =
      typeof primaryPrediction?.confidence === "number" ? primaryPrediction.confidence : null

    const result = {
      label_code: labelCode,
      label_text: labelText,
      confidence: primaryConfidence,
      abnormal_detected: abnormalGroups.length > 0,
      beat_count: beatCount,
      segment_predictions: segmentPredictions,
      abnormal_groups: abnormalGroups,
      ai_result_summary: aiResultSummary,
      skipped: false,
      reason: null,
      infer_ms: Date.now() - startedAt,
      input_len: signal.length,
      input_truncated: sanitized.truncated,
    }

    logAiEvent("AI_INFER_OK", {
      context,
      reason: null,
      infer_ms: result.infer_ms,
      input_len: result.input_len,
      beat_count: result.beat_count,
      abnormal_group_count: abnormalGroups.length,
      ai_result_summary: aiResultSummary,
      fallback_applied: false,
    })

    return result
  } catch (error) {
    const skip = makeSkipResult("INFER_ERROR", Date.now() - startedAt, {
      labelCode: "Q",
      inputLength: signal.length,
      inputTruncated: sanitized.truncated,
    })
    logAiEvent("AI_INFER_ERROR", {
      context,
      reason: skip.reason,
      infer_ms: skip.infer_ms,
      input_len: skip.input_len,
      beat_count: skip.beat_count,
      abnormal_group_count: 0,
      ai_result_summary: skip.ai_result_summary,
      fallback_applied: true,
      message: error?.message || "UNKNOWN",
    })
    return skip
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
    : ECG_AI_CLASS_CODES
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
  filterReadingSignal,
  predictBeatSegmentsForTest,
  getModelState,
}
