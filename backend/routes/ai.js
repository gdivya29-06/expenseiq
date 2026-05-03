const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../db');

const KEY = process.env.OPENAI_API_KEY;
const today = () => new Date().toISOString().split('T')[0];

const CATS = {'food':1,'lunch':1,'dinner':1,'breakfast':1,'restaurant':1,'swiggy':1,'zomato':1,'cafe':1,'coffee':1,'java':1,'transport':2,'auto':2,'uber':2,'ola':2,'petrol':2,'bus':2,'metro':2,'shopping':3,'amazon':3,'flipkart':3,'entertainment':4,'movie':4,'netflix':4,'utilities':5,'electricity':5,'wifi':5,'healthcare':6,'doctor':6,'medicine':6,'education':7,'fees':7,'college':7,'rent':8,'salary':9,'income':9};

function catId(text) {
  const l = (text||'').toLowerCase();
  for (const [k,v] of Object.entries(CATS)) if (l.includes(k)) return v;
  return 10;
}

router.post('/parse-text', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required.' });
    console.log('Parsing:', text);
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 150,
        messages: [{ role: 'user', content: `Parse this expense: "${text}". Today is ${today()}. Reply with ONLY this JSON (no markdown): {"amount":200,"description":"lunch","type":"expense","date":"${today()}","category":"food"}` }]
      })
    });
    const d = await r.json();
    console.log('OpenAI response:', JSON.stringify(d));
    const content = d.choices[0].message.content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(content);
    res.json({ amount: parsed.amount, description: parsed.description, type: parsed.type||'expense', date: parsed.date||today(), category_id: catId(parsed.category+' '+parsed.description) });
  } catch(e) {
    console.error('ERROR:', e.message, e.stack);
    res.status(500).json({ error: e.message });
  }
});

router.post('/scan-bill', auth, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'Image required.' });
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 200,
        messages: [{ role: 'user', content: [
          { type: 'text', text: `Extract from this bill. Reply ONLY with JSON (no markdown): {"amount":0,"description":"items","date":"${today()}","category":"food"}` },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}`, detail: 'high' } }
        ]}]
      })
    });
    const d = await r.json();
    const content = d.choices[0].message.content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(content);
    res.json({ amount: parsed.amount, description: parsed.description, date: parsed.date||today(), category_id: catId(parsed.category+' '+parsed.description) });
  } catch(e) {
    console.error('scan error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.post('/insights', auth, async (req, res) => {
  try {
    const uid = req.user.user_id;
    const now = new Date();
    const [rows] = await db.query(
      `SELECT c.name as category, SUM(e.amount) as total FROM expenses e LEFT JOIN categories c ON e.category_id=c.category_id WHERE e.user_id=? AND MONTH(e.expense_date)=? AND YEAR(e.expense_date)=? AND e.type='expense' GROUP BY c.name ORDER BY total DESC`,
      [uid, now.getMonth()+1, now.getFullYear()]
    );
    if (!rows.length) return res.json({ insight: "Start adding expenses to get AI insights!" });
    const summary = rows.map(e => `${e.category}: Rs${Number(e.total).toFixed(0)}`).join(', ');
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 100, messages: [{ role: 'user', content: `Indian user spent: ${summary}. Give 2 short friendly money tips. Max 50 words.` }] })
    });
    const d = await r.json();
    res.json({ insight: d.choices?.[0]?.message?.content || 'Keep tracking!' });
  } catch(e) {
    res.json({ insight: "Keep tracking your expenses!" });
  }
});
router.post('/impact-check', auth, async (req, res) => {
  try {
    const { amount, description, category_id } = req.body;
    const uid = req.user.user_id;
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Get this month's total spending
    const [[{ spent }]] = await db.query(
      `SELECT COALESCE(SUM(amount),0) as spent FROM expenses 
       WHERE user_id=? AND type='expense' AND MONTH(expense_date)=? AND YEAR(expense_date)=?`,
      [uid, month, year]
    );

    // Get this month's total income
    const [[{ income }]] = await db.query(
      `SELECT COALESCE(SUM(amount),0) as income FROM expenses 
       WHERE user_id=? AND type='income' AND MONTH(expense_date)=? AND YEAR(expense_date)=?`,
      [uid, month, year]
    );

    // Get budget for this category
    const [budgets] = await db.query(
      `SELECT monthly_limit FROM budgets WHERE user_id=? AND category_id=? AND month=? AND year=?`,
      [uid, category_id, month, year]
    );

    // Get category spending this month
    const [[{ catSpent }]] = await db.query(
      `SELECT COALESCE(SUM(amount),0) as catSpent FROM expenses 
       WHERE user_id=? AND category_id=? AND type='expense' AND MONTH(expense_date)=? AND YEAR(expense_date)=?`,
      [uid, category_id, month, year]
    );

    const newAmt = parseFloat(amount) || 0;
    const totalAfter = parseFloat(spent) + newAmt;
    const savings = parseFloat(income) - totalAfter;
    const savingsBefore = parseFloat(income) - parseFloat(spent);
    const savingsImpact = savingsBefore > 0 ? ((newAmt / savingsBefore) * 100).toFixed(0) : 0;
    const spendingShare = income > 0 ? ((totalAfter / income) * 100).toFixed(0) : null;

    const warnings = [];
    const info = [];

    // Budget warning
    if (budgets.length > 0) {
      const limit = parseFloat(budgets[0].monthly_limit);
      const catAfter = parseFloat(catSpent) + newAmt;
      const pct = ((catAfter / limit) * 100).toFixed(0);
      if (catAfter > limit) {
        warnings.push(`⚠️ This will exceed your category budget by ₹${(catAfter - limit).toFixed(0)}`);
      } else if (pct >= 80) {
        warnings.push(`🔶 You'll have used ${pct}% of your category budget`);
      }
    }

    // Savings impact
    if (income > 0) {
      if (savings < 0) {
        warnings.push(`🚨 This puts you ₹${Math.abs(savings).toFixed(0)} into deficit this month`);
      } else if (savingsImpact > 0) {
        warnings.push(`💸 This reduces your savings by ${savingsImpact}%`);
      }
    }

    // Spending share of income
    if (spendingShare > 90) {
      warnings.push(`🔴 You'll have spent ${spendingShare}% of your income this month`);
    } else if (spendingShare > 70) {
      info.push(`📊 You'll have spent ${spendingShare}% of your income this month`);
    }

    // Positive info
    if (warnings.length === 0 && savings > 0) {
      info.push(`✅ You'll still have ₹${savings.toFixed(0)} left this month`);
    }

    res.json({ warnings, info, totalAfter, savings, income: parseFloat(income) });
  } catch(e) {
    console.error('impact-check error:', e.message);
    res.status(500).json({ error: e.message });
  }
});
router.post('/check-recurring', auth, async (req, res) => {
  try {
    const { description } = req.body;
    if (!description || description.length < 3) return res.json({ isRecurring: false });
    const uid = req.user.user_id;

    // Check if same description appeared in last 2 months
    const [rows] = await db.query(
      `SELECT COUNT(DISTINCT MONTH(expense_date)) as months, AVG(amount) as avg_amount
       FROM expenses 
       WHERE user_id=? AND type='expense'
       AND description LIKE ?
       AND expense_date >= DATE_SUB(NOW(), INTERVAL 3 MONTH)`,
      [uid, `%${description}%`]
    );

    const isRecurring = rows[0].months >= 2;
    res.json({ 
      isRecurring, 
      avgAmount: isRecurring ? Math.round(rows[0].avg_amount) : null,
      months: rows[0].months 
    });
  } catch(e) {
    res.json({ isRecurring: false });
  }
});
module.exports = router;