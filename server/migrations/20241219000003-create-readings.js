module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("readings", {
      reading_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      device_id: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: "devices",
          key: "device_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      heart_rate: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      ecg_signal: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      abnormal_detected: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("readings")
  },
}
