"use strict";

const { MedicalHistory, AccessPermission, User } = require("../models");
const { Op } = require("sequelize");

// 🔹 1. Lấy toàn bộ bệnh sử của bệnh nhân (theo user_id)
exports.getHistories = async (req, res) => {
    try {
        const { user_id } = req.params;
        const requester_id = req.user.user_id;

        // Kiểm tra quyền truy cập
        const access = await AccessPermission.findOne({
            where: {
                patient_id: user_id,
                viewer_id: requester_id,
                status: "accepted",
            },
        });

        // Nếu không phải chính bệnh nhân, cũng không được cấp quyền → từ chối
        if (parseInt(user_id) !== requester_id && !access) {
            return res.status(403).json({ error: "Bạn không có quyền xem bệnh sử này" });
        }

        const histories = await MedicalHistory.findAll({
            where: { user_id, deleted_at: null },
            include: [
                { model: User, as: "doctor", attributes: ["user_id", "name", "email", "role"] },
            ],
            order: [["created_at", "DESC"]],
        });

        return res.json(histories);
    } catch (error) {
        console.error("Error fetching medical histories:", error);
        return res.status(500).json({ error: "Lỗi khi tải bệnh sử" });
    }
};

// 🔹 2. Bác sĩ thêm bản ghi bệnh sử mới
exports.createHistory = async (req, res) => {
    try {
        const { user_id, doctor_diagnosis, medication, condition, notes } = req.body;
        const doctor_id = req.user.user_id;

        const newHistory = await MedicalHistory.create({
            user_id,
            doctor_id,
            doctor_diagnosis,
            medication,
            condition,
            notes,
        });

        // Emit socket event nếu có
        const io = req.app.get("io");
        io.emit("new-history", { user_id, doctor_id });

        return res.status(201).json({
            message: "Thêm bệnh sử thành công",
            data: newHistory,
        });
    } catch (error) {
        console.error("Error creating medical history:", error);
        return res.status(500).json({ error: "Lỗi khi thêm bệnh sử" });
    }
};

// 🔹 3. Bác sĩ cập nhật bệnh sử (tình trạng / thuốc / chẩn đoán)
exports.updateHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const { doctor_diagnosis, medication, condition, notes } = req.body;

        const history = await MedicalHistory.findByPk(id);
        if (!history) return res.status(404).json({ error: "Không tìm thấy bệnh sử" });

        await history.update({ doctor_diagnosis, medication, condition, notes });

        const io = req.app.get("io");
        io.emit("update-history", { history_id: id });

        return res.json({ message: "Cập nhật bệnh sử thành công", data: history });
    } catch (error) {
        console.error("Error updating medical history:", error);
        return res.status(500).json({ error: "Lỗi khi cập nhật bệnh sử" });
    }
};

// 🔹 4. Bệnh nhân thêm triệu chứng
exports.addSymptom = async (req, res) => {
    try {
        const { id } = req.params;
        const { symptom } = req.body;
        const history = await MedicalHistory.findByPk(id);

        if (!history) return res.status(404).json({ error: "Không tìm thấy bệnh sử" });

        let symptoms = [];
        if (history.symptoms) {
            symptoms = JSON.parse(history.symptoms);
        }
        symptoms.push(symptom);

        await history.update({ symptoms: JSON.stringify(symptoms) });

        return res.json({ message: "Đã thêm triệu chứng", data: history });
    } catch (error) {
        console.error("Error adding symptom:", error);
        return res.status(500).json({ error: "Lỗi khi thêm triệu chứng" });
    }
};

// 🔹 5. AI cập nhật chẩn đoán
exports.updateAIResult = async (req, res) => {
    try {
        const { id } = req.params;
        const { ai_diagnosis } = req.body;

        const history = await MedicalHistory.findByPk(id);
        if (!history) return res.status(404).json({ error: "Không tìm thấy bệnh sử" });

        await history.update({ ai_diagnosis });

        const io = req.app.get("io");
        io.emit("ai-diagnosis", { history_id: id, ai_diagnosis });

        return res.json({ message: "Đã cập nhật chẩn đoán AI", data: history });
    } catch (error) {
        console.error("Error updating AI diagnosis:", error);
        return res.status(500).json({ error: "Lỗi khi cập nhật AI diagnosis" });
    }
};

// 🔹 6. Xóa (soft delete)
exports.deleteHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const requester_id = req.user.user_id;

        const history = await MedicalHistory.findByPk(id);
        if (!history) return res.status(404).json({ error: "Không tìm thấy bản ghi" });

        // Chỉ bệnh nhân hoặc bác sĩ được xóa
        if (history.user_id !== requester_id && history.doctor_id !== requester_id) {
            return res.status(403).json({ error: "Không có quyền xóa bệnh sử này" });
        }

        await history.destroy(); // vì dùng paranoid: true → soft delete

        return res.json({ message: "Đã xóa (ẩn) bệnh sử" });
    } catch (error) {
        console.error("Error deleting history:", error);
        return res.status(500).json({ error: "Lỗi khi xóa bệnh sử" });
    }
};
