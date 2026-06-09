const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database').get;
const { generateToken, auth, success, error } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return error(res, '用户名和密码不能为空');
  }

  const user = db().prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return error(res, '用户名或密码错误');
  }

  if (!bcrypt.compareSync(password, user.password)) {
    return error(res, '用户名或密码错误');
  }

  const token = generateToken(user);
  success(res, {
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      email: user.email
    }
  }, '登录成功');
});

router.post('/register', (req, res) => {
  const { username, password, name, phone, email, emergencyContact, emergencyPhone } = req.body;

  if (!username || !password || !name) {
    return error(res, '用户名、密码、姓名为必填项');
  }

  const existing = db().prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return error(res, '用户名已存在');
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = db().prepare(`
    INSERT INTO users (username, password, name, phone, email, emergency_contact, emergency_phone, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'member')
  `).run(username, hashedPassword, name, phone || null, email || null, emergencyContact || null, emergencyPhone || null);

  const user = db().prepare('SELECT id, username, name, phone, role, avatar, email FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = generateToken(user);
  success(res, { token, user }, '注册成功');
});

router.get('/profile', auth, (req, res) => {
  success(res, req.user);
});

router.put('/profile', auth, (req, res) => {
  const { name, phone, email, emergencyContact, emergencyPhone, avatar } = req.body;
  db().prepare(`
    UPDATE users SET name = ?, phone = ?, email = ?, emergency_contact = ?, emergency_phone = ?, avatar = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name || req.user.name, phone || null, email || null, emergencyContact || null, emergencyPhone || null, avatar || null, req.user.id);
  const user = db().prepare('SELECT id, username, name, phone, role, avatar, email, emergency_contact, emergency_phone FROM users WHERE id = ?').get(req.user.id);
  success(res, user, '个人信息已更新');
});

router.put('/password', auth, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return error(res, '原密码和新密码不能为空');
  }
  if (newPassword.length < 6) {
    return error(res, '新密码长度不能少于6位');
  }

  const user = db().prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(oldPassword, user.password)) {
    return error(res, '原密码不正确');
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  db().prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hashedPassword, req.user.id);
  success(res, null, '密码修改成功');
});

module.exports = router;
