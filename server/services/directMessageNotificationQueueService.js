/*
 * Direct Message Notification Queue Service
 * Dịch vụ quản lý hàng đợi riêng cho notification của direct message.
 * Mục tiêu là tách đường đi tạo notification khỏi request gửi tin nhắn để cải thiện độ phản hồi của chat.
 */
require("../config/env")

const IORedis = require("ioredis")
const { Queue, QueueEvents } = require("bullmq")

const redisUrl = String(process.env.REDIS_URL || "").trim()
if (!redisUrl && process.env.NODE_ENV === "production") {
  throw new Error("REDIS_URL is required for direct message notification queue in production")
}

const connection = new IORedis(redisUrl || undefined, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

const queueName = String(process.env.DM_NOTIFY_QUEUE_NAME || "dm-notify").trim() || "dm-notify"

const directMessageNotificationQueue = new Queue(queueName, {
  connection,
  defaultJobOptions: {
    attempts: Number.parseInt(process.env.DM_NOTIFY_JOB_ATTEMPTS || "3", 10),
    backoff: {
      type: "fixed",
      delay: Number.parseInt(process.env.DM_NOTIFY_JOB_BACKOFF_MS || "2000", 10),
    },
    removeOnComplete: 500,
    removeOnFail: 500,
  },
})

const directMessageNotificationQueueEvents = new QueueEvents(queueName, { connection })

// Hàm thêm job tạo notification direct message vào queue với jobId cố định theo message_id để chống enqueue trùng.
const enqueueDirectMessageNotification = async (payload) => {
  const messageId = Number.parseInt(payload?.messageId, 10)
  if (!Number.isInteger(messageId)) {
    throw new Error("INVALID_DIRECT_MESSAGE_ID_FOR_QUEUE")
  }

  return directMessageNotificationQueue.add("direct-message-notify", payload, {
    jobId: `direct-message-${messageId}`,
  })
}

module.exports = {
  connection,
  queueName,
  directMessageNotificationQueue,
  directMessageNotificationQueueEvents,
  enqueueDirectMessageNotification,
}
