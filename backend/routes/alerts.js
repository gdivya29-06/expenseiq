const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/alerts
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM alerts WHERE user_id=? AND is_read=FALSE ORDER BY created_at DESC LIMIT 20',
      [req.user.user_id]
    );
    res.json({ alerts: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch alerts.' });
  }
});

// PUT /api/alerts/:id/read
router.put('/:id/read', auth, async (req, res) => {
  try {
    await db.query(
      'UPDATE alerts SET is_read=TRUE WHERE alert_id=? AND user_id=?',
      [req.params.id, req.user.user_id]
    );
    res.json({ message: 'Marked as read.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update alert.' });
  }
});

// PUT /api/alerts/read-all
router.put('/read-all', auth, async (req, res) => {
  try {
    await db.query('UPDATE alerts SET is_read=TRUE WHERE user_id=?', [req.user.user_id]);
    res.json({ message: 'All alerts marked as read.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all as read.' });
  }
});

module.exports = router;