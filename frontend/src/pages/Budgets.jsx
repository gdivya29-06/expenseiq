import { useEffect, useState } from 'react';
import api from '../api';
import './Budgets.css';

export default function Budgets() {
  const now = new Date();
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category_id: '', monthly_limit: '' });
  const [loading, setLoading] = useState(true);

  const fetchBudgets = async () => {
    setLoading(true);
    const { data } = await api.get('/budgets', { params: { month, year } });
    setBudgets(data);
    setLoading(false);
  };

  useEffect(() => { fetchBudgets(); }, [month, year]);
  useEffect(() => { api.get('/categories').then(r => setCategories(r.data)); }, []);

  const saveBudget = async () => {
    if (!form.category_id || !form.monthly_limit) return;
    await api.post('/budgets', { ...form, month, year });
    setForm({ category_id: '', monthly_limit: '' });
    setShowForm(false);
    fetchBudgets();
  };

  const deleteBudget = async (id) => {
    if (!confirm('Remove this budget?')) return;
    await api.delete(`/budgets/${id}`);
    fetchBudgets();
  };

  const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div className="budgets-page">
      <div className="page-header">
        <div>
          <h1>Budgets</h1>
          <p className="page-sub">Set monthly limits by category</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="input-field" style={{ width: 'auto' }} value={month} onChange={e => setMonth(e.target.value)}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="input-field" style={{ width: 'auto' }} value={year} onChange={e => setYear(e.target.value)}>
            {[now.getFullYear(), now.getFullYear() - 1].map(y => <option key={y}>{y}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancel' : '+ Set Budget'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card add-budget-form">
          <h3>Set Budget</h3>
          <div className="form-row-budget">
            <div>
              <label className="label">Category</label>
              <select className="input-field" value={form.category_id}
                onChange={e => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Select category…</option>
                {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Monthly Limit (₹)</label>
              <input className="input-field" type="number" placeholder="e.g. 5000"
                value={form.monthly_limit} onChange={e => setForm({ ...form, monthly_limit: e.target.value })} />
            </div>
            <button className="btn btn-primary" onClick={saveBudget} style={{ alignSelf: 'flex-end' }}>Save Budget</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="loading-state">Loading budgets…</p>
      ) : budgets.length === 0 ? (
        <div className="card empty-state">
          <p>No budgets set for {MONTHS[month - 1]} {year}.</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ marginTop: '1rem' }}>Set your first budget</button>
        </div>
      ) : (
        <div className="budgets-grid">
          {budgets.map(b => {
            const pct = Math.min((b.spent / b.monthly_limit) * 100, 100);
            const isOver = b.spent > b.monthly_limit;
            return (
              <div className="card budget-card" key={b.budget_id}>
                <div className="budget-top">
                  <div className="budget-cat">
                    <span className="cat-icon">{b.icon}</span>
                    <span className="cat-name">{b.category_name}</span>
                  </div>
                  <button className="del-btn" onClick={() => deleteBudget(b.budget_id)}>✕</button>
                </div>

                <div className="budget-amounts">
                  <span className={isOver ? 'spent-over' : 'spent-ok'}>{fmt(b.spent)}</span>
                  <span className="limit-text">of {fmt(b.monthly_limit)}</span>
                </div>

                <div className="progress-track">
                  <div
                    className={`progress-fill ${isOver ? 'fill-over' : pct > 80 ? 'fill-warning' : 'fill-ok'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="budget-footer">
                  <span className={`pct-label ${isOver ? 'pct-over' : ''}`}>{pct.toFixed(0)}% used</span>
                  {isOver
                    ? <span className="over-badge">⚠ Over budget!</span>
                    : <span className="left-label">{fmt(b.monthly_limit - b.spent)} left</span>
                  }
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}