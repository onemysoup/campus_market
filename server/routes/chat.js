const express = require('express');
const { Op } = require('sequelize');
const { Message, User } = require('../models');
const { authRequired } = require('../middleware/auth');
const { success, fail } = require('../utils/response');

const router = express.Router();

router.use(authRequired);

router.get('/conversations', async (req, res) => {
  try {
    const list = await Message.findAll({
      where: {
        [Op.or]: [{ sender_id: req.user.id }, { receiver_id: req.user.id }]
      },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'nickname', 'avatar'] },
        { model: User, as: 'receiver', attributes: ['id', 'nickname', 'avatar'] }
      ],
      order: [['created_at', 'DESC']]
    });

    const map = new Map();
    list.forEach((msg) => {
      const otherId = msg.sender_id === req.user.id ? msg.receiver_id : msg.sender_id;
      const key = `${otherId}_${msg.goods_id}`;
      if (!map.has(key)) {
        map.set(key, {
          conversationId: key,
          goods_id: msg.goods_id,
          lastMessage: msg.content,
          lastTime: msg.created_at,
          otherUser: msg.sender_id === req.user.id ? msg.receiver : msg.sender
        });
      }
    });

    return res.json(success({ list: Array.from(map.values()) }));
  } catch (error) {
    return res.status(500).json(fail(500, '获取会话失败'));
  }
});

router.get('/messages/:conversationId', async (req, res) => {
  try {
    const [otherId, goodsId] = req.params.conversationId.split('_').map(Number);
    if (!otherId || !goodsId) {
      return res.status(400).json(fail(400, '会话ID格式错误'));
    }

    const list = await Message.findAll({
      where: {
        goods_id: goodsId,
        [Op.or]: [
          { sender_id: req.user.id, receiver_id: otherId },
          { sender_id: otherId, receiver_id: req.user.id }
        ]
      },
      order: [['created_at', 'ASC']]
    });

    await Message.update(
      { is_read: true },
      { where: { sender_id: otherId, receiver_id: req.user.id, goods_id: goodsId } }
    );

    return res.json(success({ list }));
  } catch (error) {
    return res.status(500).json(fail(500, '获取消息失败'));
  }
});

router.post('/messages', async (req, res) => {
  try {
    const { receiver_id, goods_id, content } = req.body;
    if (!receiver_id || !goods_id || !content) {
      return res.status(400).json(fail(400, '参数缺失'));
    }

    const msg = await Message.create({
      sender_id: req.user.id,
      receiver_id,
      goods_id,
      content
    });
    return res.json(success(msg, '发送成功'));
  } catch (error) {
    return res.status(500).json(fail(500, '发送失败'));
  }
});

module.exports = router;
