const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User } = require('../models');
const { success, fail } = require('../utils/response');
const { authRequired, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 10;

function createToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

function userView(user) {
  return {
    id: user.id,
    nickname: user.nickname,
    phone: user.phone,
    avatar: user.avatar,
    role: user.role,
    student_id: user.student_id,
    college: user.college,
    wx_openid: user.wx_openid,
    is_banned: user.is_banned,
    created_at: user.created_at
  };
}

router.post('/auth/register', async (req, res) => {
  try {
    const { nickname, phone, password, role, student_id, college } = req.body;
    if (!nickname || !phone || !password || !role || !student_id || !college) {
      return res.status(400).json(fail(400, '参数缺失'));
    }
    if (!['buyer', 'seller'].includes(role)) {
      return res.status(400).json(fail(400, '角色仅支持 buyer 或 seller'));
    }

    const exists = await User.findOne({ where: { phone } });
    if (exists) {
      return res.status(400).json(fail(400, '手机号已注册'));
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({
      nickname,
      phone,
      password: hash,
      role,
      student_id,
      college,
      avatar: ''
    });

    return res.json(success({ token: createToken(user), user: userView(user) }));
  } catch (error) {
    return res.status(500).json(fail(500, '注册失败'));
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json(fail(400, '参数缺失'));
    }

    const user = await User.findOne({ where: { phone } });
    if (!user) {
      return res.status(404).json(fail(404, '用户不存在'));
    }
    if (user.is_banned) {
      return res.status(403).json(fail(403, '账号已被封禁'));
    }

    const passOk = await bcrypt.compare(password, user.password);
    if (!passOk) {
      return res.status(401).json(fail(401, '密码错误'));
    }

    return res.json(success({ token: createToken(user), user: userView(user) }));
  } catch (error) {
    return res.status(500).json(fail(500, '登录失败'));
  }
});

router.post('/auth/wx-login', async (req, res) => {
  try {
    const { wx_openid, nickname, phone } = req.body;
    if (!wx_openid) {
      return res.status(400).json(fail(400, '参数缺失'));
    }

    let user = await User.findOne({ where: { wx_openid } });
    if (!user && phone) {
      user = await User.findOne({ where: { phone } });
      if (user) {
        user.wx_openid = wx_openid;
        await user.save();
      }
    }

    if (!user) {
      const tempPassword = await bcrypt.hash(`wx_${Date.now()}`, SALT_ROUNDS);
      user = await User.create({
        nickname: nickname || `微信用户${String(Date.now()).slice(-4)}`,
        phone: phone || `1${String(Date.now()).slice(-10)}`,
        password: tempPassword,
        role: 'buyer',
        student_id: '',
        college: '',
        wx_openid
      });
    }

    if (user.is_banned) {
      return res.status(403).json(fail(403, '账号已被封禁'));
    }

    return res.json(success({ token: createToken(user), user: userView(user) }));
  } catch (error) {
    return res.status(500).json(fail(500, '微信登录失败'));
  }
});

router.put('/auth/password', async (req, res) => {
  try {
    const { phone, code, newPassword } = req.body;
    if (!phone || !code || !newPassword) {
      return res.status(400).json(fail(400, '参数缺失'));
    }

    if (String(code) !== '123456') {
      return res.status(400).json(fail(400, '验证码错误'));
    }

    const user = await User.findOne({ where: { phone } });
    if (!user) {
      return res.status(404).json(fail(404, '用户不存在'));
    }

    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await user.save();
    return res.json(success({ id: user.id }, '密码修改成功'));
  } catch (error) {
    return res.status(500).json(fail(500, '修改密码失败'));
  }
});

router.get('/user/profile', authRequired, async (req, res) => {
  return res.json(success(userView(req.user)));
});

router.put('/user/profile', authRequired, async (req, res) => {
  try {
    const { nickname, avatar, college, phone } = req.body;

    if (phone) {
      const conflict = await User.findOne({
        where: {
          phone,
          id: { [Op.ne]: req.user.id }
        }
      });
      if (conflict) {
        return res.status(400).json(fail(400, '手机号已被使用'));
      }
    }

    req.user.nickname = nickname ?? req.user.nickname;
    req.user.avatar = avatar ?? req.user.avatar;
    req.user.college = college ?? req.user.college;
    req.user.phone = phone ?? req.user.phone;
    await req.user.save();

    return res.json(success(userView(req.user)));
  } catch (error) {
    return res.status(500).json(fail(500, '更新资料失败'));
  }
});

module.exports = router;
