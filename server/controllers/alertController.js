const prisma = require("../prismaClient")
const { fromPrismaUserRole } = require("../utils/enumMappings")
const { AccessStatus } = require("@prisma/client")
const { emitToUsers } = require("../services/socketEmitService")

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

    res.status(201).json({
      message: "Tạo cảnh báo thành công",
      alert,
    })
  } catch (error) {
    console.error("Lỗi tạo cảnh báo:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

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
