const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/budgets — get budgets with spent amount
router.get('/', auth, async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = month || new Date().getMonth() + 1;
    const y = year || new Date().getFullYear();

    const [budgets] = await db.query(
      `SELECT b.*, c.name AS category_name, c.icon, c.color,
        COALESCE((
          SELECT SUM(e.amount) FROM expenses e
          WHERE e.user_id = b.user_id AND e.category_id = b.category_id
          AND MONTH(e.expense_date) = b.month AND YEAR(e.expense_date) = b.year
          AND e.type = 'expense'
        ), 0) AS spent
       FROM budgets b
       LEFT JOIN categories c ON b.category_id = c.category_id
       WHERE b.user_id = ? AND b.month = ? AND b.year = ?`,
      [req.user.user_id, m, y]
    );

    res.json(budgets);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch budgets.' });
  }
});

// POST /api/budgets — set budget
router.post('/', auth, async (req, res) => {
  try {
    const { category_id, monthly_limit, month, year } = req.body;

    // Upsert: update if exists, insert if not
    const [existing] = await db.query(
      'SELECT budget_id FROM budgets WHERE user_id=? AND category_id=? AND month=? AND year=?',
      [req.user.user_id, category_id, month, year]
    );

    if (existing.length > 0) {
      await db.query('UPDATE budgets SET monthly_limit=? WHERE budget_id=?', [monthly_limit, existing[0].budget_id]);
      res.json({ message: 'Budget updated.' });
    } else {
      const [result] = await db.query(
        'INSERT INTO budgets (user_id, category_id, monthly_limit, month, year) VALUES (?, ?, ?, ?, ?)',
        [req.user.user_id, category_id, monthly_limit, month, year]
      );
      res.status(201).json({ budget_id: result.insertId, message: 'Budget set.' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to set budget.' });
  }
});

// DELETE /api/budgets/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM budgets WHERE budget_id=? AND user_id=?', [req.params.id, req.user.user_id]);
    res.json({ message: 'Budget deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete budget.' });
  }
});

module.exports = router;