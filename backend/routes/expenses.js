const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/expenses
router.get('/', auth, async (req, res) => {
  try {
    const { month, year, category_id, type, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT e.*, c.name AS category_name, c.icon, c.color
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.category_id
      WHERE e.user_id = ?
    `;
    const params = [req.user.user_id];

    if (month && year) {
      query += ' AND MONTH(e.expense_date) = ? AND YEAR(e.expense_date) = ?';
      params.push(parseInt(month), parseInt(year));
    }
    if (category_id) { query += ' AND e.category_id = ?'; params.push(category_id); }
    if (type) { query += ' AND e.type = ?'; params.push(type); }
    if (search) { query += ' AND e.description LIKE ?'; params.push(`%${search}%`); }

    query += ' ORDER BY e.expense_date DESC, e.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await db.query(query, params);
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM expenses WHERE user_id = ?', [req.user.user_id]);

    res.json({ expenses: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('GET expenses error:', err);
    res.status(500).json({ error: 'Failed to fetch expenses.' });
  }
});

// POST /api/expenses
router.post('/', auth, async (req, res) => {
  try {
    const { category_id, amount, description, expense_date, type, gst_amount, gst_percent } = req.body;

    console.log('Adding expense:', req.body);

    if (!amount || !expense_date) {
      return res.status(400).json({ error: 'Amount and date are required.' });
    }

    const [result] = await db.query(
      `INSERT INTO expenses (user_id, category_id, amount, description, expense_date, type, gst_amount, gst_percent, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'manual')`,
      [
        req.user.user_id,
        category_id || null,
        parseFloat(amount),
        description || null,
        expense_date,
        type || 'expense',
        parseFloat(gst_amount) || 0,
        parseFloat(gst_percent) || 0
      ]
    );

    const [newExp] = await db.query(
      `SELECT e.*, c.name AS category_name, c.icon 
       FROM expenses e 
       LEFT JOIN categories c ON e.category_id = c.category_id 
       WHERE e.expense_id = ?`,
      [result.insertId]
    );

    res.status(201).json(newExp[0]);
  } catch (err) {
    console.error('POST expense error:', err);
    res.status(500).json({ error: err.message || 'Failed to add expense.' });
  }
});

// PUT /api/expenses/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { category_id, amount, description, expense_date, type, gst_amount, gst_percent } = req.body;
    await db.query(
      `UPDATE expenses SET category_id=?, amount=?, description=?, expense_date=?, type=?, gst_amount=?, gst_percent=?
       WHERE expense_id=? AND user_id=?`,
      [category_id || null, parseFloat(amount), description, expense_date, type,
       parseFloat(gst_amount) || 0, parseFloat(gst_percent) || 0, req.params.id, req.user.user_id]
    );
    res.json({ message: 'Updated successfully.' });
  } catch (err) {
    console.error('PUT expense error:', err);
    res.status(500).json({ error: 'Failed to update expense.' });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM expenses WHERE expense_id = ? AND user_id = ?', [req.params.id, req.user.user_id]);
    res.json({ message: 'Deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete expense.' });
  }
});

module.exports = router;