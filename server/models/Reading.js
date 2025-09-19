const { DataTypes } = require("sequelize")

module.exports = (sequelize) => {
  const Reading = sequelize.define(
    "Reading",
    {
      reading_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      device_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "devices",
          key: "device_id",
        },
      },
      timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      heart_rate: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      ecg_signal: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      abnormal_detected: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "readings",
      timestamps: false,
    },
  )

  return Reading
}
