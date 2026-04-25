const maskRedisUrl = (value) => {
  if (!value) return "default-localhost"

  try {
    const url = new URL(value)
    if (url.password) url.password = "***"
    if (url.username) url.username = "***"
    return url.toString()
  } catch {
    return "configured-unparseable"
  }
}

const attachRedisConnectionLogs = (connection, { source, redisUrl }) => {
  const basePayload = {
    source,
    redis_url: maskRedisUrl(redisUrl),
  }

  connection.on("connect", () => {
    console.log(JSON.stringify({
      event: "REDIS_CONNECT",
      timestamp: new Date().toISOString(),
      ...basePayload,
    }))
  })

  connection.on("ready", () => {
    console.log(JSON.stringify({
      event: "REDIS_READY",
      timestamp: new Date().toISOString(),
      ...basePayload,
    }))
  })

  connection.on("reconnecting", (delay) => {
    console.warn(JSON.stringify({
      event: "REDIS_RECONNECTING",
      timestamp: new Date().toISOString(),
      delay_ms: delay,
      ...basePayload,
    }))
  })

  connection.on("error", (error) => {
    console.error(JSON.stringify({
      event: "REDIS_ERROR",
      timestamp: new Date().toISOString(),
      reason: error?.message || "UNKNOWN",
      ...basePayload,
    }))
  })
}

module.exports = {
  attachRedisConnectionLogs,
  maskRedisUrl,
}
