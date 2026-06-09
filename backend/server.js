const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./src/database');
const authRoutes = require('./src/routes/auth');
const activityRoutes = require('./src/routes/activities');
const registrationRoutes = require('./src/routes/registrations');
const equipmentRoutes = require('./src/routes/equipment');
const ledgerRoutes = require('./src/routes/ledger');
const userRoutes = require('./src/routes/users');
const photoRoutes = require('./src/routes/photos');
const statsRoutes = require('./src/routes/stats');
const uploadRoutes = require('./src/routes/upload');
const pointRoutes = require('./src/routes/points');

const app = express();
const PORT = process.env.PORT || 8603;
const BIND_IP = process.env.BIND_IP || '127.0.0.1';

db.init();

app.use(cors({
  origin: ['http://127.0.0.1:3603', 'http://localhost:3603'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/points', pointRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '骑行俱乐部管理系统服务正常运行' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
});

app.listen(PORT, BIND_IP, () => {
  console.log(`🚀 骑行俱乐部管理系统后端服务已启动`);
  console.log(`📍 监听地址: http://${BIND_IP}:${PORT}`);
  console.log(`📊 健康检查: http://${BIND_IP}:${PORT}/api/health`);
});
