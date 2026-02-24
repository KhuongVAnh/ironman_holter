// Controller xu ly trung tam thong bao cua nguoi dung.
const { NotificationType } = require("@prisma/client")
const prisma = require("../prismaClient")

const parseId = (value) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) ? parsed : null
}

const parseIsReadFilter = (value) => {
  if (value === undefined) return undefined
  if (value === "true") return true
  if (value === "false") return false
  return null
}

const isValidType = (value) => {
  if (!value) return false
  return Object.values(NotificationType).includes(String(value))
}

// Ham xu ly lay danh sach thong bao cua user hien tai.
const getNotifications = async (req, res) => {
  try {
    const currentUserId = parseId(req.user.user_id)
    const parsedIsRead = parseIsReadFilter(req.query.is_read)
    const type = req.query.type ? String(req.query.type).toUpperCase() : undefined
    const limit = Math.min(Math.max(parseId(req.query.limit) || 20, 1), 100)
    const offset = Math.max(parseId(req.query.offset) || 0, 0)

    if (parsedIsRead === null) {
      return res.status(400).json({ message: "is_read chi nhan true hoac false" })
    }

    if (type !== undefined && !isValidType(type)) {
      return res.status(400).json({ message: "type khong hop le" })
    }

    const where = {
      user_id: currentUserId,
      ...(parsedIsRead !== undefined ? { is_read: parsedIsRead } : {}),
      ...(type ? { notification: { is: { type } } } : {}),
    }

    const rows = await prisma.notificationRecipient.findMany({
      where,
      include: {
        notification: {
          select: {
            notification_id: true,
            type: true,
            title: true,
            message: true,
            entity_type: true,
            entity_id: true,
            payload: true,
            created_at: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
      take: limit,
      skip: offset,
    })

    const notifications = rows.map((row) => ({
      notification_id: row.notification.notification_id,
      type: row.notification.type,
      title: row.notification.title,
      message: row.notification.message,
      entity_type: row.notification.entity_type,
      entity_id: row.notification.entity_id,
      payload: row.notification.payload,
      created_at: row.notification.created_at,
      is_read: row.is_read,
      read_at: row.read_at,
    }))

    return res.json({ notifications })
  } catch (error) {
    console.error("Loi lay danh sach thong bao:", error)
    return res.status(500).json({ message: "Loi server noi bo" })
  }
}

// Ham xu ly dem so thong bao chua doc cua user hien tai.
const getUnreadCount = async (req, res) => {
  try {
    const currentUserId = parseId(req.user.user_id)
    const unread_count = await prisma.notificationRecipient.count({
      where: { user_id: currentUserId, is_read: false },
    })

    return res.json({ unread_count })
  } catch (error) {
    console.error("Loi lay so thong bao chua doc:", error)
    return res.status(500).json({ message: "Loi server noi bo" })
  }
}

// Ham xu ly danh dau da doc mot thong bao cua user hien tai.
const markNotificationRead = async (req, res) => {
  try {
    const currentUserId = parseId(req.user.user_id)
    const notificationId = parseId(req.params.notification_id)

    if (!notificationId) {
      return res.status(400).json({ message: "notification_id khong hop le" })
    }

    const updated = await prisma.notificationRecipient.updateMany({
      where: {
        user_id: currentUserId,
        notification_id: notificationId,
        is_read: false,
      },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    })

    return res.json({
      message: "Danh dau da doc thanh cong",
      updated: Number(updated.count || 0),
    })
  } catch (error) {
    console.error("Loi danh dau da doc thong bao:", error)
    return res.status(500).json({ message: "Loi server noi bo" })
  }
}

// Ham xu ly danh dau da doc tat ca thong bao cua user hien tai.
const markAllNotificationsRead = async (req, res) => {
  try {
    const currentUserId = parseId(req.user.user_id)
    const updated = await prisma.notificationRecipient.updateMany({
      where: {
        user_id: currentUserId,
        is_read: false,
      },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    })

    return res.json({
      message: "Danh dau da doc tat ca thanh cong",
      updated: Number(updated.count || 0),
    })
  } catch (error) {
    console.error("Loi danh dau da doc tat ca:", error)
    return res.status(500).json({ message: "Loi server noi bo" })
  }
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
}
