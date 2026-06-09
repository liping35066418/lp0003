const express = require('express');
const db = require('../database').get;
const { auth, requireAdmin, success, error, paginate } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const { page, pageSize, offset } = paginate(req);
  const { type, activityId, keyword, startDate, endDate } = req.query;

  let where = [];
  let params = [];

  if (type && type !== 'all') {
    where.push('lr.type = ?');
    params.push(type);
  }
  if (activityId) {
    where.push('lr.activity_id = ?');
    params.push(activityId);
  }
  if (keyword) {
    where.push('(lr.description LIKE ? OR lr.payer_name LIKE ? OR lr.payee_name LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (startDate) {
    where.push('lr.record_date >= ?');
    params.push(startDate);
  }
  if (endDate) {
    where.push('lr.record_date <= ?');
    params.push(endDate);
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const total = db().prepare(`SELECT COUNT(*) as count FROM ledger_records lr ${whereSql}`).get(...params).count;

  const list = db().prepare(`
    SELECT lr.*, a.title as activity_title, u.name as creator_name
    FROM ledger_records lr
    LEFT JOIN activities a ON lr.activity_id = a.id
    LEFT JOIN users u ON lr.created_by = u.id
    ${whereSql}
    ORDER BY lr.record_date DESC
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset);

  const summary = db().prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
    FROM ledger_records lr
    ${whereSql}
  `).get(...params);

  summary.balance = summary.total_income - summary.total_expense;

  success(res, { list, total, page, pageSize, summary });
});

router.post('/', auth, requireAdmin, (req, res) => {
  const { activityId, type, amount, description, payerName, payeeName, recordDate } = req.body;

  if (!type || !amount || !description) {
    return error(res, '类型、金额、描述为必填项');
  }

  if (!['income', 'expense'].includes(type)) {
    return error(res, '类型只能是 income 或 expense');
  }

  if (amount <= 0) {
    return error(res, '金额必须大于0');
  }

  const result = db().prepare(`
    INSERT INTO ledger_records (activity_id, type, amount, description, payer_name, payee_name, record_date, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    activityId || null, type, amount, description,
    payerName || null, payeeName || null, recordDate || new Date().toISOString(), req.user.id
  );

  success(res, { id: result.lastInsertRowid }, '台账记录添加成功');
});

router.put('/:id', auth, requireAdmin, (req, res) => {
  const exist = db().prepare('SELECT id FROM ledger_records WHERE id = ?').get(req.params.id);
  if (!exist) {
    return error(res, '记录不存在', 404);
  }

  const { activityId, type, amount, description, payerName, payeeName, recordDate } = req.body;

  if (!['income', 'expense'].includes(type)) {
    return error(res, '类型只能是 income 或 expense');
  }

  db().prepare(`
    UPDATE ledger_records SET activity_id = ?, type = ?, amount = ?, description = ?,
      payer_name = ?, payee_name = ?, record_date = ?
    WHERE id = ?
  `).run(
    activityId || null, type, amount, description,
    payerName || null, payeeName || null, recordDate || new Date().toISOString(), req.params.id
  );

  success(res, null, '记录更新成功');
});

router.delete('/:id', auth, requireAdmin, (req, res) => {
  const exist = db().prepare('SELECT id FROM ledger_records WHERE id = ?').get(req.params.id);
  if (!exist) {
    return error(res, '记录不存在', 404);
  }
  db().prepare('DELETE FROM ledger_records WHERE id = ?').run(req.params.id);
  success(res, null, '记录删除成功');
});

module.exports = router;
