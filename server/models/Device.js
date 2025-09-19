const { DataTypes } = require("sequelize")

module.exports = (sequelize) => {
  const Device = sequelize.define(
    "Device",
    {
      device_id: {
        type: DataTypes.STRING,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id",
        },
      },
      serial_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      status: {
        type: DataTypes.ENUM("đang hoạt động", "ngưng hoạt động"),
        defaultValue: "đang hoạt động",
      },
    },
    {
      tableName: "devices",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  )

  return Device
}
