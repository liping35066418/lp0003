const express = require('express');
const db = require('../database').get;
const { auth, requireAdmin, success, error, paginate } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, requireAdmin, (req, res) => {
  const { page, pageSize, offset } = paginate(req);
  const { role, keyword } = req.query;

  let where = [];
  let params = [];

  if (role && role !== 'all') {
    where.push('role = ?');
    params.push(role);
  }
  if (keyword) {
    where.push('(name LIKE ? OR username LIKE ? OR phone LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const total = db().prepare(`SELECT COUNT(*) as count FROM users ${whereSql}`).get(...params).count;

  const list = db().prepare(`
    SELECT id, username, name, phone, email, role, emergency_contact, emergency_phone, created_at
    FROM users
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset);

  list.forEach(user => {
    const stats = db().prepare(`
      SELECT
        (SELECT COUNT(*) FROM registrations WHERE user_id = ? AND status = 'registered') as activity_count,
        (SELECT COUNT(*) FROM equipment_loans WHERE user_id = ? AND status = 'borrowed') as borrowing_count,
        (SELECT COALESCE(SUM(points), 0) FROM user_points WHERE user_id = ?) as total_points
    `).get(user.id, user.id, user.id);
    user.activity_count = stats.activity_count;
    user.borrowing_count = stats.borrowing_count;
    user.total_points = stats.total_points;
  });

  success(res, { list, total, page, pageSize });
});

router.get('/all', auth, requireAdmin, (req, res) => {
  const list = db().prepare(`
    SELECT id, name, phone, role, username
    FROM users ORDER BY name
  `).all();
  success(res, { list });
});

router.post('/', auth, requireAdmin, (req, res) => {
  const { username, password, name, phone, email, role, emergencyContact, emergencyPhone } = req.body;

  if (!username || !password || !name) {
    return error(res, '用户名、密码、姓名为必填项');
  }

  const existing = db().prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return error(res, '用户名已存在');
  }

  const bcrypt = require('bcryptjs');
  const hashedPassword = bcrypt.hashSync(password, 10);

  const result = db().prepare(`
    INSERT INTO users (username, password, name, phone, email, role, emergency_contact, emergency_phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    username, hashedPassword, name, phone || null, email || null,
    role || 'member', emergencyContact || null, emergencyPhone || null
  );

  success(res, { id: result.lastInsertRowid }, '用户创建成功');
});

router.put('/:id', auth, requireAdmin, (req, res) => {
  const exist = db().prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!exist) {
    return error(res, '用户不存在', 404);
  }

  const { name, phone, email, role, emergencyContact, emergencyPhone, password } = req.body;

  if (password) {
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync(password, 10);
    db().prepare(`
      UPDATE users SET name = ?, phone = ?, email = ?, role = ?, emergency_contact = ?, emergency_phone = ?,
        password = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name, phone || null, email || null, role || 'member',
      emergencyContact || null, emergencyPhone || null, hashedPassword, req.params.id
    );
  } else {
    db().prepare(`
      UPDATE users SET name = ?, phone = ?, email = ?, role = ?, emergency_contact = ?, emergency_phone = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name, phone || null, email || null, role || 'member',
      emergencyContact || null, emergencyPhone || null, req.params.id
    );
  }

  success(res, null, '用户更新成功');
});

router.delete('/:id', auth, requireAdmin, (req, res) => {
  if (parseInt(req.params.id) === req.user.id) {
    return error(res, '不能删除当前登录的用户');
  }
  const exist = db().prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!exist) {
    return error(res, '用户不存在', 404);
  }
  db().prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  success(res, null, '用户删除成功');
});

module.exports = router;
