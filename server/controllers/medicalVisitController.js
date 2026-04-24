"use strict"

const prisma = require("../prismaClient")
const {
  ROLE_DOCTOR,
  parseId,
  sanitizeText,
  parseOptionalDate,
  getRequesterContext,
  ensureCanViewPatient,
  ensureCanManagePatient,
  mapUserForResponse,
  handleControllerError,
} = require("../utils/medicalRecordAccess")

const includeUsers = {
  patient: { select: { user_id: true, name: true, email: true, role: true } },
  doctor: { select: { user_id: true, name: true, email: true, role: true } },
}

const mapVisitForResponse = (visit) => ({
  ...visit,
  patient: mapUserForResponse(visit.patient),
  doctor: mapUserForResponse(visit.doctor),
})

const buildVisitData = (body) => {
  const diagnosis = sanitizeText(body.diagnosis)
  if (!diagnosis) {
    const error = new Error("Chẩn đoán không được để trống")
    error.statusCode = 400
    throw error
  }

  const visitDate = body.visit_date ? parseOptionalDate(body.visit_date) : undefined
  if (body.visit_date && !visitDate) {
    const error = new Error("visit_date không hợp lệ")
    error.statusCode = 400
    throw error
  }

  return {
    facility: sanitizeText(body.facility),
    doctor_name: sanitizeText(body.doctor_name),
    ...(visitDate ? { visit_date: visitDate } : {}),
    diagnosis,
    reason: sanitizeText(body.reason),
    diagnosis_details: sanitizeText(body.diagnosis_details),
    tests: body.tests === undefined ? undefined : body.tests,
    prescription: body.prescription === undefined ? undefined : body.prescription,
    advice: sanitizeText(body.advice),
    appointment: sanitizeText(body.appointment),
  }
}

exports.getVisitsByPatient = async (req, res) => {
  try {
    const requesterId = parseId(req.user.user_id)
    const userId = parseId(req.params.userId)

    if (!Number.isInteger(userId)) {
      return res.status(400).json({ error: "userId không hợp lệ" })
    }

    await ensureCanViewPatient(userId, requesterId)

    const visits = await prisma.medicalVisit.findMany({
      where: { user_id: userId, deleted_at: null },
      include: includeUsers,
      orderBy: { visit_date: "desc" },
    })

    return res.json(visits.map(mapVisitForResponse))
  } catch (error) {
    return handleControllerError(res, error, "Lỗi khi tải lịch sử khám chữa bệnh")
  }
}

exports.createVisit = async (req, res) => {
  try {
    const requesterId = parseId(req.user.user_id)
    const requester = await getRequesterContext(requesterId)
    const targetUserId = requester?.roleText === ROLE_DOCTOR ? parseId(req.body.user_id ?? req.body.patient_id) : requesterId

    if (!Number.isInteger(targetUserId)) {
      return res.status(400).json({ error: "user_id không hợp lệ" })
    }

    await ensureCanManagePatient(targetUserId, requester)

    const visit = await prisma.medicalVisit.create({
      data: {
        user_id: targetUserId,
        doctor_id: requester?.roleText === ROLE_DOCTOR ? requesterId : null,
        ...buildVisitData(req.body),
      },
      include: includeUsers,
    })

    return res.status(201).json({
      message: "Đã thêm lần khám",
      data: mapVisitForResponse(visit),
    })
  } catch (error) {
    return handleControllerError(res, error, "Lỗi khi thêm lần khám")
  }
}

exports.updateVisit = async (req, res) => {
  try {
    const requesterId = parseId(req.user.user_id)
    const visitId = parseId(req.params.visitId)
    const requester = await getRequesterContext(requesterId)

    const currentVisit = await prisma.medicalVisit.findUnique({
      where: { visit_id: visitId },
      select: { visit_id: true, user_id: true, deleted_at: true },
    })

    if (!currentVisit || currentVisit.deleted_at) {
      return res.status(404).json({ error: "Không tìm thấy lần khám" })
    }

    await ensureCanManagePatient(currentVisit.user_id, requester)

    const visit = await prisma.medicalVisit.update({
      where: { visit_id: visitId },
      data: {
        ...buildVisitData(req.body),
        ...(requester?.roleText === ROLE_DOCTOR ? { doctor_id: requesterId } : {}),
      },
      include: includeUsers,
    })

    return res.json({
      message: "Đã cập nhật lần khám",
      data: mapVisitForResponse(visit),
    })
  } catch (error) {
    return handleControllerError(res, error, "Lỗi khi cập nhật lần khám")
  }
}

exports.deleteVisit = async (req, res) => {
  try {
    const requesterId = parseId(req.user.user_id)
    const visitId = parseId(req.params.visitId)
    const requester = await getRequesterContext(requesterId)

    const currentVisit = await prisma.medicalVisit.findUnique({
      where: { visit_id: visitId },
      select: { visit_id: true, user_id: true, deleted_at: true },
    })

    if (!currentVisit || currentVisit.deleted_at) {
      return res.status(404).json({ error: "Không tìm thấy lần khám" })
    }

    await ensureCanManagePatient(currentVisit.user_id, requester)

    await prisma.medicalVisit.update({
      where: { visit_id: visitId },
      data: { deleted_at: new Date() },
    })

    return res.json({ message: "Đã xóa lần khám" })
  } catch (error) {
    return handleControllerError(res, error, "Lỗi khi xóa lần khám")
  }
}
