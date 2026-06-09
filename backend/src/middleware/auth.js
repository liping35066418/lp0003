const jwt = require('jsonwebtoken');
const db = require('../database').get;

const JWT_SECRET = process.env.JWT_SECRET || 'cycling_club_secret_key_2024';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '请先登录' });
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db().prepare('SELECT id, username, name, phone, role, avatar, email FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return res.status(401).json({ code: 401, message: '用户不存在或已被删除' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ code: 401, message: '登录已过期，请重新登录' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ code: 403, message: '权限不足，需要管理员权限' });
  }
  next();
}

function success(res, data = null, message = '操作成功') {
  res.json({ code: 200, message, data });
}

function error(res, message = '操作失败', code = 400) {
  res.status(code).json({ code, message });
}

function paginate(req) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 10));
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

module.exports = { generateToken, auth, requireAdmin, success, error, paginate };
