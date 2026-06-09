const express = require('express');
const db = require('../database').get;
const { auth, requireAdmin, success, error, paginate } = require('../middleware/auth');

const router = express.Router();

router.post('/:activityId', auth, (req, res) => {
  const activityId = req.params.activityId;
  const { remark } = req.body;

  const activity = db().prepare('SELECT * FROM activities WHERE id = ?').get(activityId);
  if (!activity) {
    return error(res, '活动不存在', 404);
  }

  if (activity.status === 'cancelled') {
    return error(res, '活动已取消，无法报名');
  }
  if (activity.status === 'completed') {
    return error(res, '活动已结束，无法报名');
  }

  const registeredCount = db().prepare(
    "SELECT COUNT(*) as count FROM registrations WHERE activity_id = ? AND status = 'registered'"
  ).get(activityId).count;

  if (registeredCount >= activity.max_participants) {
    return error(res, '报名人数已满');
  }

  const existing = db().prepare(
    "SELECT * FROM registrations WHERE activity_id = ? AND user_id = ?"
  ).get(activityId, req.user.id);

  if (existing) {
    if (existing.status === 'cancelled') {
      db().prepare(
        "UPDATE registrations SET status = 'registered', remark = ?, registered_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(remark || '', existing.id);
      return success(res, null, '重新报名成功');
    } else {
      return error(res, '您已报名该活动');
    }
  }

  db().prepare(`
    INSERT INTO registrations (activity_id, user_id, remark)
    VALUES (?, ?, ?)
  `).run(activityId, req.user.id, remark || '');

  success(res, null, '报名成功');
});

router.delete('/:activityId', auth, (req, res) => {
  const activityId = req.params.activityId;
  const reg = db().prepare(
    "SELECT * FROM registrations WHERE activity_id = ? AND user_id = ?"
  ).get(activityId, req.user.id);

  if (!reg) {
    return error(res, '您未报名该活动');
  }

  db().prepare(
    "UPDATE registrations SET status = 'cancelled' WHERE id = ?"
  ).run(reg.id);

  success(res, null, '取消报名成功');
});

router.get('/mine', auth, (req, res) => {
  const { page, pageSize, offset } = paginate(req);
  const { status } = req.query;

  let where = ['r.user_id = ?'];
  let params = [req.user.id];

  if (status && status !== 'all') {
    where.push('a.status = ?');
    params.push(status);
  }

  const whereSql = 'WHERE ' + where.join(' AND ');

  const total = db().prepare(`
    SELECT COUNT(*) as count FROM registrations r
    JOIN activities a ON r.activity_id = a.id
    ${whereSql}
  `).get(...params).count;

  const list = db().prepare(`
    SELECT r.*, a.title, a.route, a.difficulty, a.duration, a.start_date, a.end_date,
      a.meeting_place, a.fee, a.cover_image, a.status as activity_status,
      (SELECT COUNT(*) FROM registrations r2 WHERE r2.activity_id = a.id AND r2.status = 'registered') as registered_count,
      a.max_participants
    FROM registrations r
    JOIN activities a ON r.activity_id = a.id
    ${whereSql}
    ORDER BY r.registered_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset);

  success(res, { list, total, page, pageSize });
});

router.get('/activity/:activityId/check', auth, (req, res) => {
  const reg = db().prepare(
    "SELECT * FROM registrations WHERE activity_id = ? AND user_id = ?"
  ).get(req.params.activityId, req.user.id);
  success(res, { registered: !!reg && reg.status === 'registered', status: reg?.status || null });
});

module.exports = router;
