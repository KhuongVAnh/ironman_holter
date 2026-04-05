const IORedis = require("ioredis")
const { Worker } = require("bullmq")
const prisma = require("../prismaClient")
const { predictFromReading } = require("../services/ecgCnnService")
const { getRecipientIdsByPatientCached } = require("../services/telemetryRuntimeCacheService")

const connection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
})

const queueName = String(process.env.AI_QUEUE_NAME || "ecg-infer").trim() || "ecg-infer"

const FALLBACK_AI_RESULT = "Binh thuong"

// Hàm để trích xuất tóm tắt kết quả AI từ đối tượng kết quả, với giá trị mặc định nếu không có
const toAiResultSummary = (aiResult) => {
    const summary = String(aiResult?.ai_result_summary || "").trim()
    return summary || FALLBACK_AI_RESULT
}

// Hàm để trích xuất loại cảnh báo từ nhóm, với giá trị mặc định nếu không có
const getAlertTypeFromGroup = (group) => {
    const labelText = String(group?.label_text || "").trim()
    const labelCode = String(group?.label_code || "").trim()
    return labelText || labelCode || "Bat thuong"
}

// Hàm để xây dựng thông điệp cảnh báo từ nhóm bất thường và nhịp tim
const buildAlertMessageFromGroup = (group, heartRate) => {
    const alertType = getAlertTypeFromGroup(group)
    const startSample = Number(group?.start_sample)
    const endSample = Number(group?.end_sample)
    const segmentCount = Number(group?.segment_count || 1)
    return `Phát hiện ${alertType} (${segmentCount} segment). Nhịp tim ${heartRate} bpm`
}

// Hàm để đánh dấu reading là thất bại với thông điệp lỗi cụ thể
const markReadingFailed = async (readingId, errorMessage) => {
    const parsedReadingId = Number.parseInt(readingId, 10)
    if (!Number.isInteger(parsedReadingId)) return

    await prisma.reading.updateMany({
        where: { reading_id: parsedReadingId },
        data: {
            ai_status: "FAILED",
            ai_error: String(errorMessage || "UNKNOWN"),
            ai_completed_at: null,
        },
    })
}

// Hàm để tạo các bản ghi alert nhóm dựa trên các nhóm bất thường được phát hiện trong kết quả AI
const createGroupedAlerts = async (userId, readingId, heartRate, abnormalGroups) => {
    const createOps = abnormalGroups.map((group) =>
        prisma.alert.create({
            data: {
                user_id: userId,
                reading_id: readingId,
                alert_type: getAlertTypeFromGroup(group),
                message: buildAlertMessageFromGroup(group, heartRate),
                segment_start_sample: Number.isInteger(Number(group.start_sample))
                    ? Number(group.start_sample)
                    : null,
                segment_end_sample: Number.isInteger(Number(group.end_sample))
                    ? Number(group.end_sample)
                    : null,
            },
        })
    )

    return prisma.$transaction(createOps)
}

// Worker để xử lý các job AI inference cho ECG readings, 
// bao gồm cập nhật kết quả AI cho reading, phát cảnh báo mới nếu có bất thường được phát hiện, 
// và gửi notification đến người dùng liên quan.
const worker = new Worker(
    queueName,
    async (job) => {
        const {
            readingId,
            userId,
            serialNumber,
            ecgSignal,
            providedHeartRate,
            source,
        } = job.data

        try {
            const reading = await prisma.reading.findUnique({
                where: { reading_id: Number(readingId) },
                select: {
                    reading_id: true,
                    device_id: true,
                    ai_status: true,
                },
            })

            if (!reading) {
                throw new Error("READING_NOT_FOUND")
            }

            if (reading.ai_status === "DONE") {
                return {
                    readingId,
                    userId,
                    skipped: true,
                    reason: "ALREADY_DONE",
                }
            }

            const aiResult = await predictFromReading(ecgSignal, { context: source || "queue-worker" })
            const aiResultSummary = toAiResultSummary(aiResult)
            const abnormalGroups = Array.isArray(aiResult?.abnormal_groups) ? aiResult.abnormal_groups : []
            const abnormalDetected = abnormalGroups.length > 0

            const updatedReading = await prisma.reading.update({
                where: { reading_id: Number(readingId) },
                data: {
                    heart_rate: Number.isInteger(Number(providedHeartRate)) ? Number(providedHeartRate) : 0,
                    ai_result: aiResultSummary,
                    abnormal_detected: abnormalDetected,
                    ai_status: "DONE",
                    ai_error: null,
                    ai_completed_at: new Date(),
                },
            })

            let createdAlerts = []
            const recipients = await getRecipientIdsByPatientCached(userId)

            if (abnormalDetected) {
                createdAlerts = await createGroupedAlerts(
                    userId,
                    updatedReading.reading_id,
                    updatedReading.heart_rate,
                    abnormalGroups
                )

            }

            return {
                readingId: updatedReading.reading_id,
                userId,
                serialNumber: serialNumber || null,
                aiStatus: "DONE",
                aiResult: aiResultSummary,
                abnormalDetected,
                alertIds: createdAlerts.map((item) => item.alert_id),
                recipients,
                completedAt: new Date().toISOString(),
            }
        } catch (error) {
            await markReadingFailed(readingId, error?.message || "UNKNOWN")
            throw error
        }
    },
    { connection }
)

worker.on("completed", (job) => {
    console.log(JSON.stringify({
        event: "AI_JOB_COMPLETED",
        source: "ecgInferenceWorker",
        timestamp: new Date().toISOString(),
        job_id: job.id,
    }))
})

worker.on("failed", (job, error) => {
    console.error(JSON.stringify({
        event: "AI_JOB_FAILED",
        source: "ecgInferenceWorker",
        timestamp: new Date().toISOString(),
        job_id: job?.id || null,
        reason: error?.message || "UNKNOWN",
    }))
})
