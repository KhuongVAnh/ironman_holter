"use strict";

const { AccessPermission, User } = require("../models");

// 1️⃣ Bệnh nhân gửi yêu cầu cấp quyền
exports.shareAccess = async (req, res) => {
    try {
        const { viewer_email, role } = req.body;
        const { user_id } = req.user; // JWT decode → id của người gửi (bệnh nhân)
        const io = req.app.get("io");

        const viewer = await User.findOne({ where: { email: viewer_email } });
        if (!viewer) {
            return res.status(404).json({ error: "Không tìm thấy người dùng theo email này" });
        }

        // Kiểm tra xem đã tồn tại quyền chưa
        const existing = await AccessPermission.findOne({
            where: { patient_id: user_id, viewer_id: viewer.user_id },
        });

        if (existing) {
            return res.status(400).json({ error: "Đã gửi yêu cầu hoặc đã có quyền trước đó" });
        }

        const newPermission = await AccessPermission.create({
            patient_id: user_id,
            viewer_id: viewer.user_id,
            role,
            status: "pending",
        });

        // 🔔 Gửi socket event cho người được mời
        io.emit("access-request", {
            viewer_id: viewer.user_id,
            patient_id: user_id,
            role,
        });

        return res.status(201).json({
            message: "Đã gửi yêu cầu chia sẻ quyền truy cập",
            data: newPermission,
        });
    } catch (error) {
        console.error("Error sharing access:", error);
        return res.status(500).json({ error: "Lỗi khi chia sẻ quyền truy cập" });
    }
};

// 2️⃣ Viewer chấp nhận hoặc từ chối yêu cầu
exports.respondAccess = async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body; // accept | reject
        const io = req.app.get("io");

        const permission = await AccessPermission.findByPk(id);
        if (!permission) return res.status(404).json({ error: "Không tìm thấy yêu cầu này" });

        permission.status = action === "accept" ? "accepted" : "rejected";
        await permission.save();

        // 🔔 Thông báo realtime cho bệnh nhân
        io.emit("access-response", {
            patient_id: permission.patient_id,
            viewer_id: permission.viewer_id,
            status: permission.status,
        });

        return res.json({
            message: `Đã ${action === "accept" ? "chấp nhận" : "từ chối"} quyền truy cập`,
            data: permission,
        });
    } catch (error) {
        console.error("Error responding access:", error);
        return res.status(500).json({ error: "Lỗi xử lý yêu cầu" });
    }
};

// 3️⃣ Bệnh nhân xem danh sách người có quyền truy cập
exports.listAccess = async (req, res) => {
    try {
        const { patient_id } = req.params;

        const list = await AccessPermission.findAll({
            where: { patient_id, status: "accepted" },
            include: [
                { model: User, as: "viewer", attributes: ["user_id", "name", "email", "role"] },
            ],
        });

        return res.json(list);
    } catch (error) {
        console.error("Error listing access:", error);
        return res.status(500).json({ error: "Lỗi lấy danh sách quyền truy cập" });
    }
};

// 4️⃣ Bệnh nhân thu hồi quyền
exports.revokeAccess = async (req, res) => {
    try {
        const { id } = req.params;
        const io = req.app.get("io");

        const permission = await AccessPermission.findByPk(id);
        if (!permission) return res.status(404).json({ error: "Không tìm thấy quyền này" });

        await permission.destroy();

        io.emit("access-revoke", {
            viewer_id: permission.viewer_id,
            patient_id: permission.patient_id,
        });

        return res.json({ message: "Đã thu hồi quyền truy cập" });
    } catch (error) {
        console.error("Error revoking access:", error);
        return res.status(500).json({ error: "Lỗi khi thu hồi quyền" });
    }
};
