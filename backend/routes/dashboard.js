const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/dashboard/summary


// GET /api/dashboard/summary
router.get('/summary', auth, async (req, res) => {
  try {
    const uid = req.user.user_id;
    const now = new Date();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();

    // TOTAL SPENT
    const [[{ total_spent }]] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_spent 
       FROM expenses
       WHERE user_id=? AND type='expense' 
       AND MONTH(expense_date)=? AND YEAR(expense_date)=?`,
      [uid, m, y]
    );

    // TOTAL INCOME
    const [[{ total_income }]] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_income 
       FROM expenses
       WHERE user_id=? AND type='income' 
       AND MONTH(expense_date)=? AND YEAR(expense_date)=?`,
      [uid, m, y]
    );

    // ✅ FIXED CATEGORY QUERY
    const [byCategory] = await db.query(`
  SELECT 
    COALESCE(c.name, 'Uncategorized') as name,
    c.icon,
    c.color,
    SUM(e.amount) AS total
  FROM expenses e
  LEFT JOIN categories c ON e.category_id = c.category_id
  WHERE e.user_id = ?
    AND e.type = 'expense'
    AND MONTH(e.expense_date) = ?
    AND YEAR(e.expense_date) = ?
  GROUP BY e.category_id, c.name, c.icon, c.color
  ORDER BY total DESC
`, [uid, m, y]);

    // TREND
    const [trend] = await db.query(
      `SELECT 
         DATE_FORMAT(expense_date, '%b %Y') AS label,
         DATE_FORMAT(expense_date, '%Y-%m') AS sort_key,
         SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expenses,
         SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS income
       FROM expenses
       WHERE user_id=? 
       AND expense_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       GROUP BY DATE_FORMAT(expense_date, '%Y-%m'), DATE_FORMAT(expense_date, '%b %Y')
       ORDER BY sort_key ASC`,
      [uid]
    );

    // ALERTS
    const [[{ unread_alerts }]] = await db.query(
      'SELECT COUNT(*) AS unread_alerts FROM alerts WHERE user_id=? AND is_read=FALSE',
      [uid]
    );

    // RECENT
    const [recent] = await db.query(
      `SELECT e.*, c.name AS category_name, c.icon
       FROM expenses e 
       LEFT JOIN categories c ON e.category_id=c.category_id
       WHERE e.user_id=? 
       ORDER BY e.expense_date DESC, e.created_at DESC 
       LIMIT 5`,
      [uid]
    );

    res.json({
      total_spent,
      total_income,
      net: Number(total_income) - Number(total_spent),
      byCategory,
      trend,
      unread_alerts,
      recent
    });

  } catch (err) {
    console.error("DASHBOARD ERROR:", err);
    res.status(500).json({ error: 'Failed to load dashboard.' });
  }
});

module.exports = router;