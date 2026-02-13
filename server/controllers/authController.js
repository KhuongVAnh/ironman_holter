const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const prisma = require("../prismaClient")
const { toPrismaUserRole, fromPrismaUserRole } = require("../utils/enumMappings")

const generateToken = (user) => {
  return jwt.sign(
    {
      user_id: user.user_id,
      email: user.email,
      role: fromPrismaUserRole(user.role),
    },
    process.env.JWT_SECRET,
    { expiresIn: "24h" },
  )
}

const register = async (req, res) => {
  try {
    const { name, email, password, role = "bệnh nhân" } = req.body

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(400).json({ message: "Email đã được sử dụng" })
    }

    const saltRounds = 10
    const password_hash = await bcrypt.hash(password, saltRounds)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password_hash,
        role: toPrismaUserRole(role),
      },
    })

    const token = generateToken(user)

    res.status(201).json({
      message: "Đăng ký thành công",
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: fromPrismaUserRole(user.role),
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

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" })
    }

    if (!user.is_active) {
      return res.status(401).json({ message: "Tài khoản đã bị vô hiệu hóa" })
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" })
    }

    const token = generateToken(user)

    res.json({
      message: "Đăng nhập thành công",
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: fromPrismaUserRole(user.role),
      },
    })
  } catch (error) {
    console.error("Lỗi đăng nhập:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { user_id: Number.parseInt(req.user.user_id, 10) },
      select: {
        user_id: true,
        name: true,
        email: true,
        role: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    })

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" })
    }

    res.json({
      user: {
        ...user,
        role: fromPrismaUserRole(user.role),
      },
    })
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
