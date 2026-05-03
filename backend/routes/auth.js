const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, account_type, gst_number } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required.' });

    // Check if email exists
    const [existing] = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.length > 0)
      return res.status(409).json({ error: 'Email already registered.' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (name, email, password_hash, phone, account_type, gst_number) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hash, phone || null, account_type || 'individual', gst_number || null]
    );

    const token = jwt.sign({ user_id: result.insertId, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { user_id: result.insertId, name, email, account_type } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid email or password.' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password.' });

    const token = jwt.sign({ user_id: user.user_id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { user_id: user.user_id, name: user.name, email: user.email, account_type: user.account_type } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT user_id, name, email, phone, account_type, gst_number, created_at FROM users WHERE user_id = ?', [req.user.user_id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch user.' });
  }
});

module.exports = router;