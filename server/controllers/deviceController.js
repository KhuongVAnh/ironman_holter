const { Device, User } = require("../models")

const registerDevice = async (req, res) => {
  try {
    const { device_id, serial_number, user_id } = req.body

    // Kiểm tra người dùng tồn tại
    const user = await User.findByPk(user_id)
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" })
    }

    // Kiểm tra device_id và serial_number đã tồn tại
    const existingDevice = await Device.findOne({
      where: {
        $or: [{ device_id }, { serial_number }],
      },
    })

    if (existingDevice) {
      return res.status(400).json({ message: "Thiết bị đã được đăng ký" })
    }

    const device = await Device.create({
      device_id,
      serial_number,
      user_id,
    })

    res.status(201).json({
      message: "Đăng ký thiết bị thành công",
      device,
    })
  } catch (error) {
    console.error("Lỗi đăng ký thiết bị:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

const getUserDevices = async (req, res) => {
  try {
    const { user_id } = req.params

    const devices = await Device.findAll({
      where: { user_id },
      include: [
        {
          model: User,
          attributes: ["name", "email"],
        },
      ],
      order: [["created_at", "DESC"]],
    })

    res.json({ devices })
  } catch (error) {
    console.error("Lỗi lấy danh sách thiết bị:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

const updateDeviceStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const device = await Device.findByPk(id)
    if (!device) {
      return res.status(404).json({ message: "Không tìm thấy thiết bị" })
    }

    await device.update({ status })

    res.json({
      message: "Cập nhật trạng thái thiết bị thành công",
      device,
    })
  } catch (error) {
    console.error("Lỗi cập nhật thiết bị:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

const getAllDevices = async (req, res) => {
  try {
    const devices = await Device.findAll({
      include: [
        {
          model: User,
          attributes: ["name", "email", "role"],
        },
      ],
      order: [["created_at", "DESC"]],
    })

    res.json({ devices })
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
