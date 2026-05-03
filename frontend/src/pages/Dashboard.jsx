import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import api from '../api';
import './Dashboard.css';

const COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6','#ec4899','#8b5cf6'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [patterns, setPatterns] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSlice, setActiveSlice] = useState(null);
  const [activeBar, setActiveBar] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/summary'),
      api.post('/ai/spending-patterns').catch(() => null),
      api.get('/alerts').catch(() => null),
    ]).then(([summaryRes, patternRes, alertsRes]) => {
      setData(summaryRes.data);
      if (patternRes) setPatterns(patternRes.data);
      if (alertsRes) setAlerts(alertsRes.data?.alerts || []);
    }).finally(() => setLoading(false));
  }, []);

  const markAlertRead = async (id) => {
    try {
      await api.put(`/alerts/${id}/read`);
      setAlerts(prev => prev.filter(a => a.alert_id !== id));
    } catch(e) {}
  };

  if (loading) return <div className="loading-state">Loading dashboard…</div>;

  const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
  const totalSpent = Number(data?.total_spent || 0);
  const totalIncome = Number(data?.total_income || 0);
  const net = Number(data?.net || 0);

  const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.fill, fontSize: '0.85rem' }}>
              {p.name}: {fmt(p.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const total = (data.byCategory || []).reduce((s, c) => s + Number(c.total), 0);
      const pct = total > 0 ? ((Number(payload[0].value) / total) * 100).toFixed(1) : 0;
      return (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <p style={{ fontWeight: 600 }}>{payload[0].name}</p>
          <p style={{ color: payload[0].fill, fontSize: '0.85rem' }}>{fmt(payload[0].value)} · {pct}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="dashboard">
      <div className="dash-header">
        <div>
          <h1>Good {getGreeting()}, {user.name?.split(' ')[0]} 👋</h1>
          <p className="dash-sub">Here's your financial overview for {getMonthYear()}</p>
        </div>
        <Link to="/expenses/add" className="btn btn-primary">+ Add Expense</Link>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="alerts-section">
          {alerts.slice(0, 3).map(a => (
            <div key={a.alert_id} className={`alert-banner alert-${a.type || 'info'}`}>
              <span className="alert-icon">
                {a.type === 'danger' ? '🚨' : a.type === 'warning' ? '⚠️' : 'ℹ️'}
              </span>
              <span className="alert-msg">{a.message}</span>
              <button className="alert-dismiss" onClick={() => markAlertRead(a.alert_id)}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-spent">
          <div className="kpi-label">Total Spent</div>
          <div className="kpi-value">{fmt(totalSpent)}</div>
          <div className="kpi-sub">This month</div>
        </div>
        <div className="kpi-card kpi-income">
          <div className="kpi-label">Total Income</div>
          <div className="kpi-value">{fmt(totalIncome)}</div>
          <div className="kpi-sub">This month</div>
        </div>
        <div className={`kpi-card ${net >= 0 ? 'kpi-positive' : 'kpi-negative'}`}>
          <div className="kpi-label">Net Balance</div>
          <div className="kpi-value">{fmt(net)}</div>
          <div className="kpi-sub">
            {totalIncome === 0 && totalSpent === 0 ? 'No transactions yet'
              : net >= 0 ? 'You are saving ✓' : 'Overspending!'}
          </div>
        </div>
        <div className="kpi-card kpi-alert">
          <div className="kpi-label">Alerts</div>
          <div className="kpi-value">{alerts.length || data?.unread_alerts || 0}</div>
          <div className="kpi-sub">Unread notifications</div>
        </div>
      </div>

      {/* Charts */}
      <div className="dash-charts">

        {/* Bar Chart */}
        <div className="card chart-card">
          <h3>📈 6-Month Trend</h3>
          {data?.trend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.trend} barGap={4} onMouseLeave={() => setActiveBar(null)}>
                <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => '₹' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)} />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar dataKey="expenses" radius={[6,6,0,0]} name="Expenses" onMouseEnter={(_, i) => setActiveBar(i)}>
                  {data.trend.map((_, i) => (
                    <Cell key={i}
                      fill={activeBar === i ? '#ec280aff' : '#ec280aff'}
                      opacity={activeBar !== null && activeBar !== i ? 0.5 : 1}
                    />
                  ))}
                </Bar>
                <Bar dataKey="income" radius={[6,6,0,0]} name="Income" onMouseEnter={(_, i) => setActiveBar(i)}>
                  {data.trend.map((_, i) => (
                    <Cell key={i}
                      fill={activeBar === i ? '#1dae03ff' : '#1dae03ff'}
                      opacity={activeBar !== null && activeBar !== i ? 0.5 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">Add expenses to see your trend chart</div>
          )}
          <div className="chart-legend-row">
            <span className="cl-dot" style={{background:'#6366f1'}} />
            <span>Expenses</span>
            <span className="cl-dot" style={{background:'#10b981', marginLeft:16}} />
            <span>Income</span>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="card chart-card">
          <h3>🥧 By Category</h3>
          {data?.byCategory?.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data.byCategory}
                    dataKey="total"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    onMouseEnter={(_, i) => setActiveSlice(i)}
                    onMouseLeave={() => setActiveSlice(null)}
                  >
                    {data.byCategory.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={COLORS[i % COLORS.length]}
                        stroke="#fff"
                        strokeWidth={activeSlice === i ? 3 : 2}
                        opacity={activeSlice !== null && activeSlice !== i ? 0.45 : 1}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="cat-legend">
                {data.byCategory.slice(0, 6).map((c, i) => (
                  <div
                    key={i}
                    className="legend-item"
                    onMouseEnter={() => setActiveSlice(i)}
                    onMouseLeave={() => setActiveSlice(null)}
                    style={{
                      cursor: 'pointer',
                      padding: '4px 6px',
                      borderRadius: 6,
                      background: activeSlice === i ? 'rgba(99,102,241,0.07)' : 'transparent',
                      transition: 'background 0.2s'
                    }}
                  >
                    <span className="legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
                    <span>{c.name}</span>
                    <span className="legend-val">{fmt(c.total)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="no-data">No expense data yet</p>}
        </div>
      </div>

      {/* Spending Pattern Analyzer */}
      {patterns && patterns.patterns?.length > 0 && (
        <div className="card pattern-card">
          <div className="pattern-header">
            <h3>🔥 Where is your money going?</h3>
            <span className="pattern-sub">AI Spending Analysis</span>
          </div>
          <div className="pattern-stats">
            <div className="pattern-stat">
              <span className="ps-value">{patterns.topCategoryPercent}%</span>
              <span className="ps-label">spent on {patterns.topCategory}</span>
            </div>
            <div className="pattern-stat">
              <span className="ps-value">{patterns.top2Percent}%</span>
              <span className="ps-label">top 2 categories combined</span>
            </div>
            <div className="pattern-stat">
              <span className="ps-value">{fmt(patterns.totalSpent)}</span>
              <span className="ps-label">total this month</span>
            </div>
          </div>
          <div className="pattern-bars">
            {patterns.patterns.map((p, i) => (
              <div key={i} className="pattern-bar-row">
                <div className="pbar-label">
                  <span>{p.category}</span>
                  <span className="pbar-amount">{fmt(p.total)}</span>
                </div>
                <div className="pbar-track">
                  <div className="pbar-fill" style={{ width: `${p.percent}%`, background: COLORS[i % COLORS.length] }} />
                </div>
                <span className="pbar-pct">{p.percent}%</span>
              </div>
            ))}
          </div>
          {patterns.aiComment && (
            <div className="pattern-ai-comment">
              <span className="ai-label">✦ AI says</span>
              <p>{patterns.aiComment}</p>
            </div>
          )}
        </div>
      )}

      {/* Recent Transactions */}
      <div className="card">
        <div className="section-header">
          <h3>Recent Transactions</h3>
          <Link to="/expenses" className="btn btn-ghost" style={{ fontSize: '0.82rem', padding: '0.4rem 0.9rem' }}>View All →</Link>
        </div>
        {data?.recent?.length > 0 ? (
          <table className="expenses-table">
            <thead>
              <tr><th>Date</th><th>Description</th><th>Category</th><th>Type</th><th>Amount</th></tr>
            </thead>
            <tbody>
              {data.recent.map(e => (
                <tr key={e.expense_id}>
                  <td className="muted-text">{new Date(e.expense_date).toLocaleDateString('en-IN')}</td>
                  <td>{e.description || '—'}</td>
                  <td>{e.icon} {e.category_name || 'Uncategorized'}</td>
                  <td><span className={`badge badge-${e.type}`}>{e.type}</span></td>
                  <td className={e.type === 'income' ? 'amt-income' : 'amt-expense'}>
                    {e.type === 'income' ? '+' : '-'}{fmt(e.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-data-block">
            <p>No expenses yet.</p>
            <Link to="/expenses/add" className="btn btn-primary" style={{ marginTop: '1rem' }}>Add your first expense</Link>
          </div>
        )}
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function getMonthYear() {
  return new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}