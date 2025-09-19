const { DataTypes } = require("sequelize")

module.exports = (sequelize) => {
  const Report = sequelize.define(
    "Report",
    {
      report_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id",
        },
      },
      doctor_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
      },
      summary: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      tableName: "reports",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    },
  )

  return Report
}
