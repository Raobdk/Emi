import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { installmentsAPI, customersAPI } from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useSocket } from '../context/SocketContext';

const EMICalcPreview = ({ calc }) => {
  if (!calc) return null;
  return (
    <div style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', padding: 16, marginTop: 16 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 12 }}>📊 EMI Preview</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          ['Remaining Amount', `PKR ${calc.remainingAmount?.toLocaleString()}`],
          ['Interest Rate', `${calc.interestRate}%`],
          ['Interest Amount', `PKR ${calc.interestAmount?.toLocaleString()}`],
          ['Total Amount', `PKR ${calc.totalAmount?.toLocaleString()}`],
          ['Monthly EMI', `PKR ${calc.monthlyEmi?.toLocaleString()}`],
          ['Duration', `${calc.durationMonths} Months`],
        ].map(([label, value]) => (
          <div key={label} style={{ fontSize: 13 }}>
            <span style={{ color: 'var(--text-muted)' }}>{label}: </span>
            <strong style={{ color: 'var(--text-primary)' }}>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
};

const PlanModal = ({ onClose, onSave, prefillCustomerId }) => {
  const [form, setForm] = useState({
    customerId: prefillCustomerId || '',
    productName: '', productDescription: '',
    basePrice: '', advancePayment: '', durationMonths: 12, paidMonths: 0,
    startDate: new Date().toISOString().split('T')[0], notes: ''
  });
  const [calc, setCalc] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [calculatingEMI, setCalculatingEMI] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadCustomers = async () => {
      const { data } = await customersAPI.getAll({ limit: 100 });
      setCustomers(data.data);
    };
    loadCustomers();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const doCalc = async () => {
      if (form.basePrice && form.durationMonths) {
        setCalculatingEMI(true);
        try {
          const { data } = await installmentsAPI.calculate({
            basePrice: Number(form.basePrice),
            advancePayment: Number(form.advancePayment || 0),
            durationMonths: Number(form.durationMonths)
          });
          setCalc(data.calculation);
        } catch {}
        setCalculatingEMI(false);
      }
    };
    const t = setTimeout(doCalc, 500);
    return () => clearTimeout(t);
  }, [form.basePrice, form.advancePayment, form.durationMonths]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSave({
        ...form,
        basePrice: Number(form.basePrice),
        advancePayment: Number(form.advancePayment || 0),
        durationMonths: Number(form.durationMonths),
        paidMonths: Number(form.paidMonths || 0)
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">➕ Create Installment Plan</h3>
          <button className="btn btn-sm btn-secondary btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Customer *</label>
                <select name="customerId" value={form.customerId} onChange={handleChange} className="form-control form-select" required>
                  <option value="">Select Customer</option>
                  {customers.map(c => <option key={c._id} value={c._id}>{c.name} - {c.customerId}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Product / Item Name *</label>
                <input name="productName" value={form.productName} onChange={handleChange} className="form-control" placeholder="e.g. Samsung Galaxy S23" required />
              </div>
              <div className="form-group">
                <label className="form-label">Base Price (PKR) *</label>
                <input name="basePrice" value={form.basePrice} onChange={handleChange} type="number" className="form-control" placeholder="100000" required min="1" />
              </div>
              <div className="form-group">
                <label className="form-label">Advance Payment (PKR)</label>
                <input name="advancePayment" value={form.advancePayment} onChange={handleChange} type="number" className="form-control" placeholder="10000" min="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Duration (Months) *</label>
                <select name="durationMonths" value={form.durationMonths} onChange={handleChange} className="form-control form-select" required>
                  {[1,2,3,4,5,6,7,8,9,10,11,12,18,24,36,48,60].map(m => (
                    <option key={m} value={m}>{m} month{m > 1 ? 's' : ''} {m >= 12 ? '(40% interest)' : m >= 10 ? '(35%)' : m >= 9 ? '(30%)' : m >= 6 ? '(20%)' : m >= 3 ? '(10%)' : '(5%)'}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input name="startDate" value={form.startDate} onChange={handleChange} type="date" className="form-control" />
              </div>
              <div className="form-group">
                <label className="form-label">Old Data: Already Paid Months</label>
                <input name="paidMonths" value={form.paidMonths} onChange={handleChange} type="number" className="form-control" placeholder="0" min="0" max={Math.max(0, form.durationMonths)} />
                <span style={{fontSize: 10, color: 'var(--text-muted)'}}>Past installments will be auto-marked 'Paid'</span>
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Notes (optional)</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} className="form-control" rows={2} placeholder="Any additional notes..." />
              </div>
            </div>
            <EMICalcPreview calc={calculatingEMI ? null : calc} />
            {calculatingEMI && <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>Calculating EMI...</p>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" disabled={isSubmitting} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || calculatingEMI}>
              {isSubmitting ? 'Creating...' : '✅ Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Installments = () => {
  const [plans, setPlans] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const location = useLocation();
  const prefillCustomer = location.state?.customerId;

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (filter) params.status = filter;
      const { data } = await installmentsAPI.getAll(params);
      setPlans(data.data);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    socket.on('plan_created', fetchPlans);
    socket.on('plan_cancelled', fetchPlans);
    socket.on('payment_received', fetchPlans);
    return () => {
      socket.off('plan_created', fetchPlans);
      socket.off('plan_cancelled', fetchPlans);
      socket.off('payment_received', fetchPlans);
    };
  }, [socket, fetchPlans]);

  useEffect(() => {
    if (prefillCustomer) setModal(true);
  }, [prefillCustomer]);

  const handleSave = async (form) => {
    try {
      await installmentsAPI.create(form);
      toast.success('Plan created! Payment schedule generated 🎉');
      setModal(false);
      fetchPlans();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create plan');
    }
  };

  const statusBadge = (s) => ({
    active: 'badge-success', completed: 'badge-info',
    defaulted: 'badge-danger', cancelled: 'badge-default'
  }[s] || 'badge-default');

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to permanently delete this plan? This action cannot be undone.")) {
      try {
        await installmentsAPI.delete(id);
        toast.success("Plan deleted permanently");
        fetchPlans();
      } catch (err) {
        toast.error(err.response?.data?.message || "Cannot delete this plan");
      }
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Installment Plans</h1>
          <p className="page-subtitle">Manage all EMI plans and payment schedules</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>➕ New Plan</button>
      </div>

      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', gap: 8 }}>
            {['', 'active', 'completed', 'defaulted', 'cancelled'].map(s => (
              <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setFilter(s); setPage(1); }}>
                {s || 'All'}
              </button>
            ))}
          </div>
          <span className="badge badge-info">{pagination.total || 0} plans</span>
        </div>

        {loading ? <LoadingSpinner /> : (
          <>
            {plans.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <h3>No plans found</h3>
                <p>{filter ? `No ${filter} plans` : 'Create your first installment plan'}</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Plan ID</th>
                      <th>Customer</th>
                      <th>Product</th>
                      <th>Base Price</th>
                      <th>Monthly EMI</th>
                      <th>Duration</th>
                      <th>Progress</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map(p => (
                      <tr key={p._id}>
                        <td><code style={{ fontSize: 12, color: 'var(--accent)' }}>{p.planId}</code></td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{p.customerId?.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.customerId?.phone}</div>
                        </td>
                        <td>{p.productName}</td>
                        <td><strong>PKR {p.basePrice?.toLocaleString()}</strong></td>
                        <td style={{ color: 'var(--accent)', fontWeight: 700 }}>PKR {p.monthlyEmi?.toLocaleString()}</td>
                        <td>{p.durationMonths}m</td>
                        <td>
                          <div style={{ minWidth: 80 }}>
                            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(100, (p.paidMonths / p.durationMonths) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--success))', borderRadius: 99 }} />
                            </div>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.paidMonths}/{p.durationMonths}</span>
                          </div>
                        </td>
                        <td><span className={`badge ${statusBadge(p.status)}`}>{p.status}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/installments/${p._id}`)}>
                              👁️ Details
                            </button>
                            <button className="btn btn-sm btn-secondary" onClick={() => handleDelete(p._id)} style={{ color: 'var(--danger)', padding: '6px 10px' }} title="Delete Plan">
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {pagination.pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 20 }}>
                <button className="btn btn-sm btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                <span style={{ padding: '6px 14px', color: 'var(--text-muted)', fontSize: 14 }}>Page {page}/{pagination.pages}</span>
                <button className="btn btn-sm btn-secondary" disabled={page === pagination.pages} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>

      {modal && <PlanModal onClose={() => setModal(false)} onSave={handleSave} prefillCustomerId={prefillCustomer} />}
    </div>
  );
};

export default Installments;
