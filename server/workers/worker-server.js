/**
 * Worker Server
 * File này khởi tạo và chạy cả 2 worker (ECG Inference + Direct Message Notification)
 * trên một server duy nhất để deploy lên Render (free tier không hỗ trợ worker).
 */

require("../config/env")

const express = require("express")
const { ecgInferenceWorker } = require("./ecgInferenceWorker")
const { directMessageNotificationWorker } = require("./directMessageNotificationWorker")
// 2 worker tự chạy background ngay khi import(không cần khởi tạo thêm)
const app = express()
const PORT = process.env.PORT + 1 || 3001 + 1 // Worker server chạy trên port sau port của web server chính

// Health check endpoint để Render có thể monitor
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    workers: {
      ecgInference: "running",
      directMessageNotification: "running",
    },
  })
})

// Liveness probe
app.get("/live", (req, res) => {
  res.status(200).send("OK")
})

// Readiness probe
app.get("/ready", (req, res) => {
  res.status(200).send("OK")
})

// Start server
const server = app.listen(PORT, () => {
  console.log(JSON.stringify({
    event: "WORKER_SERVER_STARTED",
    timestamp: new Date().toISOString(),
    port: PORT,
    node_env: process.env.NODE_ENV || "development",
  }))
})

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log(JSON.stringify({
    event: "WORKER_SERVER_SHUTDOWN_SIGNAL",
    timestamp: new Date().toISOString(),
    signal: "SIGTERM",
  }))

  // Close server
  server.close(async () => {
    console.log(JSON.stringify({
      event: "WORKER_SERVER_HTTP_CLOSED",
      timestamp: new Date().toISOString(),
    }))

    try {
      // Close workers
      await ecgInferenceWorker.close()
      console.log(JSON.stringify({
        event: "ECG_WORKER_CLOSED",
        timestamp: new Date().toISOString(),
      }))

      await directMessageNotificationWorker.close()
      console.log(JSON.stringify({
        event: "DM_NOTIFICATION_WORKER_CLOSED",
        timestamp: new Date().toISOString(),
      }))

      process.exit(0)
    } catch (error) {
      console.error(JSON.stringify({
        event: "WORKER_SHUTDOWN_ERROR",
        timestamp: new Date().toISOString(),
        reason: error?.message || "UNKNOWN",
      }))
      process.exit(1)
    }
  })

  // Force exit after 30s
  setTimeout(() => {
    console.error(JSON.stringify({
      event: "WORKER_SERVER_FORCE_EXIT",
      timestamp: new Date().toISOString(),
      reason: "Shutdown timeout exceeded",
    }))
    process.exit(1)
  }, 30000)
})

process.on("SIGINT", () => {
  console.log(JSON.stringify({
    event: "WORKER_SERVER_SHUTDOWN_SIGNAL",
    timestamp: new Date().toISOString(),
    signal: "SIGINT",
  }))
  process.kill(process.pid, "SIGTERM")
})
