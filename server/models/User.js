const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nickname: { type: DataTypes.STRING(50), allowNull: false },
    phone: { type: DataTypes.STRING(11), allowNull: false, unique: true },
    password: { type: DataTypes.STRING(255), allowNull: false },
    avatar: { type: DataTypes.STRING(500), allowNull: true },
    role: {
      type: DataTypes.ENUM('buyer', 'seller', 'admin'),
      allowNull: false,
      defaultValue: 'buyer'
    },
    student_id: { type: DataTypes.STRING(30), allowNull: true },
    college: { type: DataTypes.STRING(100), allowNull: true },
    wx_openid: { type: DataTypes.STRING(100), allowNull: true, unique: true },
    is_banned: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
  },
  {
    tableName: 'users',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

module.exports = User;
