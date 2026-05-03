import { useEffect, useState } from 'react';
import api from '../api';
import './Vendors.css';

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [selected, setSelected] = useState(null);
  const [payments, setPayments] = useState([]);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [showPayForm, setShowPayForm] = useState(false);
  const [vForm, setVForm] = useState({ name: '', contact: '', category: '' });
  const [pForm, setPForm] = useState({ amount: '', payment_date: new Date().toISOString().split('T')[0], description: '', status: 'paid' });

  const fetchVendors = async () => {
    const { data } = await api.get('/vendors');
    setVendors(data);
  };

  const fetchPayments = async (id) => {
    const { data } = await api.get(`/vendors/${id}/payments`);
    setPayments(data);
  };

  useEffect(() => { fetchVendors(); }, []);

  const selectVendor = (v) => {
    setSelected(v);
    fetchPayments(v.vendor_id);
    setShowPayForm(false);
  };

  const addVendor = async () => {
    if (!vForm.name) return;
    await api.post('/vendors', vForm);
    setVForm({ name: '', contact: '', category: '' });
    setShowVendorForm(false);
    fetchVendors();
  };

  const addPayment = async () => {
    if (!pForm.amount || !pForm.payment_date) return;
    await api.post(`/vendors/${selected.vendor_id}/payments`, pForm);
    setPForm({ amount: '', payment_date: new Date().toISOString().split('T')[0], description: '', status: 'paid' });
    setShowPayForm(false);
    fetchPayments(selected.vendor_id);
  };

  const deleteVendor = async (id) => {
    if (!confirm('Delete this vendor and all their payments?')) return;
    await api.delete(`/vendors/${id}`);
    if (selected?.vendor_id === id) setSelected(null);
    fetchVendors();
  };

  const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = payments.filter(p => p.status !== 'paid').reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="vendors-page">
      <div className="page-header">
        <div>
          <h1>Vendor Payments</h1>
          <p className="page-sub">Track payments made to your vendors & suppliers</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowVendorForm(!showVendorForm)}>
          {showVendorForm ? '✕ Cancel' : '+ Add Vendor'}
        </button>
      </div>

      {showVendorForm && (
        <div className="card vendor-form">
          <h3>Add New Vendor</h3>
          <div className="vform-row">
            <div>
              <label className="label">Vendor Name *</label>
              <input className="input-field" placeholder="e.g. Raj Traders" value={vForm.name} onChange={e => setVForm({...vForm, name: e.target.value})} />
            </div>
            <div>
              <label className="label">Contact / Phone</label>
              <input className="input-field" placeholder="e.g. 9876543210" value={vForm.contact} onChange={e => setVForm({...vForm, contact: e.target.value})} />
            </div>
            <div>
              <label className="label">Category</label>
              <input className="input-field" placeholder="e.g. Raw Materials" value={vForm.category} onChange={e => setVForm({...vForm, category: e.target.value})} />
            </div>
            <button className="btn btn-primary" onClick={addVendor} style={{ alignSelf: 'flex-end' }}>Save Vendor</button>
          </div>
        </div>
      )}

      <div className="vendors-layout">
        {/* Vendor List */}
        <div className="vendors-list">
          <h3>Your Vendors ({vendors.length})</h3>
          {vendors.length === 0 ? (
            <div className="card empty-vendor">
              <p>No vendors yet.</p>
              <button className="btn btn-primary" onClick={() => setShowVendorForm(true)} style={{ marginTop: '0.75rem' }}>Add first vendor</button>
            </div>
          ) : vendors.map(v => (
            <div key={v.vendor_id}
              className={`card vendor-card ${selected?.vendor_id === v.vendor_id ? 'vendor-active' : ''}`}
              onClick={() => selectVendor(v)}>
              <div className="vendor-top">
                <div className="vendor-avatar">{v.name[0]}</div>
                <div>
                  <div className="vendor-name">{v.name}</div>
                  <div className="vendor-cat">{v.category || 'General'}</div>
                </div>
                <button className="del-btn" onClick={e => { e.stopPropagation(); deleteVendor(v.vendor_id); }}>✕</button>
              </div>
              {v.contact && <div className="vendor-contact">📞 {v.contact}</div>}
            </div>
          ))}
        </div>

        {/* Payments Panel */}
        <div className="payments-panel">
          {!selected ? (
            <div className="card select-prompt">
              <p>← Select a vendor to view their payments</p>
            </div>
          ) : (
            <>
              <div className="card payments-header">
                <div>
                  <h3>{selected.name}</h3>
                  <p className="page-sub">{selected.category || 'General'}</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowPayForm(!showPayForm)}>
                  {showPayForm ? '✕ Cancel' : '+ Log Payment'}
                </button>
              </div>

              <div className="payment-summary">
                <div className="card psummary-card">
                  <div className="psummary-label">Total Paid</div>
                  <div className="psummary-val paid">{fmt(totalPaid)}</div>
                </div>
                <div className="card psummary-card">
                  <div className="psummary-label">Pending</div>
                  <div className="psummary-val pending">{fmt(totalPending)}</div>
                </div>
              </div>

              {showPayForm && (
                <div className="card">
                  <h3 style={{ marginBottom: '1rem' }}>Log Payment</h3>
                  <div className="pform-grid">
                    <div>
                      <label className="label">Amount *</label>
                      <input className="input-field" type="number" placeholder="₹0" value={pForm.amount} onChange={e => setPForm({...pForm, amount: e.target.value})} />
                    </div>
                    <div>
                      <label className="label">Date *</label>
                      <input className="input-field" type="date" value={pForm.payment_date} onChange={e => setPForm({...pForm, payment_date: e.target.value})} />
                    </div>
                    <div>
                      <label className="label">Description</label>
                      <input className="input-field" placeholder="What was this for?" value={pForm.description} onChange={e => setPForm({...pForm, description: e.target.value})} />
                    </div>
                    <div>
                      <label className="label">Status</label>
                      <select className="input-field" value={pForm.status} onChange={e => setPForm({...pForm, status: e.target.value})}>
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                        <option value="overdue">Overdue</option>
                      </select>
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={addPayment} style={{ marginTop: '1rem' }}>Save Payment</button>
                </div>
              )}

              <div className="card">
                <h3>Payment History</h3>
                {payments.length === 0 ? (
                  <p className="no-data">No payments logged yet.</p>
                ) : (
                  <table className="expenses-table" style={{ marginTop: '1rem' }}>
                    <thead>
                      <tr><th>Date</th><th>Description</th><th>Status</th><th>Amount</th></tr>
                    </thead>
                    <tbody>
                      {payments.map(p => (
                        <tr key={p.payment_id}>
                          <td className="muted-text">{new Date(p.payment_date).toLocaleDateString('en-IN')}</td>
                          <td>{p.description || '—'}</td>
                          <td><span className={`status-badge status-${p.status}`}>{p.status}</span></td>
                          <td className="amt-expense">{fmt(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}