// Controller xu ly dang ky va quan ly trang thai thiet bi theo doi.
const prisma = require("../prismaClient")
const {
  toPrismaDeviceStatus,
  fromPrismaDeviceStatus,
  fromPrismaUserRole,
} = require("../utils/enumMappings")

// Ham xu ly dang ky thiet bi moi cho benh nhan.
const registerDevice = async (req, res) => {
  try {
    const { serial_number, user_id } = req.body
    const requesterId = Number.parseInt(req.user?.user_id, 10)
    const requesterRole = req.user?.role
    const isAdmin = requesterRole === "admin"

    const normalizedSerial = typeof serial_number === "string" ? serial_number.trim() : ""

    if (!normalizedSerial) {
      return res.status(400).json({ message: "serial_number la bat buoc" })
    }

    if (!Number.isInteger(requesterId)) {
      return res.status(401).json({ message: "Nguoi dung chua duoc xac thuc" })
    }

    const requestedUserId = Number.parseInt(user_id, 10)
    const targetUserId = isAdmin ? requestedUserId : requesterId

    if (!Number.isInteger(targetUserId)) {
      return res.status(400).json({ message: "user_id khong hop le" })
    }

    if (!isAdmin && Number.isInteger(requestedUserId) && requestedUserId !== requesterId) {
      return res.status(403).json({ message: "Ban chi duoc dang ky thiet bi cho tai khoan cua minh" })
    }

    const user = await prisma.user.findUnique({ where: { user_id: targetUserId } })
    if (!user) {
      return res.status(404).json({ message: "Khong tim thay nguoi dung" })
    }

    const existingDevice = await prisma.device.findFirst({
      where: {
        serial_number: normalizedSerial,
      },
    })

    if (existingDevice) {
      return res.status(400).json({ message: "Thiet bi da duoc dang ky" })
    }

    const device = await prisma.device.create({
      data: {
        serial_number: normalizedSerial,
        user_id: targetUserId,
      },
    })

    res.status(201).json({
      message: "Dang ky thiet bi thanh cong",
      device: {
        ...device,
        status: fromPrismaDeviceStatus(device.status),
      },
    })
  } catch (error) {
    console.error("Loi dang ky thiet bi:", error)
    res.status(500).json({ message: "Loi server noi bo" })
  }
}

// Ham xu ly lay danh sach thiet bi cua nguoi dung.
const getUserDevices = async (req, res) => {
  try {
    const { user_id } = req.params
    const userId = Number.parseInt(user_id, 10)
    const requesterId = Number.parseInt(req.user?.user_id, 10)
    const isAdmin = req.user?.role === "admin"

    if (!Number.isInteger(userId)) {
      return res.status(400).json({ message: "user_id khong hop le" })
    }

    if (!isAdmin && requesterId !== userId) {
      return res.status(403).json({ message: "Khong co quyen truy cap danh sach thiet bi nay" })
    }

    const devices = await prisma.device.findMany({
      where: { user_id: userId },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { created_at: "desc" },
    })

    const mappedDevices = devices.map((device) => ({
      ...device,
      status: fromPrismaDeviceStatus(device.status),
    }))

    res.json({ devices: mappedDevices })
  } catch (error) {
    console.error("Loi lay danh sach thiet bi:", error)
    res.status(500).json({ message: "Loi server noi bo" })
  }
}

// Ham xu ly cap nhat trang thai hoat dong cua thiet bi.
const updateDeviceStatus = async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    const { status } = req.body

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "device_id khong hop le" })
    }

    const device = await prisma.device.findUnique({ where: { device_id: id } })
    if (!device) {
      return res.status(404).json({ message: "Khong tim thay thiet bi" })
    }

    const updatedDevice = await prisma.device.update({
      where: { device_id: id },
      data: { status: toPrismaDeviceStatus(status) },
    })

    res.json({
      message: "Cap nhat trang thai thiet bi thanh cong",
      device: {
        ...updatedDevice,
        status: fromPrismaDeviceStatus(updatedDevice.status),
      },
    })
  } catch (error) {
    console.error("Loi cap nhat thiet bi:", error)
    res.status(500).json({ message: "Loi server noi bo" })
  }
}

// Ham xu ly lay danh sach tat ca thiet bi cho quan tri.
const getAllDevices = async (req, res) => {
  try {
    const devices = await prisma.device.findMany({
      include: {
        user: {
          select: { name: true, email: true, role: true },
        },
      },
      orderBy: { created_at: "desc" },
    })

    const mappedDevices = devices.map((device) => ({
      ...device,
      status: fromPrismaDeviceStatus(device.status),
      user: device.user
        ? {
            ...device.user,
            role: fromPrismaUserRole(device.user.role),
          }
        : null,
    }))

    res.json({ devices: mappedDevices })
  } catch (error) {
    console.error("Loi lay tat ca thiet bi:", error)
    res.status(500).json({ message: "Loi server noi bo" })
  }
}

module.exports = {
  registerDevice,
  getUserDevices,
  updateDeviceStatus,
  getAllDevices,
}
