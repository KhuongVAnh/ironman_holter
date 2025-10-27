'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    // thêm cột reading_id vào alerts
    await queryInterface.addColumn('alerts', 'reading_id', {
      type: Sequelize.INTEGER,
    });

    // 🔹 Tạo khóa ngoại liên kết với bảng Devices
    await queryInterface.addConstraint('alerts', {
      fields: ['reading_id'],
      type: 'foreign key',
      name: 'fk_readings', // tên constraint
      references: {
        table: 'readings',
        field: 'reading_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE', // hoặc 'SET NULL' nếu muốn giữ record khi xóa device
    });
  },
  

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeConstraint('alerts', 'fk_readings');
    await queryInterface.removeColumn('alerts', 'reading_id');
  }
};
