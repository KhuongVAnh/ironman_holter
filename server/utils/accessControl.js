"use strict"

const { AccessStatus } = require("@prisma/client")
const prisma = require("../prismaClient")

const ROLE_ADMIN = "admin"
const ROLE_DOCTOR = "bác sĩ"
const ROLE_FAMILY = "gia đình"

const parseId = (value) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) ? parsed : null
}

const isAdminUser = (user) => user?.role === ROLE_ADMIN

const hasAcceptedAccess = async (patientId, viewerId) => {
  if (!Number.isInteger(patientId) || !Number.isInteger(viewerId)) return false
  if (patientId === viewerId) return true

  const access = await prisma.accessPermission.findFirst({
    where: {
      patient_id: patientId,
      viewer_id: viewerId,
      status: AccessStatus.accepted,
    },
    select: { permission_id: true },
  })

  return Boolean(access)
}

const canViewPatient = async (patientId, requester) => {
  const requesterId = parseId(requester?.user_id)
  if (!Number.isInteger(patientId) || !Number.isInteger(requesterId)) return false
  if (isAdminUser(requester)) return true
  return hasAcceptedAccess(patientId, requesterId)
}

const ensureCanViewPatient = async (patientId, requester, message = "Bạn không có quyền xem dữ liệu này") => {
  const allowed = await canViewPatient(patientId, requester)
  if (!allowed) {
    const error = new Error(message)
    error.statusCode = 403
    throw error
  }
}

const getAccessiblePatientIds = async (requester) => {
  const requesterId = parseId(requester?.user_id)
  if (!Number.isInteger(requesterId)) return []
  if (isAdminUser(requester)) return null

  const rows = await prisma.accessPermission.findMany({
    where: {
      viewer_id: requesterId,
      status: AccessStatus.accepted,
    },
    select: { patient_id: true },
  })

  return rows.map((item) => item.patient_id)
}

const requireRouteViewerMatchesRequester = (viewerId, requester, message = "Không có quyền truy cập dữ liệu này") => {
  const requesterId = parseId(requester?.user_id)
  if (isAdminUser(requester)) return
  if (Number.isInteger(viewerId) && viewerId === requesterId) return

  const error = new Error(message)
  error.statusCode = 403
  throw error
}

module.exports = {
  ROLE_ADMIN,
  ROLE_DOCTOR,
  ROLE_FAMILY,
  parseId,
  isAdminUser,
  hasAcceptedAccess,
  canViewPatient,
  ensureCanViewPatient,
  getAccessiblePatientIds,
  requireRouteViewerMatchesRequester,
}
