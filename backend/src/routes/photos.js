const express = require('express');
const db = require('../database').get;
const { auth, requireAdmin, success, error } = require('../middleware/auth');

const router = express.Router();

router.get('/activity/:activityId', auth, (req, res) => {
  const { uploaderId } = req.query;
  let where = ['p.activity_id = ?'];
  let params = [req.params.activityId];

  if (uploaderId && uploaderId !== 'all') {
    where.push('p.user_id = ?');
    params.push(uploaderId);
  }

  const whereSql = 'WHERE ' + where.join(' AND ');

  const list = db().prepare(`
    SELECT p.*, u.name as uploader_name
    FROM activity_photos p
    LEFT JOIN users u ON p.user_id = u.id
    ${whereSql}
    ORDER BY p.created_at DESC
  `).all(...params);

  const uploaders = db().prepare(`
    SELECT DISTINCT p.user_id, u.name as uploader_name
    FROM activity_photos p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.activity_id = ?
    ORDER BY u.name
  `).all(req.params.activityId);

  const totalCount = db().prepare('SELECT COUNT(*) as count FROM activity_photos WHERE activity_id = ?').get(req.params.activityId).count;

  success(res, { list, uploaders, totalCount, photographerCount: uploaders.length });
});

router.post('/', auth, (req, res) => {
  const { activityId, title, description, imageUrl } = req.body;

  if (!activityId || !imageUrl) {
    return error(res, '活动ID和图片地址为必填项');
  }

  const activity = db().prepare('SELECT id, status FROM activities WHERE id = ?').get(activityId);
  if (!activity) {
    return error(res, '活动不存在', 404);
  }

  const result = db().prepare(`
    INSERT INTO activity_photos (activity_id, user_id, title, description, image_url)
    VALUES (?, ?, ?, ?, ?)
  `).run(activityId, req.user.id, title || '', description || '', imageUrl);

  success(res, { id: result.lastInsertRowid }, '照片上传成功');
});

router.delete('/:id', auth, (req, res) => {
  const exist = db().prepare('SELECT * FROM activity_photos WHERE id = ?').get(req.params.id);
  if (!exist) {
    return error(res, '照片不存在', 404);
  }

  const isAdmin = req.user.role === 'admin';
  const isOwner = exist.user_id === req.user.id;

  if (!isAdmin && !isOwner) {
    return error(res, '无权限删除此照片', 403);
  }

  db().prepare('DELETE FROM activity_photos WHERE id = ?').run(req.params.id);
  success(res, null, '照片删除成功');
});

module.exports = router;
