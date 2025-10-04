"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.bulkInsert("devices", [
            {
                device_id: "device_1",
                user_id: 1,
                serial_number: "ESP32-MOCK-01",
                status: "đang hoạt động",
                created_at: new Date("2025-10-01T17:08:16"),
                updated_at: new Date("2025-10-01T17:08:16"),
            },
        ]);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete("devices", null, {});
    },
};
