const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/categories
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM categories WHERE user_id IS NULL OR user_id = ? ORDER BY name',
      [req.user.user_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

// POST /api/categories — custom category
router.post('/', auth, async (req, res) => {
  try {
    const { name, icon, color } = req.body;
    const [result] = await db.query(
      'INSERT INTO categories (user_id, name, icon, color) VALUES (?, ?, ?, ?)',
      [req.user.user_id, name, icon || '📌', color || '#AEB6BF']
    );
    res.status(201).json({ category_id: result.insertId, name, icon, color });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add category.' });
  }
});

module.exports = router;