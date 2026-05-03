import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import './Auth.css';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async () => {
    setError('');
    if (!form.email || !form.password) return setError('Fill in all fields.');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <span className="auth-logo">◈</span>
          <span className="auth-logo-text">ExpenseIQ</span>
        </div>
        <h1 className="auth-headline">Track every rupee.<br />Grow every day.</h1>
        <p className="auth-sub">The smart expense tracker for individuals and businesses in India.</p>
        <div className="auth-stats">
          <div className="stat"><span>₹0</span><small>Hidden fees</small></div>
          <div className="stat"><span>GST</span><small>Ready reports</small></div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <h2>Welcome back</h2>
          <p className="auth-tagline">Sign in to your account</p>

          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label className="label">Email</label>
            <input className="input-field" name="email" type="email"
              placeholder="you@example.com" value={form.email} onChange={handle} />
          </div>

          <div className="form-group">
            <label className="label">Password</label>
            <input className="input-field" name="password" type="password"
              placeholder="••••••••" value={form.password} onChange={handle}
              onKeyDown={(e) => e.key === 'Enter' && submit()} />
          </div>

          <button className="btn btn-primary auth-btn" onClick={submit} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>

          <p className="auth-switch">
            Don't have an account? <Link to="/register">Register free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}