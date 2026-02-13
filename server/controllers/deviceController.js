const prisma = require("../prismaClient")
const {
  toPrismaDeviceStatus,
  fromPrismaDeviceStatus,
  fromPrismaUserRole,
} = require("../utils/enumMappings")

const registerDevice = async (req, res) => {
  try {
    const { device_id, serial_number, user_id } = req.body
    const userId = Number.parseInt(user_id, 10)

    const user = await prisma.user.findUnique({ where: { user_id: userId } })
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" })
    }

    const existingDevice = await prisma.device.findFirst({
      where: {
        OR: [{ device_id }, { serial_number }],
      },
    })

    if (existingDevice) {
      return res.status(400).json({ message: "Thiết bị đã được đăng ký" })
    }

    const device = await prisma.device.create({
      data: {
        device_id,
        serial_number,
        user_id: userId,
      },
    })

    res.status(201).json({
      message: "Đăng ký thiết bị thành công",
      device: {
        ...device,
        status: fromPrismaDeviceStatus(device.status),
      },
    })
  } catch (error) {
    console.error("Lỗi đăng ký thiết bị:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

const getUserDevices = async (req, res) => {
  try {
    const { user_id } = req.params
    const userId = Number.parseInt(user_id, 10)

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
    console.error("Lỗi lấy danh sách thiết bị:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

const updateDeviceStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const device = await prisma.device.findUnique({ where: { device_id: id } })
    if (!device) {
      return res.status(404).json({ message: "Không tìm thấy thiết bị" })
    }

    const updatedDevice = await prisma.device.update({
      where: { device_id: id },
      data: { status: toPrismaDeviceStatus(status) },
    })

    res.json({
      message: "Cập nhật trạng thái thiết bị thành công",
      device: {
        ...updatedDevice,
        status: fromPrismaDeviceStatus(updatedDevice.status),
      },
    })
  } catch (error) {
    console.error("Lỗi cập nhật thiết bị:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

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
    console.error("Lỗi lấy tất cả thiết bị:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

module.exports = {
  registerDevice,
  getUserDevices,
  updateDeviceStatus,
  getAllDevices,
}
