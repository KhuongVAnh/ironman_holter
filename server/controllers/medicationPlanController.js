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

const includePlan = {
  user: { select: { user_id: true, name: true, email: true, role: true } },
  doctor: { select: { user_id: true, name: true, email: true, role: true } },
  medications: { orderBy: { medication_id: "asc" } },
}

const mapPlanForResponse = (plan) => ({
  ...plan,
  user: mapUserForResponse(plan.user),
  doctor: mapUserForResponse(plan.doctor),
})

const normalizeTimes = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeText(item)).filter(Boolean)
  }

  if (typeof value === "string") {
    return value.split(/\r?\n|,/).map((item) => sanitizeText(item)).filter(Boolean)
  }

  return []
}

const buildMedicationData = (medications) => {
  if (!Array.isArray(medications)) return []

  return medications.map((item) => {
    const name = sanitizeText(item.name)
    const dosage = sanitizeText(item.dosage)
    const times = normalizeTimes(item.times)

    if (!name || !dosage || times.length === 0) {
      const error = new Error("Mỗi thuốc cần có tên, liều dùng và thời điểm uống")
      error.statusCode = 400
      throw error
    }

    return {
      name,
      dosage,
      times,
      type: sanitizeText(item.type),
      description: sanitizeText(item.description),
    }
  })
}

const buildPlanData = (body) => {
  const title = sanitizeText(body.title)
  if (!title) {
    const error = new Error("Tên kế hoạch thuốc không được để trống")
    error.statusCode = 400
    throw error
  }

  const startDate = parseOptionalDate(body.start_date)
  if (!startDate) {
    const error = new Error("start_date không hợp lệ")
    error.statusCode = 400
    throw error
  }

  const endDate = parseOptionalDate(body.end_date)
  if (body.end_date && !endDate) {
    const error = new Error("end_date không hợp lệ")
    error.statusCode = 400
    throw error
  }

  return {
    title,
    start_date: startDate,
    end_date: endDate,
    notes: sanitizeText(body.notes),
    is_active: body.is_active === undefined ? true : Boolean(body.is_active),
  }
}

exports.getPlansByPatient = async (req, res) => {
  try {
    const requesterId = parseId(req.user.user_id)
    const userId = parseId(req.params.userId)

    if (!Number.isInteger(userId)) {
      return res.status(400).json({ error: "userId không hợp lệ" })
    }

    await ensureCanViewPatient(userId, requesterId)

    const plans = await prisma.medicationPlan.findMany({
      where: { user_id: userId },
      include: includePlan,
      orderBy: [{ is_active: "desc" }, { start_date: "desc" }],
    })

    return res.json(plans.map(mapPlanForResponse))
  } catch (error) {
    return handleControllerError(res, error, "Lỗi khi tải kế hoạch thuốc")
  }
}

exports.createPlan = async (req, res) => {
  try {
    const requesterId = parseId(req.user.user_id)
    const requester = await getRequesterContext(requesterId)
    const targetUserId = requester?.roleText === ROLE_DOCTOR ? parseId(req.body.user_id ?? req.body.patient_id) : requesterId

    if (!Number.isInteger(targetUserId)) {
      return res.status(400).json({ error: "user_id không hợp lệ" })
    }

    await ensureCanManagePatient(targetUserId, requester)

    const medicationData = buildMedicationData(req.body.medications)
    const plan = await prisma.medicationPlan.create({
      data: {
        user_id: targetUserId,
        doctor_id: requester?.roleText === ROLE_DOCTOR ? requesterId : null,
        ...buildPlanData(req.body),
        medications: medicationData.length ? { create: medicationData } : undefined,
      },
      include: includePlan,
    })

    return res.status(201).json({
      message: "Đã thêm kế hoạch thuốc",
      data: mapPlanForResponse(plan),
    })
  } catch (error) {
    return handleControllerError(res, error, "Lỗi khi thêm kế hoạch thuốc")
  }
}

exports.updatePlan = async (req, res) => {
  try {
    const requesterId = parseId(req.user.user_id)
    const planId = parseId(req.params.planId)
    const requester = await getRequesterContext(requesterId)

    const currentPlan = await prisma.medicationPlan.findUnique({
      where: { plan_id: planId },
      select: { plan_id: true, user_id: true },
    })

    if (!currentPlan) {
      return res.status(404).json({ error: "Không tìm thấy kế hoạch thuốc" })
    }

    await ensureCanManagePatient(currentPlan.user_id, requester)

    const medicationData = buildMedicationData(req.body.medications)
    const plan = await prisma.$transaction(async (tx) => {
      await tx.medication.deleteMany({ where: { plan_id: planId } })
      return tx.medicationPlan.update({
        where: { plan_id: planId },
        data: {
          ...buildPlanData(req.body),
          ...(requester?.roleText === ROLE_DOCTOR ? { doctor_id: requesterId } : {}),
          medications: medicationData.length ? { create: medicationData } : undefined,
        },
        include: includePlan,
      })
    })

    return res.json({
      message: "Đã cập nhật kế hoạch thuốc",
      data: mapPlanForResponse(plan),
    })
  } catch (error) {
    return handleControllerError(res, error, "Lỗi khi cập nhật kế hoạch thuốc")
  }
}

exports.deletePlan = async (req, res) => {
  try {
    const requesterId = parseId(req.user.user_id)
    const planId = parseId(req.params.planId)
    const requester = await getRequesterContext(requesterId)

    const currentPlan = await prisma.medicationPlan.findUnique({
      where: { plan_id: planId },
      select: { plan_id: true, user_id: true },
    })

    if (!currentPlan) {
      return res.status(404).json({ error: "Không tìm thấy kế hoạch thuốc" })
    }

    await ensureCanManagePatient(currentPlan.user_id, requester)

    await prisma.medicationPlan.delete({ where: { plan_id: planId } })

    return res.json({ message: "Đã xóa kế hoạch thuốc" })
  } catch (error) {
    return handleControllerError(res, error, "Lỗi khi xóa kế hoạch thuốc")
  }
}
