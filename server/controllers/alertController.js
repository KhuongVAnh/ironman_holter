// Controller xu ly tao, truy van va cap nhat trang thai canh bao tim mach.
const prisma = require("../prismaClient")
const { fromPrismaUserRole } = require("../utils/enumMappings")
const { AccessStatus, NotificationType } = require("@prisma/client")
const { emitToUsers } = require("../services/socketEmitService")
const { createNotification } = require("../services/notificationService")

// Ham xu ly tim cac tai khoan can nhan thong bao canh bao.
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

// Ham xu ly tao canh bao moi cho benh nhan.
const createAlert = async (req, res) => {
  try {
    const { user_id, alert_type, message } = req.body
    const userId = Number.parseInt(user_id, 10)

    const user = await prisma.user.findUnique({ where: { user_id: userId } })
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" })
    }

    const alert = await prisma.alert.create({
      data: {
        user_id: userId,
        alert_type,
        message,
      },
    })

    const io = req.app.get("io")
    const recipients = await getAlertRecipientIds(userId)
    emitToUsers(io, recipients, "alert", {
      alert_id: alert.alert_id,
      user_id: userId,
      alert_type,
      message,
      timestamp: alert.timestamp,
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
        alert_type,
        reading_id: alert.reading_id || null,
      },
      recipientUserIds: recipients,
      io,
    })

    res.status(201).json({
      message: "Tạo cảnh báo thành công",
      alert,
    })
  } catch (error) {
    console.error("Lỗi tạo cảnh báo:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

// Ham xu ly lay danh sach canh bao theo nguoi dung.
const getUserAlerts = async (req, res) => {
  try {
    const { user_id } = req.params
    const { resolved } = req.query
    const userId = Number.parseInt(user_id, 10)

    const whereClause = { user_id: userId }
    if (resolved !== undefined) {
      whereClause.resolved = resolved === "true"
    }

    const alerts = await prisma.alert.findMany({
      where: whereClause,
      orderBy: { timestamp: "desc" },
    })

    res.json({ alerts })
  } catch (error) {
    console.error("Lỗi lấy cảnh báo:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

// Ham xu ly danh dau canh bao da duoc xu ly.
const resolveAlert = async (req, res) => {
  try {
    const { id } = req.params
    const alertId = Number.parseInt(id, 10)

    const alert = await prisma.alert.findUnique({ where: { alert_id: alertId } })
    if (!alert) {
      return res.status(404).json({ message: "Không tìm thấy cảnh báo" })
    }

    const updatedAlert = await prisma.alert.update({
      where: { alert_id: alertId },
      data: { resolved: true },
    })

    res.json({
      message: "Đánh dấu cảnh báo đã xử lý thành công",
      alert: updatedAlert,
    })
  } catch (error) {
    console.error("Lỗi xử lý cảnh báo:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

// Ham xu ly lay toan bo canh bao cho quan tri.
const getAllAlerts = async (req, res) => {
  try {
    const { resolved } = req.query

    const whereClause = {}
    if (resolved !== undefined) {
      whereClause.resolved = resolved === "true"
    }

    const alerts = await prisma.alert.findMany({
      where: whereClause,
      include: {
        user: {
          select: { name: true, email: true, role: true },
        },
      },
      orderBy: { timestamp: "desc" },
    })

    const mappedAlerts = alerts.map((alert) => ({
      ...alert,
      user: alert.user
        ? {
            ...alert.user,
            role: fromPrismaUserRole(alert.user.role),
          }
        : null,
    }))

    res.json({ alerts: mappedAlerts })
  } catch (error) {
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
