import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import './Expenses.css';

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), type: '', search: '' });
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = { ...filters, page, limit: LIMIT };
      const { data } = await api.get('/expenses', { params });
      setExpenses(data.expenses);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExpenses(); }, [filters, page]);

  const deleteExpense = async (id) => {
    if (!confirm('Delete this expense?')) return;
    await api.delete(`/expenses/${id}`);
    fetchExpenses();
  };

  const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
  const totalPages = Math.ceil(total / LIMIT);

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const currentYear = new Date().getFullYear();

  return (
    <div className="expenses-page">
      <div className="page-header">
        <div>
          <h1>Expenses</h1>
          <p className="page-sub">{total} total records</p>
        </div>
        <Link to="/expenses/add" className="btn btn-primary">+ Add Expense</Link>
      </div>

      {/* Filters */}
      <div className="card filters-card">
        <div className="filters-row">
          <div className="filter-group">
            <label className="label">Month</label>
            <select className="input-field" value={filters.month}
              onChange={e => setFilters({ ...filters, month: e.target.value })}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label className="label">Year</label>
            <select className="input-field" value={filters.year}
              onChange={e => setFilters({ ...filters, year: e.target.value })}>
              {[currentYear, currentYear - 1, currentYear - 2].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label className="label">Type</label>
            <select className="input-field" value={filters.type}
              onChange={e => setFilters({ ...filters, type: e.target.value })}>
              <option value="">All</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <div className="filter-group filter-search">
            <label className="label">Search</label>
            <input className="input-field" placeholder="Search description…"
              value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <p className="loading-state">Loading…</p>
        ) : expenses.length === 0 ? (
          <div className="empty-state">
            <p>No expenses found for selected filters.</p>
            <Link to="/expenses/add" className="btn btn-primary" style={{ marginTop: '1rem' }}>Add Expense</Link>
          </div>
        ) : (
          <table className="expenses-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Source</th>
                <th>Type</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.expense_id}>
                  <td className="muted-text">{new Date(e.expense_date).toLocaleDateString('en-IN')}</td>
                  <td>{e.description || '—'}</td>
                  <td>{e.icon} {e.category_name || 'Uncategorized'}</td>
                  <td><span className="source-badge">{e.source}</span></td>
                  <td><span className={`badge badge-${e.type}`}>{e.type}</span></td>
                  <td className={e.type === 'income' ? 'amt-income' : 'amt-expense'}>
                    {e.type === 'income' ? '+' : '-'}{fmt(e.amount)}
                  </td>
                  <td>
                    <button className="del-btn" onClick={() => deleteExpense(e.expense_id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button className="btn btn-ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span className="page-info">Page {page} of {totalPages}</span>
            <button className="btn btn-ghost" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}