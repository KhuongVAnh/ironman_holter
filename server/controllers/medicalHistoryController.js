"use strict"

const prisma = require("../prismaClient")
const { fromPrismaUserRole } = require("../utils/enumMappings")

exports.getHistories = async (req, res) => {
  try {
    const { user_id } = req.params
    const requester_id = Number.parseInt(req.user.user_id, 10)
    const userId = Number.parseInt(user_id, 10)

    const access = await prisma.accessPermission.findFirst({
      where: {
        patient_id: userId,
        viewer_id: requester_id,
        status: "accepted",
      },
    })

    if (userId !== requester_id && !access) {
      return res
        .status(403)
        .json({ error: "Bạn không có quyền xem bệnh sử này" })
    }

    const histories = await prisma.medicalHistory.findMany({
      where: { user_id: userId, deleted_at: null },
      include: {
        doctor: { select: { user_id: true, name: true, email: true, role: true } },
      },
      orderBy: { created_at: "desc" },
    })

    const mappedHistories = histories.map((history) => ({
      ...history,
      doctor: history.doctor
        ? {
            ...history.doctor,
            role: fromPrismaUserRole(history.doctor.role),
          }
        : null,
    }))

    return res.json(mappedHistories)
  } catch (error) {
    console.error("Error fetching medical histories:", error)
    return res.status(500).json({ error: "Lỗi khi tải bệnh sử" })
  }
}

exports.createHistory = async (req, res) => {
  try {
    const { user_id, doctor_diagnosis, medication, condition, notes } = req.body
    const doctor_id = Number.parseInt(req.user.user_id, 10)

    const newHistory = await prisma.medicalHistory.create({
      data: {
        user_id: Number.parseInt(user_id, 10),
        doctor_id,
        doctor_diagnosis,
        medication,
        condition,
        notes,
      },
    })

    const io = req.app.get("io")
    io.emit("new-history", { user_id, doctor_id })

    return res.status(201).json({
      message: "Thêm bệnh sử thành công",
      data: newHistory,
    })
  } catch (error) {
    console.error("Error creating medical history:", error)
    return res.status(500).json({ error: "Lỗi khi thêm bệnh sử" })
  }
}

exports.updateHistory = async (req, res) => {
  try {
    const { id } = req.params
    const { doctor_diagnosis, medication, condition, notes } = req.body
    const historyId = Number.parseInt(id, 10)

    const history = await prisma.medicalHistory.findUnique({
      where: { history_id: historyId },
    })
    if (!history) return res.status(404).json({ error: "Không tìm thấy bệnh sử" })

    const updatedHistory = await prisma.medicalHistory.update({
      where: { history_id: historyId },
      data: { doctor_diagnosis, medication, condition, notes },
    })

    const io = req.app.get("io")
    io.emit("update-history", { history_id: historyId })

    return res.json({ message: "Cập nhật bệnh sử thành công", data: updatedHistory })
  } catch (error) {
    console.error("Error updating medical history:", error)
    return res.status(500).json({ error: "Lỗi khi cập nhật bệnh sử" })
  }
}

exports.addSymptom = async (req, res) => {
  try {
    const { id } = req.params
    const { symptom } = req.body
    const historyId = Number.parseInt(id, 10)

    const history = await prisma.medicalHistory.findUnique({
      where: { history_id: historyId },
    })
    if (!history) return res.status(404).json({ error: "Không tìm thấy bệnh sử" })

    let symptoms = []
    if (history.symptoms) {
      try {
        symptoms = JSON.parse(history.symptoms)
      } catch (error) {
        symptoms = []
      }
    }
    symptoms.push(symptom)

    const updatedHistory = await prisma.medicalHistory.update({
      where: { history_id: historyId },
      data: { symptoms: JSON.stringify(symptoms) },
    })

    return res.json({ message: "Đã thêm triệu chứng", data: updatedHistory })
  } catch (error) {
    console.error("Error adding symptom:", error)
    return res.status(500).json({ error: "Lỗi khi thêm triệu chứng" })
  }
}

exports.updateAIResult = async (req, res) => {
  try {
    const { id } = req.params
    const { ai_diagnosis } = req.body
    const historyId = Number.parseInt(id, 10)

    const history = await prisma.medicalHistory.findUnique({
      where: { history_id: historyId },
    })
    if (!history) return res.status(404).json({ error: "Không tìm thấy bệnh sử" })

    const updatedHistory = await prisma.medicalHistory.update({
      where: { history_id: historyId },
      data: { ai_diagnosis },
    })

    const io = req.app.get("io")
    io.emit("ai-diagnosis", { history_id: historyId, ai_diagnosis })

    return res.json({ message: "Đã cập nhật chẩn đoán AI", data: updatedHistory })
  } catch (error) {
    console.error("Error updating AI diagnosis:", error)
    return res.status(500).json({ error: "Lỗi khi cập nhật AI diagnosis" })
  }
}

exports.deleteHistory = async (req, res) => {
  try {
    const { id } = req.params
    const requester_id = Number.parseInt(req.user.user_id, 10)
    const historyId = Number.parseInt(id, 10)

    const history = await prisma.medicalHistory.findUnique({
      where: { history_id: historyId },
    })
    if (!history) return res.status(404).json({ error: "Không tìm thấy bản ghi" })

    if (history.user_id !== requester_id && history.doctor_id !== requester_id) {
      return res.status(403).json({ error: "Không có quyền xóa bệnh sử này" })
    }

    await prisma.medicalHistory.update({
      where: { history_id: historyId },
      data: { deleted_at: new Date() },
    })

    return res.json({ message: "Đã xóa (ẩn) bệnh sử" })
  } catch (error) {
    console.error("Error deleting history:", error)
    return res.status(500).json({ error: "Lỗi khi xóa bệnh sử" })
  }
}
