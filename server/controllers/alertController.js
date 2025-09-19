const { Alert, User } = require("../models")

const createAlert = async (req, res) => {
  try {
    const { user_id, alert_type, message } = req.body

    // Kiểm tra người dùng tồn tại
    const user = await User.findByPk(user_id)
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" })
    }

    const alert = await Alert.create({
      user_id,
      alert_type,
      message,
    })

    // Gửi cảnh báo realtime
    const io = req.app.get("io")
    io.emit("alert", {
      alert_id: alert.alert_id,
      user_id,
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

    const whereClause = { user_id }
    if (resolved !== undefined) {
      whereClause.resolved = resolved === "true"
    }

    const alerts = await Alert.findAll({
      where: whereClause,
      order: [["timestamp", "DESC"]],
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

    const alert = await Alert.findByPk(id)
    if (!alert) {
      return res.status(404).json({ message: "Không tìm thấy cảnh báo" })
    }

    await alert.update({ resolved: true })

    res.json({
      message: "Đánh dấu cảnh báo đã xử lý thành công",
      alert,
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

    const alerts = await Alert.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          attributes: ["name", "email", "role"],
        },
      ],
      order: [["timestamp", "DESC"]],
    })

    res.json({ alerts })
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
