"use strict";
const { DataTypes } = require("sequelize")

module.exports = (sequelize) => {
  const AccessPermission = sequelize.define(
    "AccessPermission",
    {
      permission_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      patient_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      viewer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM("bác sĩ", "gia đình"),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("pending", "accepted", "rejected"),
        defaultValue: "pending",
      },
    },
    {
      tableName: "access_permissions",
      underscored: true,
    }
  );

  AccessPermission.associate = (models) => {
    AccessPermission.belongsTo(models.User, {
      foreignKey: "patient_id",
      as: "patient",
    });
    AccessPermission.belongsTo(models.User, {
      foreignKey: "viewer_id",
      as: "viewer",
    });
  };

  return AccessPermission;
};
