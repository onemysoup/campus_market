const express = require('express');
const { Op } = require('sequelize');
const { Order, Goods, User } = require('../models');
const { authRequired } = require('../middleware/auth');
const { success, fail } = require('../utils/response');

const router = express.Router();

router.post('/', authRequired, async (req, res) => {
  try {
    const { goods_id } = req.body;
    if (!goods_id) {
      return res.status(400).json(fail(400, '参数缺失'));
    }

    const goods = await Goods.findByPk(goods_id);
    if (!goods) {
      return res.status(404).json(fail(404, '商品不存在'));
    }
    if (goods.status !== 'available' || goods.review_status !== 'approved') {
      return res.status(400).json(fail(400, '商品不可购买'));
    }
    if (goods.seller_id === req.user.id) {
      return res.status(403).json(fail(403, '不能购买自己的商品'));
    }

    const existing = await Order.findOne({
      where: {
        goods_id: goods.id,
        status: { [Op.in]: ['pending', 'confirmed'] }
      }
    });
    if (existing) {
      return res.status(400).json(fail(400, '该商品已有进行中的订单'));
    }

    const order = await Order.create({
      goods_id: goods.id,
      buyer_id: req.user.id,
      seller_id: goods.seller_id,
      status: 'pending'
    });

    return res.json(success(order, '下单成功'));
  } catch (error) {
    return res.status(500).json(fail(500, '创建订单失败'));
  }
});

router.get('/buyer', authRequired, async (req, res) => {
  try {
    const list = await Order.findAll({
      where: { buyer_id: req.user.id },
      include: [
        { model: Goods, as: 'goods' },
        { model: User, as: 'seller', attributes: ['id', 'nickname', 'avatar', 'phone'] }
      ],
      order: [['updated_at', 'DESC']]
    });
    return res.json(success({ list }));
  } catch (error) {
    return res.status(500).json(fail(500, '获取买家订单失败'));
  }
});

router.get('/seller', authRequired, async (req, res) => {
  try {
    const list = await Order.findAll({
      where: { seller_id: req.user.id },
      include: [
        { model: Goods, as: 'goods' },
        { model: User, as: 'buyer', attributes: ['id', 'nickname', 'avatar', 'phone'] }
      ],
      order: [['updated_at', 'DESC']]
    });
    return res.json(success({ list }));
  } catch (error) {
    return res.status(500).json(fail(500, '获取卖家订单失败'));
  }
});

router.get('/:id', authRequired, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: Goods, as: 'goods' },
        { model: User, as: 'buyer', attributes: ['id', 'nickname', 'avatar', 'phone'] },
        { model: User, as: 'seller', attributes: ['id', 'nickname', 'avatar', 'phone'] }
      ]
    });
    if (!order) {
      return res.status(404).json(fail(404, '订单不存在'));
    }
    if (order.buyer_id !== req.user.id && order.seller_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json(fail(403, '无权限查看'));
    }
    return res.json(success(order));
  } catch (error) {
    return res.status(500).json(fail(500, '获取订单失败'));
  }
});

router.put('/:id/confirm', authRequired, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json(fail(404, '订单不存在'));
    }
    if (order.seller_id !== req.user.id) {
      return res.status(403).json(fail(403, '仅卖家可确认'));
    }
    if (order.status !== 'pending') {
      return res.status(400).json(fail(400, '当前状态不可确认'));
    }

    order.status = 'confirmed';
    await order.save();
    return res.json(success(order, '确认成功'));
  } catch (error) {
    return res.status(500).json(fail(500, '确认失败'));
  }
});

router.put('/:id/cancel', authRequired, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    const { cancel_reason } = req.body;
    if (!order) {
      return res.status(404).json(fail(404, '订单不存在'));
    }
    if (![order.buyer_id, order.seller_id].includes(req.user.id)) {
      return res.status(403).json(fail(403, '无权限取消'));
    }
    if (order.status === 'completed' || order.status === 'cancelled') {
      return res.status(400).json(fail(400, '订单已结束'));
    }

    order.status = 'cancelled';
    order.cancel_reason = cancel_reason || '用户取消';
    await order.save();
    return res.json(success(order, '取消成功'));
  } catch (error) {
    return res.status(500).json(fail(500, '取消失败'));
  }
});

router.put('/:id/complete', authRequired, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json(fail(404, '订单不存在'));
    }
    if (order.buyer_id !== req.user.id) {
      return res.status(403).json(fail(403, '仅买家可确认收货'));
    }
    if (order.status !== 'confirmed') {
      return res.status(400).json(fail(400, '当前状态不可完成'));
    }

    order.status = 'completed';
    await order.save();

    await Goods.update({ status: 'sold' }, { where: { id: order.goods_id } });

    return res.json(success(order, '交易完成'));
  } catch (error) {
    return res.status(500).json(fail(500, '确认收货失败'));
  }
});

module.exports = router;
