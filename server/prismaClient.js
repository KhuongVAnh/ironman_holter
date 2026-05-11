const { PrismaClient } = require("@prisma/client")

const ensureDatabaseUrl = () => {
  if (process.env.DATABASE_URL) {
    return
  }

  const host = process.env.DB_HOST
  const user = process.env.DB_USER
  const pass = process.env.DB_PASS
  const name = process.env.DB_NAME
  const dialect = (process.env.DB_DIALECT || "mysql").toLowerCase()
  const port = process.env.DB_PORT || (dialect === "postgres" || dialect === "postgresql" ? "5432" : "3306")

  if (!host || !user || !name) {
    return
  }

  const encodedUser = encodeURIComponent(user)
  const encodedPass = pass ? `:${encodeURIComponent(pass)}` : ""
  const protocol = dialect === "postgres" || dialect === "postgresql" ? "postgresql" : "mysql"
  let url = `${protocol}://${encodedUser}${encodedPass}@${host}:${port}/${name}`
  // optional: support schema via DB_SCHEMA env var
  if (process.env.DB_SCHEMA) {
    const sep = url.includes("?") ? "&" : "?"
    url = `${url}${sep}schema=${encodeURIComponent(process.env.DB_SCHEMA)}`
  }
  process.env.DATABASE_URL = url
}

ensureDatabaseUrl()

const prisma = new PrismaClient()

module.exports = prisma
