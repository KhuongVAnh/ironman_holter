const { User } = require("../models")
const bcrypt = require("bcrypt")

const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ["password_hash"] },
      order: [["created_at", "DESC"]],
    })

    res.json({ users })
  } catch (error) {
    console.error("Lỗi lấy danh sách người dùng:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

const updateUser = async (req, res) => {
  try {
    const { id } = req.params
    const { name, email, role, is_active } = req.body

    const user = await User.findByPk(id)
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" })
    }

    // Kiểm tra email trùng lặp (nếu thay đổi email)
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } })
      if (existingUser) {
        return res.status(400).json({ message: "Email đã được sử dụng" })
      }
    }

    await user.update({
      name: name || user.name,
      email: email || user.email,
      role: role || user.role,
      is_active: is_active !== undefined ? is_active : user.is_active,
    })

    const updatedUser = await User.findByPk(id, {
      attributes: { exclude: ["password_hash"] },
    })

    res.json({
      message: "Cập nhật người dùng thành công",
      user: updatedUser,
    })
  } catch (error) {
    console.error("Lỗi cập nhật người dùng:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params

    const user = await User.findByPk(id)
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" })
    }

    // Không cho phép xóa chính mình
    if (user.user_id === req.user.user_id) {
      return res.status(400).json({ message: "Không thể xóa chính mình" })
    }

    await user.destroy()

    res.json({ message: "Xóa người dùng thành công" })
  } catch (error) {
    console.error("Lỗi xóa người dùng:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const userId = req.user.user_id

    const user = await User.findByPk(userId)
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" })
    }

    // Kiểm tra mật khẩu hiện tại
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash)
    if (!isValidPassword) {
      return res.status(400).json({ message: "Mật khẩu hiện tại không đúng" })
    }

    // Mã hóa mật khẩu mới
    const saltRounds = 10
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds)

    await user.update({ password_hash: newPasswordHash })

    res.json({ message: "Đổi mật khẩu thành công" })
  } catch (error) {
    console.error("Lỗi đổi mật khẩu:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

module.exports = {
  getAllUsers,
  updateUser,
  deleteUser,
  changePassword,
}
