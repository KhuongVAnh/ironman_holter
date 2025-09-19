const { Report, User } = require("../models")

const createReport = async (req, res) => {
  try {
    const { user_id } = req.params
    const { summary } = req.body
    const doctor_id = req.user.user_id

    // Kiểm tra bệnh nhân tồn tại
    const patient = await User.findByPk(user_id)
    if (!patient) {
      return res.status(404).json({ message: "Không tìm thấy bệnh nhân" })
    }

    const report = await Report.create({
      user_id,
      doctor_id,
      summary,
    })

    const reportWithDetails = await Report.findByPk(report.report_id, {
      include: [
        {
          model: User,
          as: "Patient",
          attributes: ["name", "email"],
        },
        {
          model: User,
          as: "Doctor",
          attributes: ["name", "email"],
        },
      ],
    })

    res.status(201).json({
      message: "Tạo báo cáo thành công",
      report: reportWithDetails,
    })
  } catch (error) {
    console.error("Lỗi tạo báo cáo:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

const getUserReports = async (req, res) => {
  try {
    const { user_id } = req.params

    const reports = await Report.findAll({
      where: { user_id },
      include: [
        {
          model: User,
          as: "Doctor",
          attributes: ["name", "email"],
        },
      ],
      order: [["created_at", "DESC"]],
    })

    res.json({ reports })
  } catch (error) {
    console.error("Lỗi lấy báo cáo:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

const getDoctorReports = async (req, res) => {
  try {
    const doctor_id = req.user.user_id

    const reports = await Report.findAll({
      where: { doctor_id },
      include: [
        {
          model: User,
          as: "Patient",
          attributes: ["name", "email"],
        },
      ],
      order: [["created_at", "DESC"]],
    })

    res.json({ reports })
  } catch (error) {
    console.error("Lỗi lấy báo cáo bác sĩ:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

module.exports = {
  createReport,
  getUserReports,
  getDoctorReports,
}
