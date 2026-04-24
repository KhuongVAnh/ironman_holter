"use strict"

const prisma = require("../prismaClient")
const { fromPrismaUserRole } = require("./enumMappings")

const ROLE_PATIENT = "bệnh nhân"
const ROLE_DOCTOR = "bác sĩ"
const ROLE_FAMILY = "gia đình"

const parseId = (value) => Number.parseInt(value, 10)

const sanitizeText = (value) => {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text || null
}

const parseOptionalDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const getRequesterContext = async (requesterId) => {
  const requester = await prisma.user.findUnique({
    where: { user_id: requesterId },
    select: { user_id: true, role: true },
  })

  if (!requester) return null

  return {
    ...requester,
    roleText: fromPrismaUserRole(requester.role),
  }
}

const hasAcceptedAccess = async (patientId, viewerId) => {
  if (patientId === viewerId) return true

  const access = await prisma.accessPermission.findFirst({
    where: {
      patient_id: patientId,
      viewer_id: viewerId,
      status: "accepted",
    },
    select: { permission_id: true },
  })

  return Boolean(access)
}

const ensureCanViewPatient = async (patientId, requesterId) => {
  const canView = await hasAcceptedAccess(patientId, requesterId)
  if (!canView) {
    const error = new Error("Bạn không có quyền xem hồ sơ y tế này")
    error.statusCode = 403
    throw error
  }
}

const ensureCanManagePatient = async (patientId, requester) => {
  if (!requester) {
    const error = new Error("Không xác thực được người dùng")
    error.statusCode = 401
    throw error
  }

  if (requester.roleText === ROLE_PATIENT && requester.user_id === patientId) return

  if (requester.roleText === ROLE_DOCTOR) {
    const canManage = await hasAcceptedAccess(patientId, requester.user_id)
    if (canManage) return
  }

  const error = new Error("Bạn không có quyền cập nhật hồ sơ y tế này")
  error.statusCode = 403
  throw error
}

const mapUserForResponse = (user) => {
  if (!user) return null
  return {
    ...user,
    role: fromPrismaUserRole(user.role),
  }
}

const handleControllerError = (res, error, fallbackMessage) => {
  if (error?.statusCode) {
    return res.status(error.statusCode).json({ error: error.message })
  }

  console.error(fallbackMessage, error)
  return res.status(500).json({ error: fallbackMessage })
}

module.exports = {
  ROLE_PATIENT,
  ROLE_DOCTOR,
  ROLE_FAMILY,
  parseId,
  sanitizeText,
  parseOptionalDate,
  getRequesterContext,
  hasAcceptedAccess,
  ensureCanViewPatient,
  ensureCanManagePatient,
  mapUserForResponse,
  handleControllerError,
}
