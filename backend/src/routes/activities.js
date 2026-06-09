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

  const now = new Date();
  let justCompleted = false;
  if (activity.status !== 'completed' && activity.end_date && new Date(activity.end_date) < now) {
    db().prepare("UPDATE activities SET status = 'completed' WHERE id = ?").run(req.params.id);
    activity.status = 'completed';
    justCompleted = true;
    db().prepare(`
      UPDATE equipment_loans
      SET status = 'overdue'
      WHERE activity_id = ? AND status = 'borrowed'
    `).run(req.params.id);
  } else if (activity.status !== 'completed' && activity.start_date && new Date(activity.start_date) < now && activity.end_date && new Date(activity.end_date) >= now) {
    if (activity.status !== 'ongoing') {
      db().prepare("UPDATE activities SET status = 'ongoing' WHERE id = ?").run(req.params.id);
      activity.status = 'ongoing';
    }
  }

  if (activity.status === 'completed') {
    const diffPoints = { easy: 10, medium: 15, hard: 20, extreme: 30 };
    const points = diffPoints[activity.difficulty] || 10;
    const difficultyText = { easy: '普通活动', medium: '中等活动', hard: '困难活动', extreme: '极限活动' };
    const regs = db().prepare(`
      SELECT user_id FROM registrations
      WHERE activity_id = ? AND status = 'registered'
    `).all(req.params.id);
    const pointStmt = db().prepare(`
      INSERT INTO user_points (user_id, activity_id, points, type, reason)
      SELECT ?, ?, ?, 'activity', ?
      WHERE NOT EXISTS (
        SELECT 1 FROM user_points
        WHERE user_id = ? AND activity_id = ? AND type = 'activity'
      )
    `);
    regs.forEach(r => {
      pointStmt.run(r.user_id, req.params.id, points,
        `参加${difficultyText[activity.difficulty] || '活动'}「${activity.title}」`,
        r.user_id, req.params.id);
    });
  }

  const registrations = db().prepare(`
    SELECT r.*, u.name, u.phone, u.email
    FROM registrations r
    JOIN users u ON r.user_id = u.id
    WHERE r.activity_id = ? AND r.status = 'registered'
    ORDER BY r.registered_at ASC
  `).all(req.params.id);

  const loanRows = db().prepare(`
    SELECT l.user_id, l.equipment_id, l.quantity, l.status, l.due_date,
      e.name as equipment_name, e.category
    FROM equipment_loans l
    JOIN equipment e ON l.equipment_id = e.id
    WHERE l.activity_id = ? AND l.status IN ('borrowed', 'overdue')
  `).all(req.params.id);

  const userLoans = {};
  loanRows.forEach(r => {
    if (!userLoans[r.user_id]) {
      userLoans[r.user_id] = [];
    }
    userLoans[r.user_id].push(r);
  });

  registrations.forEach(reg => {
    reg.loans = userLoans[reg.user_id] || [];
  });

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

  const reviews = db().prepare(`
    SELECT r.*, u.name as user_name, u.avatar as user_avatar
    FROM activity_reviews r
    LEFT JOIN users u ON r.user_id = u.id
    WHERE r.activity_id = ?
    ORDER BY r.created_at DESC
  `).all(req.params.id);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  const userReview = req.user
    ? reviews.find(r => r.user_id === req.user.id) || null
    : null;

  success(res, { activity, registrations, photos, updates, reviews, avgRating, userReview });
});

router.post('/:id/reviews', auth, (req, res) => {
  const { rating, content } = req.body;
  const activityId = req.params.id;

  if (!rating || rating < 1 || rating > 5) {
    return error(res, '评分必须为1-5星');
  }

  const activity = db().prepare('SELECT * FROM activities WHERE id = ?').get(activityId);
  if (!activity) {
    return error(res, '活动不存在', 404);
  }
  if (activity.status !== 'completed') {
    return error(res, '仅已结束的活动可评价');
  }

  const reg = db().prepare(
    "SELECT id FROM registrations WHERE activity_id = ? AND user_id = ? AND status = 'registered'"
  ).get(activityId, req.user.id);
  if (!reg) {
    return error(res, '只有参与过该活动的成员才能评价');
  }

  const existing = db().prepare(
    'SELECT id FROM activity_reviews WHERE activity_id = ? AND user_id = ?'
  ).get(activityId, req.user.id);

  if (existing) {
    db().prepare(`
      UPDATE activity_reviews SET rating = ?, content = ?, created_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(rating, content || '', existing.id);
    success(res, null, '评价已更新');
  } else {
    db().prepare(`
      INSERT INTO activity_reviews (activity_id, user_id, rating, content)
      VALUES (?, ?, ?, ?)
    `).run(activityId, req.user.id, rating, content || '');
    success(res, null, '评价已提交');
  }
});

router.delete('/:id/reviews/:reviewId', auth, (req, res) => {
  const review = db().prepare('SELECT * FROM activity_reviews WHERE id = ? AND activity_id = ?')
    .get(req.params.reviewId, req.params.id);
  if (!review) {
    return error(res, '评价不存在', 404);
  }
  if (req.user.role !== 'admin' && review.user_id !== req.user.id) {
    return error(res, '无权限删除此评价', 403);
  }
  db().prepare('DELETE FROM activity_reviews WHERE id = ?').run(req.params.reviewId);
  success(res, null, '评价已删除');
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

  const loanRows = db().prepare(`
    SELECT l.user_id, l.equipment_id, l.quantity, l.status, l.due_date,
      e.name as equipment_name, e.category
    FROM equipment_loans l
    JOIN equipment e ON l.equipment_id = e.id
    WHERE l.activity_id = ? AND l.status IN ('borrowed', 'overdue')
  `).all(req.params.id);

  const userLoans = {};
  loanRows.forEach(r => {
    if (!userLoans[r.user_id]) {
      userLoans[r.user_id] = [];
    }
    userLoans[r.user_id].push(r);
  });

  list.forEach(reg => {
    reg.loans = userLoans[reg.user_id] || [];
  });

  success(res, { list });
});

router.get('/my/registered', auth, (req, res) => {
  const now = new Date().toISOString();
  const list = db().prepare(`
    SELECT a.id, a.title, a.start_date, a.end_date, a.status
    FROM registrations r
    JOIN activities a ON r.activity_id = a.id
    WHERE r.user_id = ? AND r.status = 'registered'
      AND (a.end_date IS NULL OR a.end_date >= ?)
    ORDER BY a.start_date ASC
  `).all(req.user.id, now);
  success(res, { list });
});

module.exports = router;
