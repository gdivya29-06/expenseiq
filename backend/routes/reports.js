const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/reports/monthly?month=4&year=2026
router.get('/monthly', auth, async (req, res) => {
  try {
    const uid = req.user.user_id;
    const { month, year } = req.query;
    const m = month || new Date().getMonth() + 1;
    const y = year || new Date().getFullYear();

    // Summary
    const [[summary]] = await db.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS total_expense,
        COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) AS total_income
       FROM expenses WHERE user_id=? AND MONTH(expense_date)=? AND YEAR(expense_date)=?`,
      [uid, m, y]
    );

    // By category
    const [byCategory] = await db.query(
      `SELECT c.name, c.icon, SUM(e.amount) AS total, COUNT(*) AS count
       FROM expenses e
       JOIN categories c ON e.category_id = c.category_id
       WHERE e.user_id=? AND e.type='expense' AND MONTH(e.expense_date)=? AND YEAR(e.expense_date)=?
       GROUP BY c.category_id, c.name, c.icon ORDER BY total DESC`,
      [uid, m, y]
    );

    // Day by day breakdown
    const [daily] = await db.query(
      `SELECT DAY(expense_date) AS day, 
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expenses,
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS income
       FROM expenses
       WHERE user_id=? AND MONTH(expense_date)=? AND YEAR(expense_date)=?
       GROUP BY DAY(expense_date) ORDER BY day`,
      [uid, m, y]
    );

    // Top 5 largest expenses
    const [topExpenses] = await db.query(
      `SELECT e.*, c.name AS category_name, c.icon
       FROM expenses e LEFT JOIN categories c ON e.category_id=c.category_id
       WHERE e.user_id=? AND e.type='expense' AND MONTH(e.expense_date)=? AND YEAR(e.expense_date)=?
       ORDER BY e.amount DESC LIMIT 5`,
      [uid, m, y]
    );

    res.json({
      month: m, year: y,
      total_expense: summary.total_expense,
      total_income: summary.total_income,
      net: Number(summary.total_income) - Number(summary.total_expense),
      byCategory, daily, topExpenses
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate report.' });
  }
});

module.exports = router;