import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../api';
import './Reports.css';

const COLORS = ['#2E6DA4','#6B8EB5','#87AECC','#B91C1C','#6B8E3E','#F2D25A','#5A7A9A'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Reports() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/reports/monthly', { params: { month, year } })
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, [month, year]);

  const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

  return (
    <div className="reports-page">
      <div className="page-header">
        <div>
          <h1>Monthly Report</h1>
          <p className="page-sub">Full breakdown of your finances</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select className="input-field" style={{ width: 'auto' }} value={month} onChange={e => setMonth(e.target.value)}>
            {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select className="input-field" style={{ width: 'auto' }} value={year} onChange={e => setYear(e.target.value)}>
            {[now.getFullYear(), now.getFullYear()-1].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? <p className="loading-state">Generating report…</p> : (
        <>
          {/* Summary KPIs */}
          <div className="report-kpis">
            <div className="card rkpi rkpi-expense">
              <div className="rkpi-label">Total Expenses</div>
              <div className="rkpi-value">{fmt(data?.total_expense)}</div>
            </div>
            <div className="card rkpi rkpi-income">
              <div className="rkpi-label">Total Income</div>
              <div className="rkpi-value">{fmt(data?.total_income)}</div>
            </div>
            <div className={`card rkpi ${data?.net >= 0 ? 'rkpi-profit' : 'rkpi-loss'}`}>
              <div className="rkpi-label">{data?.net >= 0 ? 'Profit' : 'Loss'}</div>
              <div className="rkpi-value">{fmt(Math.abs(data?.net))}</div>
            </div>
          </div>

          <div className="report-grid">
            {/* Daily trend */}
            <div className="card">
              <h3>Daily Spending — {MONTHS[month-1]} {year}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data?.daily || []}>
                  <XAxis dataKey="day" tick={{ fill: '#5A7A9A', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#5A7A9A', fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={v => '₹' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #C8D8EC', borderRadius: 8 }}
                    formatter={v => ['₹' + Number(v).toLocaleString('en-IN')]} />
                  <Bar dataKey="expenses" fill="#ed0404ff" radius={[4,4,0,0]} name="Expenses" />
                  <Bar dataKey="income" fill="#1dae03ff" radius={[4,4,0,0]} name="Income" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Category pie */}
            <div className="card">
              <h3>By Category</h3>
              {data?.byCategory?.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={data.byCategory} dataKey="total" nameKey="name"
                        cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                        {data.byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#fff', border: '1px solid #C8D8EC', borderRadius: 8 }}
                        formatter={v => ['₹' + Number(v).toLocaleString('en-IN')]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="cat-breakdown">
                    {data.byCategory.map((c, i) => (
                      <div key={i} className="cat-row">
                        <span className="cat-dot" style={{ background: COLORS[i % COLORS.length] }} />
                        <span>{c.icon} {c.name}</span>
                        <span className="cat-count">{c.count} txns</span>
                        <span className="cat-amt">{fmt(c.total)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <p className="no-data">No expenses this month</p>}
            </div>
          </div>

          {/* Top expenses */}
          <div className="card">
            <h3>Top 5 Largest Expenses</h3>
            {data?.topExpenses?.length > 0 ? (
              <table className="expenses-table" style={{ marginTop: '1rem' }}>
                <thead>
                  <tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr>
                </thead>
                <tbody>
                  {data.topExpenses.map(e => (
                    <tr key={e.expense_id}>
                      <td className="muted-text">{new Date(e.expense_date).toLocaleDateString('en-IN')}</td>
                      <td>{e.description || '—'}</td>
                      <td>{e.icon} {e.category_name || 'Uncategorized'}</td>
                      <td className="amt-expense">{fmt(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="no-data" style={{ marginTop: '1rem' }}>No expenses this month</p>}
          </div>
        </>
      )}
    </div>
  );
}