const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { fail } = require('../utils/response');

const JWT_SECRET = process.env.JWT_SECRET || 'campus_secondhand_secret';

async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) {
      return res.status(401).json(fail(401, '未授权'));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json(fail(401, '用户不存在'));
    }
    if (user.is_banned) {
      return res.status(403).json(fail(403, '账号已被封禁'));
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json(fail(401, 'token无效'));
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json(fail(401, '未授权'));
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json(fail(403, '无权限'));
  }
  next();
}

module.exports = {
  JWT_SECRET,
  authRequired,
  requireAdmin
};
