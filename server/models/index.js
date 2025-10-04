const { Sequelize } = require("sequelize")
const config = require("../config/database")

const env = process.env.NODE_ENV || "development"
const dbConfig = config[env]

const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
  host: dbConfig.host,
  dialect: dbConfig.dialect,
  logging: dbConfig.logging,
})

// Import models
const User = require("./User")(sequelize)
const Device = require("./Device")(sequelize)
const Reading = require("./Reading")(sequelize)
const Alert = require("./Alert")(sequelize)
const Report = require("./Report")(sequelize)
const ChatLog = require("./ChatLog")(sequelize)
const AccessPermission = require("./AccessPermission")(sequelize);
const MedicalHistory = require("./MedicalHistory")(sequelize);

// Define associations
User.hasMany(Device, { foreignKey: "user_id" })
Device.belongsTo(User, { foreignKey: "user_id" })

Device.hasMany(Reading, { foreignKey: "device_id" })
Reading.belongsTo(Device, { foreignKey: "device_id" })

User.hasMany(Alert, { foreignKey: "user_id" })
Alert.belongsTo(User, { foreignKey: "user_id" })

User.hasMany(Report, { foreignKey: "user_id", as: "PatientReports" })
User.hasMany(Report, { foreignKey: "doctor_id", as: "DoctorReports" })
Report.belongsTo(User, { foreignKey: "user_id", as: "Patient" })
Report.belongsTo(User, { foreignKey: "doctor_id", as: "Doctor" })

User.hasMany(ChatLog, { foreignKey: "user_id" })
ChatLog.belongsTo(User, { foreignKey: "user_id" })

// 🔹 Liên kết AccessPermission với User
User.hasMany(AccessPermission, { foreignKey: "patient_id", as: "SharedPatients" });
User.hasMany(AccessPermission, { foreignKey: "viewer_id", as: "SharedViewers" });
AccessPermission.belongsTo(User, { foreignKey: "patient_id", as: "patient" });
AccessPermission.belongsTo(User, { foreignKey: "viewer_id", as: "viewer" });

User.hasMany(MedicalHistory, { foreignKey: "user_id", as: "PatientHistories" });
User.hasMany(MedicalHistory, { foreignKey: "doctor_id", as: "DoctorHistories" });
MedicalHistory.belongsTo(User, { foreignKey: "user_id", as: "patient" });
MedicalHistory.belongsTo(User, { foreignKey: "doctor_id", as: "doctor" });


module.exports = {
  sequelize,
  User,
  Device,
  Reading,
  Alert,
  Report,
  ChatLog,
  AccessPermission,
  MedicalHistory,
}
