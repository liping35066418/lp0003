const express = require('express');
const db = require('../database').get;
const { auth, requireAdmin, success, error, paginate } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const { page, pageSize, offset } = paginate(req);
  const { category, keyword, status } = req.query;

  let where = [];
  let params = [];

  if (category && category !== 'all') {
    where.push('category = ?');
    params.push(category);
  }
  if (keyword) {
    where.push('(name LIKE ? OR brand LIKE ? OR model LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (status && status !== 'all') {
    where.push('status = ?');
    params.push(status);
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const total = db().prepare(`SELECT COUNT(*) as count FROM equipment ${whereSql}`).get(...params).count;

  const list = db().prepare(`
    SELECT * FROM equipment
    ${whereSql}
    ORDER BY category, name
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset);

  success(res, { list, total, page, pageSize });
});

router.get('/all', auth, (req, res) => {
  const list = db().prepare(`
    SELECT id, name, category, available_count, total_count, status
    FROM equipment WHERE available_count > 0
    ORDER BY category, name
  `).all();
  success(res, { list });
});

router.post('/', auth, requireAdmin, (req, res) => {
  const { name, category, brand, model, serialNumber, totalCount, status, description, purchaseDate, image } = req.body;

  if (!name || !category) {
    return error(res, '装备名称和分类为必填项');
  }

  const result = db().prepare(`
    INSERT INTO equipment (name, category, brand, model, serial_number, total_count, available_count, status, description, purchase_date, image)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name, category, brand || '', model || '', serialNumber || '',
    totalCount || 1, totalCount || 1, status || 'good',
    description || '', purchaseDate || null, image || null
  );

  success(res, { id: result.lastInsertRowid }, '装备添加成功');
});

router.put('/:id', auth, requireAdmin, (req, res) => {
  const exist = db().prepare('SELECT * FROM equipment WHERE id = ?').get(req.params.id);
  if (!exist) {
    return error(res, '装备不存在', 404);
  }

  const { name, category, brand, model, serialNumber, totalCount, status, description, purchaseDate, image } = req.body;

  const borrowedCount = exist.total_count - exist.available_count;
  const newAvailable = Math.max(0, (totalCount || exist.total_count) - borrowedCount);

  db().prepare(`
    UPDATE equipment SET name = ?, category = ?, brand = ?, model = ?, serial_number = ?,
      total_count = ?, available_count = ?, status = ?, description = ?, purchase_date = ?,
      image = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name, category, brand || '', model || '', serialNumber || '',
    totalCount || exist.total_count, newAvailable, status || 'good',
    description || '', purchaseDate || null, image || null, req.params.id
  );

  success(res, null, '装备更新成功');
});

router.delete('/:id', auth, requireAdmin, (req, res) => {
  const exist = db().prepare('SELECT id FROM equipment WHERE id = ?').get(req.params.id);
  if (!exist) {
    return error(res, '装备不存在', 404);
  }
  const activeLoans = db().prepare(
    "SELECT COUNT(*) as count FROM equipment_loans WHERE equipment_id = ? AND status = 'borrowed'"
  ).get(req.params.id).count;
  if (activeLoans > 0) {
    return error(res, '该装备存在未归还的借用记录，无法删除');
  }
  db().prepare('DELETE FROM equipment WHERE id = ?').run(req.params.id);
  success(res, null, '装备删除成功');
});

router.get('/loans', auth, (req, res) => {
  const { page, pageSize, offset } = paginate(req);
  const { status, equipmentId } = req.query;

  let where = [];
  let params = [];

  if (status && status !== 'all') {
    where.push('l.status = ?');
    params.push(status);
  }
  if (equipmentId) {
    where.push('l.equipment_id = ?');
    params.push(equipmentId);
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const total = db().prepare(`
    SELECT COUNT(*) as count FROM equipment_loans l ${whereSql}
  `).get(...params).count;

  const list = db().prepare(`
    SELECT l.*, e.name as equipment_name, e.category, u.name as user_name, u.phone, a.title as activity_title
    FROM equipment_loans l
    JOIN equipment e ON l.equipment_id = e.id
    JOIN users u ON l.user_id = u.id
    LEFT JOIN activities a ON l.activity_id = a.id
    ${whereSql}
    ORDER BY l.loan_date DESC
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset);

  success(res, { list, total, page, pageSize });
});

router.post('/loans', auth, requireAdmin, (req, res) => {
  const { equipmentId, userId, activityId, quantity, loanDate, dueDate, remark } = req.body;

  if (!equipmentId || !userId || !loanDate) {
    return error(res, '装备、借用人、借用日期为必填项');
  }

  const equipment = db().prepare('SELECT * FROM equipment WHERE id = ?').get(equipmentId);
  if (!equipment) {
    return error(res, '装备不存在');
  }

  const qty = quantity || 1;
  if (equipment.available_count < qty) {
    return error(res, `可用数量不足，当前可用: ${equipment.available_count}`);
  }

  const result = db().prepare(`
    INSERT INTO equipment_loans (equipment_id, user_id, activity_id, quantity, loan_date, due_date, remark)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(equipmentId, userId, activityId || null, qty, loanDate, dueDate || null, remark || '');

  db().prepare('UPDATE equipment SET available_count = available_count - ? WHERE id = ?').run(qty, equipmentId);

  success(res, { id: result.lastInsertRowid }, '借用登记成功');
});

router.post('/loans/:id/return', auth, requireAdmin, (req, res) => {
  const loan = db().prepare('SELECT * FROM equipment_loans WHERE id = ?').get(req.params.id);
  if (!loan) {
    return error(res, '借用记录不存在', 404);
  }
  if (loan.status === 'returned') {
    return error(res, '该装备已归还');
  }

  const { returnDate } = req.body;

  db().prepare(`
    UPDATE equipment_loans SET status = 'returned', return_date = ?
    WHERE id = ?
  `).run(returnDate || new Date().toISOString(), req.params.id);

  db().prepare('UPDATE equipment SET available_count = available_count + ? WHERE id = ?').run(loan.quantity, loan.equipment_id);

  success(res, null, '归还登记成功');
});

router.get('/loans/mine', auth, (req, res) => {
  const list = db().prepare(`
    SELECT l.*, e.name as equipment_name, e.category, e.image as equipment_image,
      a.title as activity_title
    FROM equipment_loans l
    JOIN equipment e ON l.equipment_id = e.id
    LEFT JOIN activities a ON l.activity_id = a.id
    WHERE l.user_id = ?
    ORDER BY l.loan_date DESC
  `).all(req.user.id);
  success(res, { list });
});

module.exports = router;
