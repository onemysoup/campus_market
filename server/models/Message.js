const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Message = sequelize.define(
  'Message',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    sender_id: { type: DataTypes.INTEGER, allowNull: false },
    receiver_id: { type: DataTypes.INTEGER, allowNull: false },
    goods_id: { type: DataTypes.INTEGER, allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    is_read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
  },
  {
    tableName: 'messages',
    createdAt: 'created_at',
    updatedAt: false
  }
);

module.exports = Message;
