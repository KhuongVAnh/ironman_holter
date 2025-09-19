const jwt = require("jsonwebtoken")
const { User } = require("../models")

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({ message: "Token truy cập bị thiếu" })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findByPk(decoded.user_id)

    if (!user || !user.is_active) {
      return res.status(401).json({ message: "Người dùng không hợp lệ" })
    }

    req.user = user
    next()
  } catch (error) {
    return res.status(403).json({ message: "Token không hợp lệ" })
  }
}

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Chưa xác thực" })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Không có quyền truy cập" })
    }

    next()
  }
}

module.exports = {
  authenticateToken,
  authorizeRoles,
}
