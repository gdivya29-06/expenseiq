import { useState } from 'react';
import api from '../api';
import './Import.css';

const STEPS = ['Upload File', 'Map Columns', 'Preview', 'Done'];

export default function Import() {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [preview, setPreview] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [columnMap, setColumnMap] = useState({ date: '', amount: '', description: '', type: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const uploadPreview = async () => {
    if (!file) return setError('Please select a file first.');
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/import/preview', fd);
      setHeaders(data.headers);
      setPreview(data.preview);
      setTotalRows(data.total_rows);

      // Auto-detect common column names
      const auto = { date: '', amount: '', description: '', type: '' };
      for (const h of data.headers) {
        const l = h.toLowerCase();
        if (!auto.date && (l.includes('date') || l === 'dt')) auto.date = h;
        if (!auto.amount && (l.includes('amount') || l.includes('amt') || l.includes('debit') || l.includes('credit'))) auto.amount = h;
        if (!auto.description && (l.includes('desc') || l.includes('narr') || l.includes('particular') || l.includes('remarks'))) auto.description = h;
        if (!auto.type && (l.includes('type') || l.includes('cr/dr') || l === 'dr' || l === 'cr')) auto.type = h;
      }
      setColumnMap(auto);
      setStep(1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to parse file.');
    } finally {
      setLoading(false);
    }
  };

  const confirmImport = async () => {
    if (!columnMap.date || !columnMap.amount) return setError('Date and Amount columns are required.');
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('column_map', JSON.stringify(columnMap));
      const { data } = await api.post('/import/confirm', fd);
      setResult(data);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Import failed.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(0); setFile(null); setHeaders([]); setPreview([]);
    setColumnMap({ date: '', amount: '', description: '', type: '' });
    setResult(null); setError('');
  };

  return (
    <div className="import-page">
      <div className="page-header">
        <div>
          <h1>Import Spreadsheet</h1>
          <p className="page-sub">Upload your bank statement or Excel expense file</p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="steps-bar">
        {STEPS.map((s, i) => (
          <div key={i} className={`step-item ${i === step ? 'step-active' : i < step ? 'step-done' : ''}`}>
            <div className="step-dot">{i < step ? '✓' : i + 1}</div>
            <span className="step-label">{s}</span>
          </div>
        ))}
      </div>

      {error && <div className="import-error">{error}</div>}

      {/* Step 0: Upload */}
      {step === 0 && (
        <div className="card import-card">
          <div className="drop-zone" onClick={() => document.getElementById('file-inp').click()}>
            <div className="drop-icon">⇧</div>
            <p className="drop-main">{file ? file.name : 'Click to upload or drag & drop'}</p>
            <p className="drop-sub">Supports .xlsx, .xls, .csv — max 10MB</p>
            <input id="file-inp" type="file" accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }} onChange={e => { setFile(e.target.files[0]); setError(''); }} />
          </div>

          <div className="import-tips">
            <h4>Your file should have columns like:</h4>
            <div className="example-cols">
              <span>Date</span><span>Amount</span><span>Description / Narration</span><span>Type (optional)</span>
            </div>
            <p className="tip-text">Works great with HDFC, SBI, ICICI bank statement exports and any custom Excel sheets!</p>
          </div>

          <button className="btn btn-primary" onClick={uploadPreview} disabled={loading || !file}>
            {loading ? 'Parsing…' : 'Parse File →'}
          </button>
        </div>
      )}

      {/* Step 1: Map Columns */}
      {step === 1 && (
        <div className="card import-card">
          <h3>Map your columns</h3>
          <p className="step-desc">Tell us which column in your file maps to which field. Green = auto-detected.</p>

          <div className="map-grid">
            {[
              { key: 'date', label: 'Date *', required: true },
              { key: 'amount', label: 'Amount *', required: true },
              { key: 'description', label: 'Description', required: false },
              { key: 'type', label: 'Type (income/expense)', required: false },
            ].map(({ key, label }) => (
              <div key={key} className="map-row">
                <span className="map-label">{label}</span>
                <select
                  className={`input-field ${columnMap[key] ? 'auto-detected' : ''}`}
                  value={columnMap[key]}
                  onChange={e => setColumnMap({ ...columnMap, [key]: e.target.value })}
                >
                  <option value="">Select column…</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                {columnMap[key] && <span className="detected-badge">✓ detected</span>}
              </div>
            ))}
          </div>

          <div className="step-actions">
            <button className="btn btn-ghost" onClick={() => setStep(0)}>← Back</button>
            <button className="btn btn-primary" onClick={() => setStep(2)}>Preview →</button>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 2 && (
        <div className="card import-card">
          <h3>Preview — first {preview.length} of {totalRows} rows</h3>
          <p className="step-desc">Check the data looks correct before importing.</p>

          <div className="preview-table-wrap">
            <table className="preview-table">
              <thead>
                <tr>
                  <th>Date</th><th>Amount</th><th>Description</th><th>Type</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i}>
                    <td>{String(row[columnMap.date] || '—')}</td>
                    <td>{String(row[columnMap.amount] || '—')}</td>
                    <td>{String(row[columnMap.description] || '—')}</td>
                    <td>{String(row[columnMap.type] || 'expense')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="step-actions">
            <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
            <button className="btn btn-primary" onClick={confirmImport} disabled={loading}>
              {loading ? 'Importing…' : `Import All ${totalRows} Rows →`}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Done */}
      {step === 3 && result && (
        <div className="card import-card done-card">
          <div className="done-icon">✓</div>
          <h2>Import Complete!</h2>
          <div className="result-stats">
            <div className="result-stat"><span>{result.imported}</span><small>Imported</small></div>
            <div className="result-stat result-failed"><span>{result.failed}</span><small>Failed</small></div>
          </div>
          {result.errors?.length > 0 && (
            <div className="errors-box">
              <strong>Errors:</strong>
              {result.errors.map((e, i) => <p key={i} className="err-item">{e}</p>)}
            </div>
          )}
          <div className="step-actions" style={{ justifyContent: 'center' }}>
            <a href="/expenses" className="btn btn-primary">View Expenses →</a>
            <button className="btn btn-ghost" onClick={reset}>Import Another</button>
          </div>
        </div>
      )}
    </div>
  );
}