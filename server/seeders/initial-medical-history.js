"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.bulkInsert("medical_histories", [
            {
                user_id: 1,
                doctor_id: 3,
                ai_diagnosis: "Rung nhĩ nhẹ",
                doctor_diagnosis: "Cần theo dõi ECG thêm 48 giờ",
                symptoms: JSON.stringify(["Mệt mỏi", "Hồi hộp"]),
                medication: "Metoprolol 25mg/ngày",
                condition: "Ổn định",
                notes: "Tái khám sau 2 tuần",
                created_at: new Date(),
                updated_at: new Date(),
            },
        ]);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete("medical_histories", null, {});
    },
};
