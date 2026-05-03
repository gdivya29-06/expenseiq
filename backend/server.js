const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' })); // needed for base64 images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/import', require('./routes/import'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/ai', require('./routes/ai'));

app.get('/', (req, res) => res.json({ message: 'ExpenseIQ API running ✅' }));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));