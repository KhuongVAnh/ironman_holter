const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const { User } = require("../models")

const generateToken = (user) => {
  return jwt.sign(
    {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "24h" },
  )
}

const register = async (req, res) => {
  try {
    const { name, email, password, role = "bệnh nhân" } = req.body

    // Kiểm tra email đã tồn tại
    const existingUser = await User.findOne({ where: { email } })
    if (existingUser) {
      return res.status(400).json({ message: "Email đã được sử dụng" })
    }

    // Mã hóa mật khẩu
    const saltRounds = 10
    const password_hash = await bcrypt.hash(password, saltRounds)

    // Tạo người dùng mới
    const user = await User.create({
      name,
      email,
      password_hash,
      role,
    })

    // Tạo token
    const token = generateToken(user)

    res.status(201).json({
      message: "Đăng ký thành công",
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Lỗi đăng ký:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

const login = async (req, res) => {
  try {
    const { email, password } = req.body

    // Tìm người dùng
    const user = await User.findOne({ where: { email } })
    if (!user) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" })
    }

    // Kiểm tra tài khoản có hoạt động
    if (!user.is_active) {
      return res.status(401).json({ message: "Tài khoản đã bị vô hiệu hóa" })
    }

    // Kiểm tra mật khẩu
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" })
    }

    // Tạo token
    const token = generateToken(user)

    res.json({
      message: "Đăng nhập thành công",
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Lỗi đăng nhập:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.user_id, {
      attributes: { exclude: ["password_hash"] },
    })

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" })
    }

    res.json({ user })
  } catch (error) {
    console.error("Lỗi lấy thông tin người dùng:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

module.exports = {
  register,
  login,
  getMe,
}
