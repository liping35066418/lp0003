const express = require('express');
const db = require('../database').get;
const { auth, requireAdmin, success, error, paginate } = require('../middleware/auth');

const router = express.Router();

router.get('/mine', auth, (req, res) => {
  const { page, pageSize, offset } = paginate(req);

  const total = db().prepare('SELECT COUNT(*) as count FROM user_points WHERE user_id = ?').get(req.user.id).count;

  const list = db().prepare(`
    SELECT p.*, a.title as activity_title
    FROM user_points p
    LEFT JOIN activities a ON p.activity_id = a.id
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.user.id, pageSize, offset);

  const totalPoints = db().prepare('SELECT COALESCE(SUM(points), 0) as total FROM user_points WHERE user_id = ?').get(req.user.id).total;

  const allPoints = db().prepare('SELECT user_id, COALESCE(SUM(points), 0) as total FROM user_points GROUP BY user_id ORDER BY total DESC').all();
  const rank = allPoints.findIndex(p => p.user_id === req.user.id) + 1;

  success(res, { list, total, page, pageSize, totalPoints, rank });
});

router.get('/user/:userId', auth, requireAdmin, (req, res) => {
  const { page, pageSize, offset } = paginate(req);
  const userId = req.params.userId;

  const total = db().prepare('SELECT COUNT(*) as count FROM user_points WHERE user_id = ?').get(userId).count;

  const list = db().prepare(`
    SELECT p.*, a.title as activity_title
    FROM user_points p
    LEFT JOIN activities a ON p.activity_id = a.id
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, pageSize, offset);

  const totalPoints = db().prepare('SELECT COALESCE(SUM(points), 0) as total FROM user_points WHERE user_id = ?').get(userId).total;

  success(res, { list, total, page, pageSize, totalPoints });
});

router.get('/leaderboard', auth, (req, res) => {
  const { limit = 10 } = req.query;
  const list = db().prepare(`
    SELECT u.id, u.name, u.avatar,
      COALESCE(SUM(p.points), 0) as total_points,
      COUNT(DISTINCT p.activity_id) as activity_count
    FROM users u
    LEFT JOIN user_points p ON u.id = p.user_id
    WHERE u.role = 'member'
    GROUP BY u.id
    ORDER BY total_points DESC, activity_count DESC
    LIMIT ?
  `).all(Number(limit));

  list.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  const myRank = db().prepare(`
    SELECT rank FROM (
      SELECT u.id, COALESCE(SUM(p.points), 0) as total_points,
        ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(p.points), 0) DESC) as rank
      FROM users u
      LEFT JOIN user_points p ON u.id = p.user_id
      WHERE u.role = 'member'
      GROUP BY u.id
    ) WHERE id = ?
  `).get(req.user.id);

  const myPoints = db().prepare('SELECT COALESCE(SUM(points), 0) as total FROM user_points WHERE user_id = ?').get(req.user.id).total;

  success(res, { list, myRank: myRank?.rank || 0, myPoints });
});

router.post('/manual', auth, requireAdmin, (req, res) => {
  const { userId, points, reason } = req.body;

  if (!userId || !points) {
    return error(res, '用户ID和积分为必填项');
  }

  const user = db().prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) {
    return error(res, '用户不存在');
  }

  db().prepare(`
    INSERT INTO user_points (user_id, points, type, reason)
    VALUES (?, ?, 'manual', ?)
  `).run(userId, points, reason || '管理员手动调整');

  success(res, null, '积分已添加');
});

module.exports = router;
