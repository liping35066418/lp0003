const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth, success, error } = require('../middleware/auth');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subDir = req.query.dir || 'general';
    const targetDir = path.join(uploadDir, subDir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('只允许上传图片文件 (JPG, PNG, GIF, WEBP)'));
  }
});

router.post('/image', auth, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return error(res, err.message);
    }
    if (!req.file) {
      return error(res, '请选择要上传的文件');
    }
    const subDir = req.query.dir || 'general';
    const url = `/uploads/${subDir}/${req.file.filename}`;
    success(res, { url, filename: req.file.filename, originalName: req.file.originalname }, '上传成功');
  });
});

module.exports = router;
