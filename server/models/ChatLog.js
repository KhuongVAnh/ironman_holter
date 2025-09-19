const { DataTypes } = require("sequelize")

module.exports = (sequelize) => {
  const ChatLog = sequelize.define(
    "ChatLog",
    {
      chat_id: {
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
      role: {
        type: DataTypes.ENUM("user", "bot"),
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "chat_logs",
      timestamps: false,
    },
  )

  return ChatLog
}
