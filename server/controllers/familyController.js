const { AccessPermission, User, MedicalHistory } = require("../models")

// 📌 Lấy danh sách bệnh nhân mà bác sĩ được phép xem
exports.getAccessiblePatients = async (req, res) => {
    try {
        const viewer_id = req.params.viewer_id

        const AccessPermissions = await AccessPermission.findAll({
            where: { viewer_id, status: "accepted" },
            include: [
                {
                    model: User,
                    as: "patient",
                    attributes: ["user_id", "name", "email"],
                },
            ],
        })

        return res.status(200).json(AccessPermissions)
    } catch (err) {
        console.error("Lỗi getAccessiblePatients:", err)
        res.status(500).json({ error: "Lỗi khi lấy danh sách bệnh nhân" })
    }
}

// 📌 Lấy bệnh sử của một bệnh nhân cụ thể
exports.getPatientHistory = async (req, res) => {
    try {
        const { patient_id } = req.params;

        const histories = await MedicalHistory.findAll({
            where: { user_id: patient_id },
            include: [
                { model: User, as: "doctor", attributes: ["user_id", "name", "email"] }, // ✅ alias phải trùng với model
            ],
            order: [["created_at", "DESC"]],
        });

        return res.status(200).json(histories);
    } catch (err) {
        console.error("Lỗi getPatientHistory:", err);
        res.status(500).json({ error: "Không thể tải bệnh sử" });
    }
};
