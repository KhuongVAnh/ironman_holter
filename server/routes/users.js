const express = require("express")
const { getAllUsers, updateUser, deleteUser, changePassword } = require("../controllers/userController")
const { authenticateToken, authorizeRoles } = require("../middleware/auth")

const router = express.Router()

// Lấy tất cả người dùng (chỉ admin)
router.get("/", authenticateToken, authorizeRoles("admin"), getAllUsers)

// Đổi mật khẩu
router.put("/change-password", authenticateToken, changePassword)

// Cập nhật người dùng
router.put("/:id", authenticateToken, updateUser)

// Xóa người dùng (chỉ admin)
router.delete("/:id", authenticateToken, authorizeRoles("admin"), deleteUser)

module.exports = router
