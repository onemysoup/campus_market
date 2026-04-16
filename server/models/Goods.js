const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Goods = sequelize.define(
  'Goods',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    seller_id: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    category_id: { type: DataTypes.TINYINT, allowNull: false },
    condition: { type: DataTypes.TINYINT, allowNull: false },
    images: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    status: {
      type: DataTypes.ENUM('available', 'sold', 'offline'),
      allowNull: false,
      defaultValue: 'available'
    },
    review_status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    },
    rejection_reason: { type: DataTypes.STRING(255), allowNull: true },
    view_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
  },
  {
    tableName: 'goods',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

module.exports = Goods;
