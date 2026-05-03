import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './AddExpense.css';

export default function AddExpense() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    amount: '', description: '',
    expense_date: new Date().toISOString().split('T')[0],
    category_id: '', type: 'expense', gst_percent: 0, gst_amount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiSuggested, setAiSuggested] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanPreview, setScanPreview] = useState(null);
  const [quickText, setQuickText] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [impact, setImpact] = useState(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const fileRef = useRef();
  const recognitionRef = useRef(null);

  useEffect(() => {
    api.get('/categories')
      .then(r => setCategories(r.data))
      .catch(e => console.error('Categories error:', e));
  }, []);

  const handle = (field, value) => {
    const updated = { ...form, [field]: value };
    if (field === 'gst_percent' || field === 'amount') {
      const amt = parseFloat(field === 'amount' ? value : form.amount) || 0;
      const pct = parseFloat(field === 'gst_percent' ? value : form.gst_percent) || 0;
      updated.gst_amount = ((amt * pct) / 100).toFixed(2);
    }
    setForm(updated);
    // Clear impact when amount changes
    if (field === 'amount') setImpact(null);
  };

  const handleQuickAdd = async () => {
    if (!quickText.trim()) return;
    setQuickLoading(true);
    setError('');
    try {
      const { data } = await api.post('/ai/parse-text', { text: quickText });
      setForm(prev => ({
        ...prev,
        amount: data.amount ? String(data.amount) : prev.amount,
        description: data.description || prev.description,
        category_id: data.category_id || prev.category_id,
        expense_date: data.date || prev.expense_date,
        type: data.type || prev.type,
      }));
      setQuickText('');
      if (data.category_id) setAiSuggested(true);
      setImpact(null);
    } catch (e) {
      setError('AI parsing failed. Please fill in manually.');
    } finally {
      setQuickLoading(false);
    }
  };

  const handleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return setError('Voice not supported. Use Chrome.');
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const rec = new SR();
    rec.lang = 'en-IN';
    rec.onresult = e => { setQuickText(e.results[0][0].transcript); setListening(false); };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  const handleScan = async (file) => {
    if (!file) return;
    setScanning(true);
    setError('');
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result.split(',')[1];
      setScanPreview(e.target.result);
      try {
        const { data } = await api.post('/ai/scan-bill', { image: base64 });
        setForm(prev => ({
          ...prev,
          amount: data.amount ? String(data.amount) : prev.amount,
          description: data.description || prev.description,
          category_id: data.category_id || prev.category_id,
          expense_date: data.date || prev.expense_date,
        }));
        if (data.category_id) setAiSuggested(true);
        setImpact(null);
      } catch (e) {
        setError('Scan failed. Please fill manually.');
      } finally {
        setScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const checkImpact = async () => {
    if (!form.amount) return setError('Enter amount first.');
    setImpactLoading(true);
    try {
      const { data } = await api.post('/ai/impact-check', {
        amount: form.amount,
        description: form.description
      });
      setImpact(data);
    } catch (e) {
      console.error('Impact check error:', e);
    } finally {
      setImpactLoading(false);
    }
  };

  const submit = async () => {
    setError('');
    if (!form.amount) return setError('Please enter an amount.');
    if (!form.expense_date) return setError('Please select a date.');
    setLoading(true);
    try {
      await api.post('/expenses', form);
      navigate('/expenses');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save expense.');
    } finally {
      setLoading(false);
    }
  };

  const isMobile = /iPhone|Android|iPad/i.test(navigator.userAgent);

  const verdictColors = {
    safe: '#2E7D32',
    caution: '#F57C00',
    warning: '#E65100',
    danger: '#B71C1C'
  };

  return (
    <div className="add-expense-page">
      <div className="page-header">
        <div>
          <h1>Add Expense</h1>
          <p className="page-sub">Log a new transaction</p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Back</button>
      </div>

      <div className="add-grid">
        <div className="add-form card">
          {error && <div className="form-error">{error}</div>}

          {/* AI Quick Add */}
          <div className="quick-add-section">
            <label className="label">✦ AI Quick Add</label>
            <div className="quick-row">
              <input
                className="input-field"
                placeholder='e.g. "paid 250 for lunch at Dominos"'
                value={quickText}
                onChange={e => setQuickText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
              />
              <button className={`btn voice-btn ${listening ? 'listening' : ''}`} onClick={handleVoice}>
                {listening ? '🔴' : '🎤'}
              </button>
              <button className="btn btn-primary" onClick={handleQuickAdd} disabled={quickLoading || !quickText.trim()}>
                {quickLoading ? '…' : 'Parse'}
              </button>
            </div>
            <p className="quick-hint">Type or speak — AI fills the form automatically</p>
          </div>

          {/* Bill Scanner */}
          <div className="scan-section">
            <label className="label">📸 Scan Bill / Receipt</label>
            {isMobile ? (
              <button className="scan-btn" onClick={() => fileRef.current.click()}>
                📷 Open Camera to Scan Bill
              </button>
            ) : (
              <div className="drop-scan" onClick={() => fileRef.current.click()}>
                {scanPreview
                  ? <img src={scanPreview} alt="bill" className="scan-preview" />
                  : <><div className="scan-icon">🧾</div><p>Click to upload bill image</p><p className="scan-sub">JPG, PNG supported</p></>
                }
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*"
              capture={isMobile ? 'environment' : undefined}
              style={{ display: 'none' }}
              onChange={e => handleScan(e.target.files[0])} />
            {scanning && <div className="scanning-msg">🔍 AI is reading your bill…</div>}
          </div>

          <div className="divider"><span>or fill manually</span></div>

          {/* Type Toggle */}
          <div className="type-toggle">
            <button className={`toggle-btn ${form.type === 'expense' ? 'active-expense' : ''}`}
              onClick={() => handle('type', 'expense')}>↓ Expense</button>
            <button className={`toggle-btn ${form.type === 'income' ? 'active-income' : ''}`}
              onClick={() => handle('type', 'income')}>↑ Income</button>
          </div>

          {/* Amount */}
          <div className="amount-input-wrap">
            <span className="currency-symbol">₹</span>
            <input className="amount-big-input" type="number" placeholder="0"
              value={form.amount} onChange={e => handle('amount', e.target.value)} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label">Date</label>
              <input className="input-field" type="date" value={form.expense_date}
                onChange={e => handle('expense_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">GST %</label>
              <select className="input-field" value={form.gst_percent}
                onChange={e => handle('gst_percent', e.target.value)}>
                <option value={0}>No GST</option>
                <option value={5}>5%</option>
                <option value={12}>12%</option>
                <option value={18}>18%</option>
                <option value={28}>28%</option>
              </select>
            </div>
          </div>

          {form.gst_amount > 0 && (
            <div className="gst-info">GST Amount: <strong>₹{form.gst_amount}</strong></div>
          )}

          <div className="form-group">
            <label className="label">Description</label>
            <input className="input-field" placeholder="What was this for?"
              value={form.description} onChange={e => handle('description', e.target.value)} />
          </div>

          {/* Categories */}
          <div className="form-group">
            <label className="label">
              Category
              {aiSuggested && <span className="ai-badge">✦ AI suggested</span>}
            </label>
            {categories.length === 0
              ? <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Loading categories…</p>
              : <div className="category-pills">
                  {categories.map(c => (
                    <button key={c.category_id}
                      className={`pill ${form.category_id == c.category_id ? 'pill-active' : ''}`}
                      onClick={() => { handle('category_id', c.category_id); setAiSuggested(false); }}>
                      {c.icon} {c.name}
                    </button>
                  ))}
                </div>
            }
          </div>

          {/* Impact Checker */}
          {form.type === 'expense' && (
            <div className="impact-section">
              <div className="impact-header">
                <span className="label" style={{ margin: 0 }}>🔍 Can I afford this?</span>
                <button className="btn btn-ghost impact-check-btn" onClick={checkImpact} disabled={impactLoading || !form.amount}>
                  {impactLoading ? 'Checking…' : 'Check Impact'}
                </button>
              </div>

              {impact && (
                <div className="impact-result" style={{ borderColor: verdictColors[impact.verdict] }}>
                  <div className="impact-verdict" style={{ color: verdictColors[impact.verdict] }}>
                    {impact.verdict === 'safe' && '✅ Looks affordable!'}
                    {impact.verdict === 'caution' && '🟡 Spend carefully'}
                    {impact.verdict === 'warning' && '🟠 This is a significant spend'}
                    {impact.verdict === 'danger' && '🔴 This will hurt your budget!'}
                  </div>
                  <div className="impact-messages">
                    {(impact.messages || impact.warnings || []).map((m, i) => (
  <div key={i} className="impact-msg">{m}</div>
))}
{(impact.info || []).map((m, i) => (
  <div key={i} className="impact-msg" style={{color:'#50c878'}}>{m}</div>
))}
                  </div>
                </div>
              )}
            </div>
          )}

          <button className="btn btn-primary submit-btn" onClick={submit} disabled={loading}>
            {loading ? 'Saving…' : `Save ${form.type === 'income' ? 'Income' : 'Expense'} →`}
          </button>
        </div>

        {/* Tips */}
        <div className="tips-panel">
          <div className="card tip-card">
            <h4>💡 Quick Tips</h4>
            <ul>
              <li>Say <em>"paid 250 for lunch"</em> and hit Parse</li>
              <li>Scan any restaurant bill — AI reads total automatically</li>
              <li>Click "Check Impact" to see if you can afford it</li>
              <li>Add GST % for business purchases</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}