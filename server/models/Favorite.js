const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Favorite = sequelize.define(
  'Favorite',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    goods_id: { type: DataTypes.INTEGER, allowNull: false }
  },
  {
    tableName: 'favorites',
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [{ unique: true, fields: ['user_id', 'goods_id'] }]
  }
);

module.exports = Favorite;
