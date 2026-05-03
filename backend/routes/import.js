const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const db = require('../db');
const auth = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/import/preview — parse file, return rows without saving
router.post('/preview', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0) return res.status(400).json({ error: 'File is empty.' });

    // Return first 10 rows for preview + column headers
    const headers = Object.keys(rows[0]);
    const preview = rows.slice(0, 10);

    res.json({ headers, preview, total_rows: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to parse file.' });
  }
});

// POST /api/import/confirm — save mapped rows to DB
router.post('/confirm', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    // column_map: { date: 'Date', amount: 'Amount', description: 'Narration', type: 'Type' }
    const column_map = JSON.parse(req.body.column_map || '{}');
    const default_category_id = req.body.category_id || null;

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    // Create import batch record
    const [batch] = await db.query(
      'INSERT INTO import_batches (user_id, filename, total_rows, status) VALUES (?, ?, ?, ?)',
      [req.user.user_id, req.file.originalname, rows.length, 'processing']
    );
    const batchId = batch.insertId;

    let imported = 0, failed = 0;
    const errors = [];

    for (const row of rows) {
      try {
        const rawDate = row[column_map.date];
        const rawAmount = parseFloat(String(row[column_map.amount]).replace(/[^0-9.-]/g, ''));
        const description = row[column_map.description] || '';
        const typeRaw = String(row[column_map.type] || '').toLowerCase();
        const type = typeRaw.includes('credit') || typeRaw.includes('income') ? 'income' : 'expense';

        // Parse date
        let expense_date;
        if (rawDate instanceof Date) {
          expense_date = rawDate.toISOString().split('T')[0];
        } else {
          const parsed = new Date(rawDate);
          if (isNaN(parsed)) throw new Error('Invalid date: ' + rawDate);
          expense_date = parsed.toISOString().split('T')[0];
        }

        if (isNaN(rawAmount)) throw new Error('Invalid amount: ' + row[column_map.amount]);

        await db.query(
          `INSERT INTO expenses (user_id, category_id, amount, description, expense_date, type, source, import_batch_id)
           VALUES (?, ?, ?, ?, ?, ?, 'import', ?)`,
          [req.user.user_id, default_category_id, Math.abs(rawAmount), description, expense_date, type, batchId]
        );
        imported++;
      } catch (e) {
        failed++;
        errors.push(e.message);
      }
    }

    await db.query(
      'UPDATE import_batches SET imported_rows=?, failed_rows=?, status=? WHERE batch_id=?',
      [imported, failed, 'completed', batchId]
    );

    res.json({ imported, failed, errors: errors.slice(0, 5), batch_id: batchId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Import failed.' });
  }
});

module.exports = router;