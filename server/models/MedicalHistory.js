"use strict";
const { DataTypes } = require("sequelize")

module.exports = (sequelize) => {
    const MedicalHistory = sequelize.define(
        "MedicalHistory",
        {
            history_id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            user_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            doctor_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            ai_diagnosis: DataTypes.TEXT,
            doctor_diagnosis: DataTypes.TEXT,
            symptoms: DataTypes.TEXT,
            medication: DataTypes.TEXT,
            condition: DataTypes.TEXT,
            notes: DataTypes.TEXT,
            deleted_at: DataTypes.DATE,
        },
        {
            tableName: "medical_histories",
            underscored: true,
            paranoid: true, // bật soft delete
        }
    );

    MedicalHistory.associate = (models) => {
        MedicalHistory.belongsTo(models.User, { foreignKey: "user_id", as: "patient" });
        MedicalHistory.belongsTo(models.User, { foreignKey: "doctor_id", as: "doctor" });
    };

    return MedicalHistory;
};
