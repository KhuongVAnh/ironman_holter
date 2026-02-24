const prisma = require("../prismaClient")
const { NotificationType } = require("@prisma/client")
const { emitToUsers } = require("./socketEmitService")

const parseOptionalInt = (value) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) ? parsed : null
}

const normalizeRecipientIds = (userIds = []) => {
  return [...new Set(userIds.map((id) => Number.parseInt(id, 10)).filter(Number.isInteger))]
}

const createNotification = async ({
  type,
  title,
  message,
  actorId,
  entityType,
  entityId,
  payload,
  recipientUserIds,
  io,
}) => {
  try {
    const recipients = normalizeRecipientIds(recipientUserIds)
    if (!recipients.length) return null

    if (!Object.values(NotificationType).includes(type)) {
      throw new Error(`INVALID_NOTIFICATION_TYPE: ${type}`)
    }

    const notification = await prisma.notification.create({
      data: {
        type,
        title: String(title || "Thong bao"),
        message: String(message || ""),
        actor_id: parseOptionalInt(actorId),
        entity_type: entityType ? String(entityType) : null,
        entity_id: parseOptionalInt(entityId),
        payload: payload || null,
      },
    })

    await prisma.notificationRecipient.createMany({
      data: recipients.map((userId) => ({
        notification_id: notification.notification_id,
        user_id: userId,
      })),
      skipDuplicates: true,
    })

    const socketPayload = {
      notification_id: notification.notification_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      entity_type: notification.entity_type,
      entity_id: notification.entity_id,
      payload: notification.payload,
      created_at: notification.created_at,
      is_read: false,
    }

    emitToUsers(io, recipients, "notification:new", socketPayload)
    return notification
  } catch (error) {
    console.error("Loi tao notification:", error)
    return null
  }
}

module.exports = {
  createNotification,
}
