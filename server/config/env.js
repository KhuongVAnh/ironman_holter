const path = require("path")
const dotenv = require("dotenv")

// Quy tắc ưu tiên env:
// 1) `server/.env` là nguồn chính.
// 2) Root `.env` chỉ bổ sung key còn thiếu, không override key đã có.
dotenv.config({ path: path.resolve(__dirname, "../.env") })
dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: false })

module.exports = process.env
