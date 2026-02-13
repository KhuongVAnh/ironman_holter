"use strict"

const prisma = require("../prismaClient")
const {
  toPrismaAccessRole,
  fromPrismaAccessRole,
  fromPrismaUserRole,
} = require("../utils/enumMappings")

exports.shareAccess = async (req, res) => {
  try {
    const { viewer_email, role } = req.body
    const user_id = Number.parseInt(req.user.user_id, 10)
    const io = req.app.get("io")

    const viewer = await prisma.user.findUnique({ where: { email: viewer_email } })
    if (!viewer) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy người dùng theo email này" })
    }

    const existing = await prisma.accessPermission.findFirst({
      where: { patient_id: user_id, viewer_id: viewer.user_id },
    })

    if (existing) {
      return res
        .status(400)
        .json({ error: "Đã gửi yêu cầu hoặc đã cấp quyền trước đó" })
    }

    const newPermission = await prisma.accessPermission.create({
      data: {
        patient_id: user_id,
        viewer_id: viewer.user_id,
        role: toPrismaAccessRole(role),
        status: "pending",
      },
    })

    io.emit("access-request", {
      viewer_id: viewer.user_id,
      patient_id: user_id,
      role: fromPrismaAccessRole(newPermission.role),
      permission_id: newPermission.permission_id,
    })

    return res.status(201).json({
      message: "Đã gửi yêu cầu chia sẻ quyền truy cập",
      data: {
        ...newPermission,
        role: fromPrismaAccessRole(newPermission.role),
      },
    })
  } catch (error) {
    console.error("Error sharing access:", error)
    return res.status(500).json({ error: "Lỗi khi chia sẻ quyền truy cập" })
  }
}

exports.respondAccess = async (req, res) => {
  try {
    const { id } = req.params
    const { action } = req.body
    const io = req.app.get("io")
    const permissionId = Number.parseInt(id, 10)

    const permission = await prisma.accessPermission.findUnique({
      where: { permission_id: permissionId },
    })
    if (!permission) return res.status(404).json({ error: "Không tìm thấy yêu cầu này" })

    const status = action === "accept" ? "accepted" : "rejected"

    const updatedPermission = await prisma.accessPermission.update({
      where: { permission_id: permissionId },
      data: { status },
    })

    io.emit("access-response", {
      patient_id: updatedPermission.patient_id,
      viewer_id: updatedPermission.viewer_id,
      status: updatedPermission.status,
      permission_id: updatedPermission.permission_id,
    })

    return res.json({
      message: `Đã ${action === "accept" ? "chấp nhận" : "từ chối"} quyền truy cập`,
      data: {
        ...updatedPermission,
        role: fromPrismaAccessRole(updatedPermission.role),
      },
    })
  } catch (error) {
    console.error("Error responding access:", error)
    return res.status(500).json({ error: "Lỗi xử lý yêu cầu" })
  }
}

exports.listAccess = async (req, res) => {
  try {
    const { patient_id } = req.params
    const patientId = Number.parseInt(patient_id, 10)

    const list = await prisma.accessPermission.findMany({
      where: { patient_id: patientId, status: "accepted" },
      include: {
        viewer: { select: { user_id: true, name: true, email: true, role: true } },
      },
    })

    const mapped = list.map((item) => ({
      ...item,
      role: fromPrismaAccessRole(item.role),
      viewer: item.viewer
        ? {
            ...item.viewer,
            role: fromPrismaUserRole(item.viewer.role),
          }
        : null,
    }))

    return res.json(mapped)
  } catch (error) {
    console.error("Error listing access:", error)
    return res.status(500).json({ error: "Lỗi lấy danh sách quyền truy cập" })
  }
}

exports.revokeAccess = async (req, res) => {
  try {
    const { id } = req.params
    const io = req.app.get("io")
    const permissionId = Number.parseInt(id, 10)

    const permission = await prisma.accessPermission.findUnique({
      where: { permission_id: permissionId },
    })
    if (!permission) return res.status(404).json({ error: "Không tìm thấy quyền này" })

    await prisma.accessPermission.delete({ where: { permission_id: permissionId } })

    io.emit("access-revoke", {
      viewer_id: permission.viewer_id,
      patient_id: permission.patient_id,
    })

    return res.json({ message: "Đã thu hồi quyền truy cập" })
  } catch (error) {
    console.error("Error revoking access:", error)
    return res.status(500).json({ error: "Lỗi khi thu hồi quyền" })
  }
}

exports.getPendingRequests = async (req, res) => {
  try {
    const user_id = Number.parseInt(req.user.user_id, 10)

    const requests = await prisma.accessPermission.findMany({
      where: { viewer_id: user_id, status: "pending" },
      include: {
        patient: { select: { user_id: true, name: true, email: true, role: true } },
      },
    })

    const mapped = requests.map((item) => ({
      ...item,
      role: fromPrismaAccessRole(item.role),
      patient: item.patient
        ? {
            ...item.patient,
            role: fromPrismaUserRole(item.patient.role),
          }
        : null,
    }))

    return res.json(mapped)
  } catch (error) {
    console.error("Error fetching pending access:", error)
    return res.status(500).json({ error: "Lỗi khi lấy danh sách pending" })
  }
}
