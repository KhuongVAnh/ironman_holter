"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("medical_histories", {
      history_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id",
        },
        onDelete: "CASCADE",
      },
      doctor_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
        onDelete: "SET NULL",
      },
      ai_diagnosis: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      doctor_diagnosis: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      symptoms: {
        type: Sequelize.TEXT, // sẽ lưu JSON.stringify([]) nếu nhiều triệu chứng
        allowNull: true,
      },
      medication: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      condition: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("medical_histories");
  },
};
