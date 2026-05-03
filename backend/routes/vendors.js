const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/vendors
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM vendors WHERE user_id=? ORDER BY name',
      [req.user.user_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vendors.' });
  }
});

// POST /api/vendors
router.post('/', auth, async (req, res) => {
  try {
    const { name, contact, category } = req.body;
    if (!name) return res.status(400).json({ error: 'Vendor name is required.' });
    const [result] = await db.query(
      'INSERT INTO vendors (user_id, name, contact, category) VALUES (?, ?, ?, ?)',
      [req.user.user_id, name, contact || null, category || null]
    );
    res.status(201).json({ vendor_id: result.insertId, name, contact, category });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add vendor.' });
  }
});

// DELETE /api/vendors/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM vendors WHERE vendor_id=? AND user_id=?', [req.params.id, req.user.user_id]);
    res.json({ message: 'Deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete vendor.' });
  }
});

// GET /api/vendors/:id/payments
router.get('/:id/payments', auth, async (req, res) => {
  try {
    const [payments] = await db.query(
      `SELECT vp.*, v.name AS vendor_name FROM vendor_payments vp
       JOIN vendors v ON vp.vendor_id = v.vendor_id
       WHERE vp.vendor_id=? AND v.user_id=? ORDER BY vp.payment_date DESC`,
      [req.params.id, req.user.user_id]
    );
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payments.' });
  }
});

// POST /api/vendors/:id/payments
router.post('/:id/payments', auth, async (req, res) => {
  try {
    const { amount, payment_date, description, status } = req.body;
    const [result] = await db.query(
      'INSERT INTO vendor_payments (vendor_id, amount, payment_date, description, status) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, amount, payment_date, description || null, status || 'paid']
    );
    res.status(201).json({ payment_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add payment.' });
  }
});

module.exports = router;