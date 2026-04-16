const express = require('express');
const { Op } = require('sequelize');
const { Goods, User, Favorite } = require('../models');
const { authRequired } = require('../middleware/auth');
const { success, fail } = require('../utils/response');

const router = express.Router();

function buildSort(sort) {
  if (sort === 'price_asc') return [['price', 'ASC']];
  if (sort === 'price_desc') return [['price', 'DESC']];
  if (sort === 'view_desc') return [['view_count', 'DESC']];
  return [['created_at', 'DESC']];
}

router.get('/', async (req, res) => {
  try {
    const {
      keyword,
      categoryId,
      priceMin,
      priceMax,
      condition,
      sort,
      page = 1,
      pageSize = 10
    } = req.query;

    const where = {
      review_status: 'approved',
      status: { [Op.ne]: 'offline' }
    };

    if (keyword) where.title = { [Op.like]: `%${keyword}%` };
    if (categoryId) where.category_id = Number(categoryId);
    if (condition) where.condition = Number(condition);
    if (priceMin || priceMax) {
      where.price = {};
      if (priceMin) where.price[Op.gte] = Number(priceMin);
      if (priceMax) where.price[Op.lte] = Number(priceMax);
    }

    const offset = (Number(page) - 1) * Number(pageSize);
    const { rows, count } = await Goods.findAndCountAll({
      where,
      offset,
      limit: Number(pageSize),
      order: buildSort(sort),
      include: [{ model: User, as: 'seller', attributes: ['id', 'nickname', 'avatar', 'college'] }]
    });

    return res.json(
      success({
        list: rows,
        total: count,
        page: Number(page),
        pageSize: Number(pageSize)
      })
    );
  } catch (error) {
    return res.status(500).json(fail(500, '获取商品列表失败'));
  }
});

router.get('/my', authRequired, async (req, res) => {
  try {
    const list = await Goods.findAll({
      where: { seller_id: req.user.id },
      order: [['created_at', 'DESC']]
    });
    return res.json(success({ list }));
  } catch (error) {
    return res.status(500).json(fail(500, '获取我的商品失败'));
  }
});

router.get('/favor/list', authRequired, async (req, res) => {
  try {
    const list = await Favorite.findAll({
      where: { user_id: req.user.id },
      include: [{ model: Goods, as: 'goods' }],
      order: [['created_at', 'DESC']]
    });
    return res.json(success({ list }));
  } catch (error) {
    return res.status(500).json(fail(500, '获取收藏失败'));
  }
});

router.get('/:id', async (req, res) => {
  try {
    const goods = await Goods.findByPk(req.params.id, {
      include: [{ model: User, as: 'seller', attributes: ['id', 'nickname', 'avatar', 'college', 'phone'] }]
    });
    if (!goods) {
      return res.status(404).json(fail(404, '商品不存在'));
    }

    goods.view_count += 1;
    await goods.save();

    return res.json(success(goods));
  } catch (error) {
    return res.status(500).json(fail(500, '获取商品详情失败'));
  }
});

router.post('/', authRequired, async (req, res) => {
  try {
    if (!['seller', 'admin'].includes(req.user.role)) {
      return res.status(403).json(fail(403, '仅卖家可发布商品'));
    }

    const { title, images, price, category_id, condition, description } = req.body;
    if (!title || !Array.isArray(images) || !images.length || !price || !category_id || !condition || !description) {
      return res.status(400).json(fail(400, '参数缺失'));
    }
    if (images.length > 6) {
      return res.status(400).json(fail(400, '图片最多6张'));
    }

    const goods = await Goods.create({
      seller_id: req.user.id,
      title,
      images,
      price,
      category_id,
      condition,
      description,
      review_status: req.user.role === 'admin' ? 'approved' : 'pending'
    });

    return res.json(success(goods, '发布成功'));
  } catch (error) {
    return res.status(500).json(fail(500, '发布商品失败'));
  }
});

router.put('/:id', authRequired, async (req, res) => {
  try {
    const goods = await Goods.findByPk(req.params.id);
    if (!goods) {
      return res.status(404).json(fail(404, '商品不存在'));
    }
    if (goods.seller_id !== req.user.id) {
      return res.status(403).json(fail(403, '无权限编辑'));
    }

    const { title, images, price, category_id, condition, description, status } = req.body;
    if (images && (!Array.isArray(images) || images.length > 6)) {
      return res.status(400).json(fail(400, '图片格式错误'));
    }

    goods.title = title ?? goods.title;
    goods.images = images ?? goods.images;
    goods.price = price ?? goods.price;
    goods.category_id = category_id ?? goods.category_id;
    goods.condition = condition ?? goods.condition;
    goods.description = description ?? goods.description;
    goods.status = status ?? goods.status;
    goods.review_status = 'pending';
    await goods.save();

    return res.json(success(goods, '更新成功'));
  } catch (error) {
    return res.status(500).json(fail(500, '更新商品失败'));
  }
});

router.delete('/:id', authRequired, async (req, res) => {
  try {
    const goods = await Goods.findByPk(req.params.id);
    if (!goods) {
      return res.status(404).json(fail(404, '商品不存在'));
    }
    if (goods.seller_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json(fail(403, '无权限操作'));
    }

    goods.status = 'offline';
    await goods.save();
    return res.json(success({ id: goods.id }, '下架成功'));
  } catch (error) {
    return res.status(500).json(fail(500, '下架失败'));
  }
});

router.post('/:id/favor', authRequired, async (req, res) => {
  try {
    const goods = await Goods.findByPk(req.params.id);
    if (!goods) {
      return res.status(404).json(fail(404, '商品不存在'));
    }

    const [fav] = await Favorite.findOrCreate({
      where: { user_id: req.user.id, goods_id: goods.id },
      defaults: { user_id: req.user.id, goods_id: goods.id }
    });

    return res.json(success(fav, '收藏成功'));
  } catch (error) {
    return res.status(500).json(fail(500, '收藏失败'));
  }
});

router.delete('/:id/favor', authRequired, async (req, res) => {
  try {
    await Favorite.destroy({ where: { user_id: req.user.id, goods_id: Number(req.params.id) } });
    return res.json(success({}, '取消收藏成功'));
  } catch (error) {
    return res.status(500).json(fail(500, '取消收藏失败'));
  }
});

module.exports = router;
