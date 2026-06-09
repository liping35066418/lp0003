const express = require('express');
const db = require('../database').get;
const { auth, requireAdmin, success } = require('../middleware/auth');

const router = express.Router();

router.get('/overview', auth, requireAdmin, (req, res) => {
  const userCount = db().prepare("SELECT COUNT(*) as count FROM users WHERE role = 'member'").get().count;
  const activityCount = db().prepare('SELECT COUNT(*) as count FROM activities').get().count;
  const upcomingActivities = db().prepare("SELECT COUNT(*) as count FROM activities WHERE status = 'upcoming'").get().count;
  const registrationCount = db().prepare("SELECT COUNT(*) as count FROM registrations WHERE status = 'registered'").get().count;
  const equipmentCount = db().prepare('SELECT COUNT(*) as count FROM equipment').get().count;
  const borrowedCount = db().prepare("SELECT COUNT(*) as count FROM equipment_loans WHERE status = 'borrowed'").get().count;

  const finance = db().prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
    FROM ledger_records
  `).get();

  const feeIncome = db().prepare(`
    SELECT COALESCE(SUM(a.fee * r.count), 0) as total
    FROM activities a
    JOIN (
      SELECT activity_id, COUNT(*) as count FROM registrations WHERE status = 'registered' GROUP BY activity_id
    ) r ON a.id = r.activity_id
    WHERE a.fee > 0
  `).get().total;

  success(res, {
    userCount,
    activityCount,
    upcomingActivities,
    registrationCount,
    equipmentCount,
    borrowedCount,
    totalIncome: finance.total_income + feeIncome,
    totalExpense: finance.total_expense,
    balance: (finance.total_income + feeIncome) - finance.total_expense,
    activityFeeIncome: feeIncome
  });
});

router.get('/activities', auth, requireAdmin, (req, res) => {
  const list = db().prepare(`
    SELECT a.id, a.title, a.start_date, a.difficulty, a.duration, a.fee, a.status,
      a.max_participants,
      (SELECT COUNT(*) FROM registrations r WHERE r.activity_id = a.id AND r.status = 'registered') as registered_count,
      (SELECT COUNT(*) FROM activity_photos p WHERE p.activity_id = a.id) as photo_count,
      COALESCE(
        (SELECT SUM(amount) FROM ledger_records WHERE activity_id = a.id AND type = 'income'), 0
      ) as ledger_income,
      COALESCE(
        (SELECT SUM(amount) FROM ledger_records WHERE activity_id = a.id AND type = 'expense'), 0
      ) as ledger_expense
    FROM activities a
    ORDER BY a.start_date DESC
    LIMIT 50
  `).all();

  list.forEach(item => {
    item.fee_income = item.fee * item.registered_count;
    item.total_income = item.fee_income + item.ledger_income;
    item.profit = item.total_income - item.ledger_expense;
    item.occupancy_rate = item.max_participants > 0 ? Math.round((item.registered_count / item.max_participants) * 100) : 0;
  });

  success(res, { list });
});

router.get('/difficulty-distribution', auth, requireAdmin, (req, res) => {
  const list = db().prepare(`
    SELECT difficulty, COUNT(*) as count
    FROM activities
    GROUP BY difficulty
    ORDER BY count DESC
  `).all();
  success(res, { list });
});

router.get('/monthly-activities', auth, requireAdmin, (req, res) => {
  const list = db().prepare(`
    SELECT
      strftime('%Y-%m', start_date) as month,
      COUNT(*) as activity_count,
      (SELECT COUNT(*) FROM registrations r
        JOIN activities a2 ON r.activity_id = a2.id
        WHERE r.status = 'registered' AND strftime('%Y-%m', a2.start_date) = strftime('%Y-%m', a.start_date)
      ) as registration_count
    FROM activities a
    WHERE start_date >= date('now', '-12 months')
    GROUP BY month
    ORDER BY month ASC
  `).all();
  success(res, { list });
});

router.get('/monthly-finance', auth, requireAdmin, (req, res) => {
  const list = db().prepare(`
    SELECT
      strftime('%Y-%m', record_date) as month,
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
    FROM ledger_records
    WHERE record_date >= date('now', '-12 months')
    GROUP BY month
    ORDER BY month ASC
  `).all();
  success(res, { list });
});

router.get('/equipment-usage', auth, requireAdmin, (req, res) => {
  const list = db().prepare(`
    SELECT e.id, e.name, e.category, e.total_count, e.available_count,
      (SELECT COUNT(*) FROM equipment_loans el WHERE el.equipment_id = e.id) as loan_count,
      (SELECT COUNT(*) FROM equipment_loans el WHERE el.equipment_id = e.id AND el.status = 'borrowed') as active_loans
    FROM equipment e
    ORDER BY loan_count DESC
    LIMIT 20
  `).all();
  success(res, { list });
});

module.exports = router;
