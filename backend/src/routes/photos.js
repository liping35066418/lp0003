const express = require('express');
const db = require('../database').get;
const { auth, requireAdmin, success, error } = require('../middleware/auth');

const router = express.Router();

router.get('/activity/:activityId', auth, (req, res) => {
  const list = db().prepare(`
    SELECT p.*, u.name as uploader_name
    FROM activity_photos p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.activity_id = ?
    ORDER BY p.created_at DESC
  `).all(req.params.activityId);
  success(res, { list });
});

router.post('/', auth, requireAdmin, (req, res) => {
  const { activityId, title, description, imageUrl } = req.body;

  if (!activityId || !imageUrl) {
    return error(res, '活动ID和图片地址为必填项');
  }

  const activity = db().prepare('SELECT id FROM activities WHERE id = ?').get(activityId);
  if (!activity) {
    return error(res, '活动不存在', 404);
  }

  const result = db().prepare(`
    INSERT INTO activity_photos (activity_id, user_id, title, description, image_url)
    VALUES (?, ?, ?, ?, ?)
  `).run(activityId, req.user.id, title || '', description || '', imageUrl);

  success(res, { id: result.lastInsertRowid }, '照片上传成功');
});

router.delete('/:id', auth, requireAdmin, (req, res) => {
  const exist = db().prepare('SELECT id FROM activity_photos WHERE id = ?').get(req.params.id);
  if (!exist) {
    return error(res, '照片不存在', 404);
  }
  db().prepare('DELETE FROM activity_photos WHERE id = ?').run(req.params.id);
  success(res, null, '照片删除成功');
});

module.exports = router;
