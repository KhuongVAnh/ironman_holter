const jwt = require("jsonwebtoken")
const { User } = require("../models")

const authenticateToken = async (req, res, next) => {
  next();
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
