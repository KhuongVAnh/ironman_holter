"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("access_permissions", [
      {
        patient_id: 1,
        viewer_id: 2,
        role: "bác sĩ",
        status: "accepted",
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        patient_id: 1,
        viewer_id: 3,
        role: "gia đình",
        status: "pending",
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("access_permissions", null, {});
  },
};
