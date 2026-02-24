// Controller xu ly danh sach benh nhan ma bac si duoc cap quyen theo doi.
const prisma = require("../prismaClient")

// Ham xu ly lay danh sach benh nhan duoc phep theo doi.
exports.getAccessiblePatients = async (req, res) => {
  try {
    const viewer_id = Number.parseInt(req.params.viewer_id, 10)

    const accessPermissions = await prisma.accessPermission.findMany({
      where: { viewer_id, status: "accepted" },
      include: {
        patient: {
          select: {
            user_id: true,
            name: true,
            email: true,
            is_active: true,
            created_at: true,
          },
        },
      },
    })

    return res.status(200).json(accessPermissions)
  } catch (err) {
    console.error("Lỗi getAccessiblePatients:", err)
    res.status(500).json({ error: "Lỗi khi lấy danh sách bệnh nhân" })
  }
}

// Ham xu ly lay benh su cua benh nhan duoc cap quyen.
exports.getPatientHistory = async (req, res) => {
  try {
    const patient_id = Number.parseInt(req.params.patient_id, 10)

    const histories = await prisma.medicalHistory.findMany({
      where: { user_id: patient_id, deleted_at: null },
      include: {
        doctor: { select: { user_id: true, name: true, email: true } },
      },
      orderBy: { created_at: "desc" },
    })

    return res.status(200).json(histories)
  } catch (err) {
    console.error("Lỗi getPatientHistory:", err)
    res.status(500).json({ error: "Không thể tải bệnh sử" })
  }
}

// Ham xu ly them chan doan moi cho benh su benh nhan.
exports.addDiagnosis = async (req, res) => {
  try {
    const { patient_id, doctor_id, doctor_diagnosis, medication, condition, notes } = req.body

    const newRecord = await prisma.medicalHistory.create({
      data: {
        user_id: Number.parseInt(patient_id, 10),
        doctor_id: doctor_id ? Number.parseInt(doctor_id, 10) : null,
        doctor_diagnosis,
        medication,
        condition,
        notes,
      },
    })

    return res
      .status(201)
      .json({ message: "Đã thêm bản ghi bệnh sử", data: newRecord })
  } catch (err) {
    console.error("Lỗi addDiagnosis:", err)
    res.status(500).json({ error: "Không thể thêm bản ghi" })
  }
}

// Ham xu ly an ban ghi chan doan trong benh su.
exports.deleteDiagnosis = async (req, res) => {
  try {
    const historyId = Number.parseInt(req.params.id, 10)

    await prisma.medicalHistory.update({
      where: { history_id: historyId },
      data: { deleted_at: new Date() },
    })

    res.json({ message: "Đã xóa bệnh sử" })
  } catch (err) {
    console.error("Lỗi deleteDiagnosis:", err)
    res.status(500).json({ error: "Không thể xóa" })
  }
}

// Ham xu ly cap nhat noi dung chan doan cua bac si.
exports.updateDiagnosis = async (req, res) => {
  try {
    const historyId = Number.parseInt(req.params.id, 10)
    const { doctor_diagnosis, medication, condition, notes } = req.body

    const record = await prisma.medicalHistory.findUnique({
      where: { history_id: historyId },
    })
    if (!record) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy bệnh sử cần sửa" })
    }

    const updatedRecord = await prisma.medicalHistory.update({
      where: { history_id: historyId },
      data: {
        doctor_diagnosis,
        medication,
        condition,
        notes,
      },
    })

    return res.status(200).json({
      message: "Đã cập nhật bệnh sử thành công",
      data: updatedRecord,
    })
  } catch (err) {
    console.error("Lỗi updateDiagnosis:", err)
    res.status(500).json({ error: "Không thể cập nhật bệnh sử" })
  }
}
