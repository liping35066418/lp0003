const express = require('express');
const db = require('../database').get;
const { auth, requireAdmin, success, error, paginate } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const { page, pageSize, offset } = paginate(req);
  const { status, keyword } = req.query;

  let where = [];
  let params = [];

  if (status && status !== 'all') {
    where.push('a.status = ?');
    params.push(status);
  }
  if (keyword) {
    where.push('(a.title LIKE ? OR a.route LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const total = db().prepare(`SELECT COUNT(*) as count FROM activities a ${whereSql}`).get(...params).count;

  const list = db().prepare(`
    SELECT a.*, u.name as creator_name,
      (SELECT COUNT(*) FROM registrations r WHERE r.activity_id = a.id AND r.status = 'registered') as registered_count
    FROM activities a
    LEFT JOIN users u ON a.created_by = u.id
    ${whereSql}
    ORDER BY a.start_date DESC
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset);

  list.forEach(item => {
    item.is_full = item.registered_count >= item.max_participants;
  });

  success(res, { list, total, page, pageSize });
});

router.get('/:id', auth, (req, res) => {
  const activity = db().prepare(`
    SELECT a.*, u.name as creator_name,
      (SELECT COUNT(*) FROM registrations r WHERE r.activity_id = a.id AND r.status = 'registered') as registered_count
    FROM activities a
    LEFT JOIN users u ON a.created_by = u.id
    WHERE a.id = ?
  `).get(req.params.id);

  if (!activity) {
    return error(res, '活动不存在', 404);
  }

  activity.is_full = activity.registered_count >= activity.max_participants;

  const registrations = db().prepare(`
    SELECT r.*, u.name, u.phone, u.email
    FROM registrations r
    JOIN users u ON r.user_id = u.id
    WHERE r.activity_id = ? AND r.status = 'registered'
    ORDER BY r.registered_at ASC
  `).all(req.params.id);

  const photos = db().prepare(`
    SELECT p.*, u.name as uploader_name
    FROM activity_photos p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.activity_id = ?
    ORDER BY p.created_at DESC
  `).all(req.params.id);

  const updates = db().prepare(`
    SELECT up.*, u.name as creator_name
    FROM activity_updates up
    LEFT JOIN users u ON up.user_id = u.id
    WHERE up.activity_id = ?
    ORDER BY up.created_at DESC
  `).all(req.params.id);

  success(res, { activity, registrations, photos, updates });
});

router.post('/', auth, requireAdmin, (req, res) => {
  const { title, description, route, difficulty, duration, distance, startDate, endDate,
    meetingPlace, maxParticipants, fee, feeDescription, coverImage, status } = req.body;

  if (!title || !route || !startDate || !maxParticipants) {
    return error(res, '活动标题、路线、开始时间、人数上限为必填项');
  }

  const result = db().prepare(`
    INSERT INTO activities (title, description, route, difficulty, duration, distance, start_date, end_date,
      meeting_place, max_participants, fee, fee_description, cover_image, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title, description || '', route, difficulty || 'easy', duration || '', distance || 0,
    startDate, endDate || null, meetingPlace || '', maxParticipants,
    fee || 0, feeDescription || '', coverImage || null, status || 'upcoming', req.user.id
  );

  success(res, { id: result.lastInsertRowid }, '活动创建成功');
});

router.put('/:id', auth, requireAdmin, (req, res) => {
  const exist = db().prepare('SELECT id FROM activities WHERE id = ?').get(req.params.id);
  if (!exist) {
    return error(res, '活动不存在', 404);
  }

  const { title, description, route, difficulty, duration, distance, startDate, endDate,
    meetingPlace, maxParticipants, fee, feeDescription, coverImage, status } = req.body;

  db().prepare(`
    UPDATE activities SET title = ?, description = ?, route = ?, difficulty = ?, duration = ?,
      distance = ?, start_date = ?, end_date = ?, meeting_place = ?, max_participants = ?,
      fee = ?, fee_description = ?, cover_image = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title, description || '', route, difficulty || 'easy', duration || '', distance || 0,
    startDate, endDate || null, meetingPlace || '', maxParticipants,
    fee || 0, feeDescription || '', coverImage || null, status || 'upcoming', req.params.id
  );

  success(res, null, '活动更新成功');
});

router.delete('/:id', auth, requireAdmin, (req, res) => {
  const exist = db().prepare('SELECT id FROM activities WHERE id = ?').get(req.params.id);
  if (!exist) {
    return error(res, '活动不存在', 404);
  }
  db().prepare('DELETE FROM activities WHERE id = ?').run(req.params.id);
  success(res, null, '活动删除成功');
});

router.post('/:id/updates', auth, requireAdmin, (req, res) => {
  const { content } = req.body;
  if (!content) {
    return error(res, '动态内容不能为空');
  }
  const result = db().prepare(`
    INSERT INTO activity_updates (activity_id, user_id, content)
    VALUES (?, ?, ?)
  `).run(req.params.id, req.user.id, content);
  success(res, { id: result.lastInsertRowid }, '动态发布成功');
});

router.get('/:id/participants', auth, requireAdmin, (req, res) => {
  const list = db().prepare(`
    SELECT r.id, r.registered_at, r.remark,
      u.id as user_id, u.name, u.phone, u.email, u.emergency_contact, u.emergency_phone
    FROM registrations r
    JOIN users u ON r.user_id = u.id
    WHERE r.activity_id = ? AND r.status = 'registered'
    ORDER BY r.registered_at ASC
  `).all(req.params.id);
  success(res, { list });
});

module.exports = router;
