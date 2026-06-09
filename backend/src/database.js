const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let db = null;

function init() {
  const dbDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const uploadDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const dbPath = process.env.DB_PATH || path.join(dbDir, 'club.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createTables();
  seedInitialData();
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      role TEXT DEFAULT 'member',
      avatar TEXT,
      emergency_contact TEXT,
      emergency_phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      route TEXT NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'easy',
      duration TEXT NOT NULL,
      distance REAL DEFAULT 0,
      start_date DATETIME NOT NULL,
      end_date DATETIME,
      meeting_place TEXT,
      max_participants INTEGER NOT NULL DEFAULT 20,
      fee REAL DEFAULT 0,
      fee_description TEXT,
      cover_image TEXT,
      status TEXT DEFAULT 'upcoming',
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      remark TEXT,
      status TEXT DEFAULT 'registered',
      registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(activity_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      brand TEXT,
      model TEXT,
      serial_number TEXT,
      total_count INTEGER DEFAULT 1,
      available_count INTEGER DEFAULT 1,
      status TEXT DEFAULT 'good',
      description TEXT,
      purchase_date DATE,
      image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS equipment_loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      activity_id INTEGER,
      quantity INTEGER DEFAULT 1,
      loan_date DATETIME NOT NULL,
      due_date DATETIME,
      return_date DATETIME,
      status TEXT DEFAULT 'borrowed',
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS ledger_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      payer_name TEXT,
      payee_name TEXT,
      record_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS activity_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL,
      user_id INTEGER,
      title TEXT,
      description TEXT,
      image_url TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS activity_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL,
      user_id INTEGER,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS user_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      activity_id INTEGER,
      points INTEGER NOT NULL DEFAULT 0,
      type TEXT NOT NULL DEFAULT 'activity',
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS activity_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      rating INTEGER NOT NULL DEFAULT 5,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(activity_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
    CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(start_date);
    CREATE INDEX IF NOT EXISTS idx_registrations_activity ON registrations(activity_id);
    CREATE INDEX IF NOT EXISTS idx_loans_status ON equipment_loans(status);
    CREATE INDEX IF NOT EXISTS idx_ledger_date ON ledger_records(record_date);
    CREATE INDEX IF NOT EXISTS idx_points_user ON user_points(user_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_activity ON activity_reviews(activity_id);
  `);
}

function seedInitialData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (username, password, name, phone, role)
      VALUES (?, ?, ?, ?, 'admin')
    `).run('admin', hashedPassword, '系统管理员', '13800138000');

    const memberPassword = bcrypt.hashSync('123456', 10);
    const stmt = db.prepare(`
      INSERT INTO users (username, password, name, phone, role, emergency_contact, emergency_phone)
      VALUES (?, ?, ?, ?, 'member', ?, ?)
    `);
    stmt.run('zhangsan', memberPassword, '张三', '13900139001', '张夫人', '13900139010');
    stmt.run('lisi', memberPassword, '李四', '13900139002', '李先生', '13900139020');
    stmt.run('wangwu', memberPassword, '王五', '13900139003', '王女士', '13900139030');
    console.log('✅ 已初始化默认用户数据');
  }

  const equipmentCount = db.prepare('SELECT COUNT(*) as count FROM equipment').get().count;
  if (equipmentCount === 0) {
    const stmt = db.prepare(`
      INSERT INTO equipment (name, category, brand, total_count, available_count, status, description)
      VALUES (?, ?, ?, ?, ?, 'good', ?)
    `);
    stmt.run('骑行头盔', '防护装备', 'GIRO', 10, 10, '专业山地/公路骑行头盔，带MIPS保护');
    stmt.run('前灯', '照明设备', 'NITERIDER', 15, 15, 'LED高亮前灯，1200流明，USB充电');
    stmt.run('尾灯', '照明设备', 'CATEYE', 15, 15, 'LED安全尾灯，多种闪烁模式');
    stmt.run('便携维修工具组', '维修工具', 'TOPEAK', 8, 8, '含六角扳手、螺丝刀、撬胎棒、补胎片');
    stmt.run('打气筒', '维修工具', 'LEZYNE', 5, 5, '高压便携打气筒，美法嘴通用');
    stmt.run('骑行手套', '防护装备', 'SPECIALIZED', 12, 12, '减震透气半指骑行手套');
    stmt.run('急救包', '医疗用品', '自制', 5, 5, '含绷带、创可贴、消毒棉片、止血带');
    console.log('✅ 已初始化默认装备数据');
  }
}

function get() {
  return db;
}

module.exports = { init, get };
