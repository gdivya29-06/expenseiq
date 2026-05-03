import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import './Auth.css';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', account_type: 'individual', gst_number: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async () => {
    setError('');
    if (!form.name || !form.email || !form.password) return setError('Name, email and password are required.');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
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
        <h1 className="auth-headline">Your finances.<br />Finally organized.</h1>
        <p className="auth-sub">Join individuals and small businesses tracking smarter with ExpenseIQ.</p>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <h2>Create account</h2>
          <p className="auth-tagline">Free forever for individuals</p>

          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label className="label">Full Name</label>
            <input className="input-field" name="name" placeholder="Rahul Sharma"
              value={form.name} onChange={handle} />
          </div>

          <div className="form-group">
            <label className="label">Email</label>
            <input className="input-field" name="email" type="email"
              placeholder="rahul@example.com" value={form.email} onChange={handle} />
          </div>

          <div className="form-group">
            <label className="label">Password</label>
            <input className="input-field" name="password" type="password"
              placeholder="Min. 8 characters" value={form.password} onChange={handle} />
          </div>

          <div className="form-group">
            <label className="label">Account Type</label>
            <select className="input-field" name="account_type" value={form.account_type} onChange={handle}>
              <option value="individual">Individual</option>
              <option value="business">Business</option>
            </select>
          </div>

          {form.account_type === 'business' && (
            <div className="form-group">
              <label className="label">GST Number (optional)</label>
              <input className="input-field" name="gst_number" placeholder="22AAAAA0000A1Z5"
                value={form.gst_number} onChange={handle} />
            </div>
          )}

          <button className="btn btn-primary auth-btn" onClick={submit} disabled={loading}>
            {loading ? 'Creating account…' : 'Get Started →'}
          </button>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}