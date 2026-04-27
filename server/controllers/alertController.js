// Controller xử lý tạo, truy vấn và cập nhật trạng thái cảnh báo tim mạch.
const prisma = require("../prismaClient")
const { fromPrismaUserRole } = require("../utils/enumMappings")
const { AccessStatus, NotificationType } = require("@prisma/client")
const { emitToUsers } = require("../services/socketEmitService")
const { createNotification } = require("../services/notificationService")
const { ensureCanViewPatient, getAccessiblePatientIds, isAdminUser, parseId } = require("../utils/accessControl")

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

const parsePagingParams = (query = {}) => {
  const requestedLimit = Number.parseInt(query.limit, 10)
  const requestedOffset = Number.parseInt(query.offset, 10)

  return {
    limit: Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), MAX_LIMIT) : DEFAULT_LIMIT,
    offset: Number.isInteger(requestedOffset) ? Math.max(requestedOffset, 0) : 0,
  }
}

const buildPagedResult = ({ items, total, limit, offset, key = "alerts" }) => ({
  [key]: items,
  total,
  limit,
  offset,
  has_more: offset + items.length < total,
})

const buildAlertSummary = async (baseWhereClause) => {
  const [total, unresolved, resolved] = await Promise.all([
    prisma.alert.count({ where: baseWhereClause }),
    prisma.alert.count({ where: { ...baseWhereClause, resolved: false } }),
    prisma.alert.count({ where: { ...baseWhereClause, resolved: true } }),
  ])

  return { total, unresolved, resolved }
}

// Hàm xử lý tìm các tài khoản cần nhận thông báo cảnh báo.
const getAlertRecipientIds = async (patientId) => {
  const viewers = await prisma.accessPermission.findMany({
    where: {
      patient_id: patientId,
      status: AccessStatus.accepted,
    },
    select: { viewer_id: true },
  })

  return [patientId, ...viewers.map((item) => item.viewer_id)]
}

// Hàm xử lý tạo cảnh báo mới cho bệnh nhân.
const createAlert = async (req, res) => {
  try {
    const { user_id, reading_id, alert_type, message, segment_start_sample, segment_end_sample } = req.body
    const userId = parseId(user_id)
    const readingId = parseId(reading_id)
    const segmentStartSample = Number.isInteger(Number(segment_start_sample))
      ? Number(segment_start_sample)
      : null
    const segmentEndSample = Number.isInteger(Number(segment_end_sample))
      ? Number(segment_end_sample)
      : null

    if (!Number.isInteger(userId)) {
      return res.status(400).json({ message: "user_id la bat buoc va phai hop le" })
    }

    if (!Number.isInteger(readingId)) {
      return res.status(400).json({ message: "reading_id la bat buoc va phai hop le" })
    }

    if (!alert_type || !message) {
      return res.status(400).json({ message: "alert_type va message la bat buoc" })
    }

    const user = await prisma.user.findUnique({ where: { user_id: userId } })
    if (!user) {
      return res.status(404).json({ message: "Khong tim thay nguoi dung" })
    }

    const reading = await prisma.reading.findUnique({
      where: { reading_id: readingId },
      include: {
        device: {
          select: { user_id: true },
        },
      },
    })

    if (!reading) {
      return res.status(404).json({ message: "Khong tim thay reading" })
    }

    if (reading.device.user_id !== userId) {
      return res.status(400).json({ message: "reading_id khong thuoc user_id duoc chon" })
    }

    await ensureCanViewPatient(userId, req.user, "Bạn không có quyền tạo cảnh báo cho bệnh nhân này")

    const alert = await prisma.alert.create({
      data: {
        user_id: userId,
        reading_id: readingId,
        alert_type,
        message,
        segment_start_sample: segmentStartSample,
        segment_end_sample: segmentEndSample,
      },
    })

    const io = req.app.get("io")
    const recipients = await getAlertRecipientIds(userId)
    emitToUsers(io, recipients, "alert", {
      reading_id: readingId,
      user_id: userId,
      abnormal_count: 1,
      ai_result_summary: alert_type,
      alert_type,
      message,
      timestamp: alert.timestamp,
      alerts: [
        {
          alert_id: alert.alert_id,
          user_id: userId,
          reading_id: readingId,
          alert_type,
          message,
          segment_start_sample: alert.segment_start_sample,
          segment_end_sample: alert.segment_end_sample,
          timestamp: alert.timestamp,
        },
      ],
    })

    await createNotification({
      type: NotificationType.ALERT,
      title: "Canh bao suc khoe",
      message,
      actorId: req.user?.user_id,
      entityType: "alert",
      entityId: alert.alert_id,
      payload: {
        user_id: userId,
        reading_id: alert.reading_id,
        abnormal_count: 1,
        ai_result_summary: alert_type,
        alerts: [
          {
            alert_id: alert.alert_id,
            alert_type,
            message,
            segment_start_sample: alert.segment_start_sample,
            segment_end_sample: alert.segment_end_sample,
            timestamp: alert.timestamp,
          },
        ],
      },
      recipientUserIds: recipients,
      io,
    })

    res.status(201).json({
      message: "Tạo cảnh báo thành công",
      alert,
    })
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ message: error.message })
    }
    console.error("Lỗi tạo cảnh báo:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

// Hàm xử lý lấy danh sách cảnh báo theo người dùng.
const getUserAlerts = async (req, res) => {
  try {
    const { user_id } = req.params
    const { resolved } = req.query
    const { limit, offset } = parsePagingParams(req.query)
    const userId = parseId(user_id)

    if (!Number.isInteger(userId)) {
      return res.status(400).json({ message: "user_id khong hop le" })
    }

    await ensureCanViewPatient(userId, req.user, "Bạn không có quyền xem cảnh báo này")

    const whereClause = { user_id: userId }
    if (resolved !== undefined) {
      whereClause.resolved = resolved === "true"
    }

    const [summary, total, alerts] = await Promise.all([
      buildAlertSummary({ user_id: userId }),
      prisma.alert.count({ where: whereClause }),
      prisma.alert.findMany({
        where: whereClause,
        orderBy: { timestamp: "desc" },
        take: limit,
        skip: offset,
      }),
    ])

    res.json({
      ...buildPagedResult({ items: alerts, total, limit, offset }),
      summary,
    })
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ message: error.message })
    }
    console.error("Lỗi lấy cảnh báo:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

// Hàm xử lý đánh dấu cảnh báo đã được xử lý.
const resolveAlert = async (req, res) => {
  try {
    const { id } = req.params
    const alertId = parseId(id)

    if (!Number.isInteger(alertId)) {
      return res.status(400).json({ message: "alert_id khong hop le" })
    }

    const alert = await prisma.alert.findUnique({ where: { alert_id: alertId } })
    if (!alert) {
      return res.status(404).json({ message: "Không tìm thấy cảnh báo" })
    }

    await ensureCanViewPatient(alert.user_id, req.user, "Bạn không có quyền xử lý cảnh báo này")

    const updatedAlert = await prisma.alert.update({
      where: { alert_id: alertId },
      data: { resolved: true },
    })

    res.json({
      message: "Đánh dấu cảnh báo đã xử lý thành công",
      alert: updatedAlert,
    })
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ message: error.message })
    }
    console.error("Lỗi xử lý cảnh báo:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

// Hàm xử lý lấy toàn bộ cảnh báo cho quản trị.
const getAllAlerts = async (req, res) => {
  try {
    const { resolved } = req.query
    const { limit, offset } = parsePagingParams(req.query)

    const whereClause = {}
    if (resolved !== undefined) {
      whereClause.resolved = resolved === "true"
    }

    if (!isAdminUser(req.user)) {
      const patientIds = await getAccessiblePatientIds(req.user)
      if (!patientIds.length) {
        return res.json({
          ...buildPagedResult({ items: [], total: 0, limit, offset }),
          summary: { total: 0, unresolved: 0, resolved: 0 },
        })
      }
      whereClause.user_id = { in: patientIds }
    }

    const [summary, total, alerts] = await Promise.all([
      buildAlertSummary(whereClause),
      prisma.alert.count({ where: whereClause }),
      prisma.alert.findMany({
        where: whereClause,
        include: {
          user: {
            select: { name: true, email: true, role: true },
          },
        },
        orderBy: { timestamp: "desc" },
        take: limit,
        skip: offset,
      }),
    ])

    const mappedAlerts = alerts.map((alert) => ({
      ...alert,
      user: alert.user
        ? {
          ...alert.user,
          role: fromPrismaUserRole(alert.user.role),
        }
        : null,
    }))

    res.json({
      ...buildPagedResult({ items: mappedAlerts, total, limit, offset }),
      summary,
    })
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ message: error.message })
    }
    console.error("Lỗi lấy tất cả cảnh báo:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

module.exports = {
  createAlert,
  getUserAlerts,
  resolveAlert,
  getAllAlerts,
}
