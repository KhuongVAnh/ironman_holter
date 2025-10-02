module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("readings", "ai_result", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("readings", "ai_result");
  },
};
