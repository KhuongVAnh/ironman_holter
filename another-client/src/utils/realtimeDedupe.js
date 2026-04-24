import { toast } from "react-toastify"

const DEFAULT_TTL_MS = 10000
const MAX_SEEN_KEYS = 300
const seenEvents = new Map()

const now = () => Date.now()

const pruneSeenEvents = (currentTime = now()) => {
  if (seenEvents.size <= MAX_SEEN_KEYS) return

  for (const [key, expiresAt] of seenEvents.entries()) {
    if (expiresAt <= currentTime || seenEvents.size > MAX_SEEN_KEYS) {
      seenEvents.delete(key)
    }
  }
}

export const shouldProcessRealtimeEvent = (key, ttlMs = DEFAULT_TTL_MS) => {
  if (!key) return true

  const currentTime = now()
  const expiresAt = seenEvents.get(key)
  if (expiresAt && expiresAt > currentTime) {
    return false
  }

  seenEvents.set(key, currentTime + ttlMs)
  pruneSeenEvents(currentTime)
  return true
}

export const showToastOnce = (key, type, message, options = {}, ttlMs = DEFAULT_TTL_MS) => {
  if (!message || !shouldProcessRealtimeEvent(`toast:${key}`, ttlMs)) return false

  const toastOptions = {
    toastId: key,
    ...options,
  }

  const toastFn = toast[type] || toast.info
  toastFn(message, toastOptions)
  return true
}

export const buildNotificationKey = (notification = {}) => {
  if (notification.notification_id) return `notification:${notification.notification_id}`
  return [
    "notification",
    notification.type || "unknown-type",
    notification.entity_type || "unknown-entity",
    notification.entity_id || "unknown-id",
    notification.created_at || "unknown-time",
  ].join(":")
}

export const buildReadingAiKey = (payload = {}) => {
  return [
    "reading-ai",
    payload.reading_id || "unknown-reading",
    payload.ai_status || "unknown-status",
  ].join(":")
}

export const buildAlertKey = (alertData = {}) => {
  const alertIds = Array.isArray(alertData.alerts)
    ? alertData.alerts.map((alert) => alert?.alert_id).filter(Boolean).sort().join(",")
    : ""

  return [
    "alert",
    alertData.reading_id || "unknown-reading",
    alertIds || "no-alert-id",
    Number(alertData.abnormal_count) || 0,
  ].join(":")
}

export const buildAccessEventKey = (eventName, payload = {}) => {
  return [
    eventName,
    payload.permission_id || payload.access_id || "unknown-permission",
    payload.patient_id || "unknown-patient",
    payload.viewer_id || "unknown-viewer",
    payload.status || "unknown-status",
  ].join(":")
}
