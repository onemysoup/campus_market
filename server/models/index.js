const sequelize = require('../config/db');
const User = require('./User');
const Goods = require('./Goods');
const Order = require('./Order');
const Favorite = require('./Favorite');
const Message = require('./Message');

User.hasMany(Goods, { foreignKey: 'seller_id', as: 'goodsList' });
Goods.belongsTo(User, { foreignKey: 'seller_id', as: 'seller' });

Goods.hasMany(Order, { foreignKey: 'goods_id', as: 'orders' });
Order.belongsTo(Goods, { foreignKey: 'goods_id', as: 'goods' });
Order.belongsTo(User, { foreignKey: 'buyer_id', as: 'buyer' });
Order.belongsTo(User, { foreignKey: 'seller_id', as: 'seller' });

Favorite.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Favorite.belongsTo(Goods, { foreignKey: 'goods_id', as: 'goods' });
User.hasMany(Favorite, { foreignKey: 'user_id', as: 'favorites' });
Goods.hasMany(Favorite, { foreignKey: 'goods_id', as: 'favUsers' });

Message.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });
Message.belongsTo(User, { foreignKey: 'receiver_id', as: 'receiver' });
Message.belongsTo(Goods, { foreignKey: 'goods_id', as: 'goods' });

module.exports = {
  sequelize,
  User,
  Goods,
  Order,
  Favorite,
  Message
};
