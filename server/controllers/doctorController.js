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


// 📌 Thêm chẩn đoán mới
exports.addDiagnosis = async (req, res) => {
    try {
        const { patient_id, doctor_id, doctor_diagnosis, medication, condition, notes } = req.body

        const newRecord = await MedicalHistory.create({
            user_id: patient_id,
            doctor_id,
            doctor_diagnosis,
            medication,
            condition,
            notes,
        })

        return res.status(201).json({ message: "Đã thêm bản ghi bệnh sử", data: newRecord })
    } catch (err) {
        console.error("Lỗi addDiagnosis:", err)
        res.status(500).json({ error: "Không thể thêm bản ghi" })
    }
}

// 📌 Xóa bản ghi bệnh sử
exports.deleteDiagnosis = async (req, res) => {
    try {
        const { id } = req.params
        await MedicalHistory.destroy({ where: { history_id: id } })
        res.json({ message: "Đã xóa bệnh sử" })
    } catch (err) {
        console.error("Lỗi deleteDiagnosis:", err)
        res.status(500).json({ error: "Không thể xóa" })
    }
}

// 📌 Cập nhật bản ghi bệnh sử
exports.updateDiagnosis = async (req, res) => {
    try {
        const { id } = req.params
        const { doctor_diagnosis, medication, condition, notes } = req.body

        const record = await MedicalHistory.findByPk(id)
        if (!record) {
            return res.status(404).json({ error: "Không tìm thấy bệnh sử cần sửa" })
        }

        await record.update({
            doctor_diagnosis,
            medication,
            condition,
            notes,
        })

        return res.status(200).json({
            message: "Đã cập nhật bệnh sử thành công",
            data: record,
        })
    } catch (err) {
        console.error("Lỗi updateDiagnosis:", err)
        res.status(500).json({ error: "Không thể cập nhật bệnh sử" })
    }
}
