import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../api';
import './Layout.css';

const INDIVIDUAL_NAV = [
  { to: '/', label: 'Dashboard', icon: '⬡' },
  { to: '/expenses', label: 'My Expenses', icon: '↕' },
  { to: '/expenses/add', label: 'Add Expense', icon: '+' },
  { to: '/budgets', label: 'Budgets', icon: '◎' },
  { to: '/reports', label: 'Reports', icon: '📊' },
];

const BUSINESS_NAV = [
  { to: '/', label: 'Dashboard', icon: '⬡' },
  { to: '/expenses', label: 'Expenses', icon: '↕' },
  { to: '/expenses/add', label: 'Add Expense', icon: '+' },
  { to: '/budgets', label: 'Budgets', icon: '◎' },
  { to: '/reports', label: 'Reports', icon: '📊' },
  { to: '/vendors', label: 'Vendors', icon: '🤝' },
  { to: '/import', label: 'Import Data', icon: '⇧' },
];

export default function Layout() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [collapsed, setCollapsed] = useState(false);
  const [insight, setInsight] = useState('');

  const isBusiness = user.account_type === 'business';
  const NAV = isBusiness ? BUSINESS_NAV : INDIVIDUAL_NAV;

  useEffect(() => {
    api.post('/ai/insights')
      .then(r => setInsight(r.data.insight))
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className={`layout ${collapsed ? 'collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">◈</span>
          {!collapsed && <span className="logo-text">ExpenseIQ</span>}
        </div>

        {!collapsed && isBusiness && (
          <div className="account-type-badge business">🏢 Business</div>
        )}
        {!collapsed && !isBusiness && (
          <div className="account-type-badge individual">👤 Personal</div>
        )}

        <nav className="sidebar-nav">
          {NAV.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">{icon}</span>
              {!collapsed && <span className="nav-label">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {!collapsed && insight && (
          <div className="insight-box">
            <div className="insight-label">✦ AI Insight</div>
            <p className="insight-text">{insight}</p>
          </div>
        )}

        <div className="sidebar-footer">
          {!collapsed && (
            <div className="user-info">
              <div className="user-avatar">{user.name?.[0] || 'U'}</div>
              <div>
                <div className="user-name">{user.name}</div>
                <div className="user-type">{user.account_type || 'individual'}</div>
              </div>
            </div>
          )}
          <button className="logout-btn" onClick={handleLogout} title="Logout">⏻</button>
        </div>

        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? '›' : '‹'}
        </button>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}