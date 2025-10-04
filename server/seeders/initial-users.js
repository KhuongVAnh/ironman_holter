"use strict";
const bcrypt = require("bcryptjs");

module.exports = {
    async up(queryInterface, Sequelize) {
        const passwordHash = await bcrypt.hash("123456", 10);

        await queryInterface.bulkInsert("users", [
            {
                user_id: 1,
                name: "Bệnh Nhân 1",
                email: "patient@gmail.com",
                password: passwordHash,
                role: "bệnh nhân",
                is_active: true,
                created_at: new Date(),
                updated_at: new Date(),
            },
            {
                user_id: 3,
                name: "doctor",
                email: "doctor@gmail.com",
                password: passwordHash,
                role: "bác sĩ",
                is_active: true,
                created_at: new Date(),
                updated_at: new Date(),
            },
            {
                user_id: 2,
                name: "family",
                email: "family@gmail.com",
                password: passwordHash,
                role: "gia đình",
                is_active: true,
                created_at: new Date(),
                updated_at: new Date(),
            },
        ]);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete("users", null, {});
    },
};
