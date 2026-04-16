const express = require('express');
const { Op } = require('sequelize');
const { User, Goods, Order } = require('../models');
const { authRequired, requireAdmin } = require('../middleware/auth');
const { success, fail } = require('../utils/response');

const router = express.Router();

router.use(authRequired, requireAdmin);

router.get('/users', async (_, res) => {
  try {
    const list = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']]
    });
    return res.json(success({ list }));
  } catch (error) {
    return res.status(500).json(fail(500, '获取用户列表失败'));
  }
});

router.put('/users/:id/toggle', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json(fail(404, '用户不存在'));
    }
    if (user.role === 'admin') {
      return res.status(400).json(fail(400, '管理员账号不可封禁'));
    }

    user.is_banned = !user.is_banned;
    await user.save();
    return res.json(success({ id: user.id, is_banned: user.is_banned }, '操作成功'));
  } catch (error) {
    return res.status(500).json(fail(500, '操作失败'));
  }
});

router.get('/goods/pending', async (_, res) => {
  try {
    const list = await Goods.findAll({
      where: { review_status: 'pending' },
      order: [['created_at', 'DESC']]
    });
    return res.json(success({ list }));
  } catch (error) {
    return res.status(500).json(fail(500, '获取待审核商品失败'));
  }
});

router.put('/goods/:id/review', async (req, res) => {
  try {
    const { action, reason } = req.body;
    const goods = await Goods.findByPk(req.params.id);
    if (!goods) {
      return res.status(404).json(fail(404, '商品不存在'));
    }

    if (action === 'approve') {
      goods.review_status = 'approved';
      goods.rejection_reason = null;
    } else if (action === 'reject') {
      goods.review_status = 'rejected';
      goods.status = 'offline';
      goods.rejection_reason = reason || '审核未通过';
    } else if (action === 'delete') {
      await goods.destroy();
      return res.json(success({ id: Number(req.params.id) }, '删除成功'));
    } else {
      return res.status(400).json(fail(400, '无效操作'));
    }

    await goods.save();
    return res.json(success(goods, '审核完成'));
  } catch (error) {
    return res.status(500).json(fail(500, '审核失败'));
  }
});

router.get('/stats', async (req, res) => {
  try {
    const { type = 'day', start, end } = req.query;
    const where = {};

    if (start && end) {
      where.created_at = { [Op.between]: [new Date(start), new Date(end)] };
    } else {
      const now = Date.now();
      const ranges = {
        day: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000
      };
      where.created_at = { [Op.gte]: new Date(now - (ranges[type] || ranges.day)) };
    }

    const [userCount, goodsCount, orderCount, doneCount, completedOrders] = await Promise.all([
      User.count({ where }),
      Goods.count({ where }),
      Order.count({ where }),
      Order.count({ where: { ...where, status: 'completed' } }),
      Order.findAll({
        where: { ...where, status: 'completed' },
        include: [{ association: 'goods', attributes: ['price'] }]
      })
    ]);

    const totalAmount = completedOrders.reduce((sum, item) => {
      return sum + Number(item.goods?.price || 0);
    }, 0);

    return res.json(
      success({
        type,
        userCount,
        goodsCount,
        orderCount,
        doneCount,
        totalAmount: Number(totalAmount.toFixed(2))
      })
    );
  } catch (error) {
    return res.status(500).json(fail(500, '获取统计失败'));
  }
});

module.exports = router;
