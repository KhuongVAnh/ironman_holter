// Controller xử lý danh sách bệnh nhân mà người thân được cấp quyền theo dõi.
const prisma = require("../prismaClient")
const { parseId, requireRouteViewerMatchesRequester } = require("../utils/accessControl")

// Hàm xử lý lấy danh sách bệnh nhân được phép theo dõi.
exports.getAccessiblePatients = async (req, res) => {
  try {
    const viewer_id = parseId(req.params.viewer_id)

    if (!Number.isInteger(viewer_id)) {
      return res.status(400).json({ error: "viewer_id không hợp lệ" })
    }

    requireRouteViewerMatchesRequester(viewer_id, req.user)

    const accessPermissions = await prisma.accessPermission.findMany({
      where: { viewer_id, status: "accepted" },
      include: {
        patient: { select: { user_id: true, name: true, email: true } },
      },
    })

    return res.status(200).json(accessPermissions)
  } catch (err) {
    if (err?.statusCode) {
      return res.status(err.statusCode).json({ error: err.message })
    }
    console.error("Lỗi getAccessiblePatients:", err)
    res.status(500).json({ error: "Lỗi khi lấy danh sách bệnh nhân" })
  }
}

