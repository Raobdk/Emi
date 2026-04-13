import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { installmentsAPI, paymentsAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { Ban } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

const PaymentModal = ({ payment, onClose, onSave }) => {
  const [form, setForm] = useState({
    amountPaid: payment.amount, paymentMethod: 'cash',
    notes: '', lateFee: 0, paidDate: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave(payment._id, { ...form, amountPaid: Number(form.amountPaid), lateFee: Number(form.lateFee) });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">💳 Record Payment - Month {payment.monthNumber}</h3>
          <button className="btn btn-sm btn-secondary btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ padding: 14, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Due Amount</p>
              <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>PKR {payment.amount?.toLocaleString()}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Due: {new Date(payment.dueDate).toLocaleDateString('en-PK')}</p>
            </div>

            <div className="form-group">
              <label className="form-label">Amount Paid (PKR) *</label>
              <input type="number" className="form-control" value={form.amountPaid} onChange={e => setForm({...form, amountPaid: e.target.value})} required min="1" />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select className="form-control form-select" value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value})}>
                <option value="cash">💵 Cash</option>
                <option value="bank_transfer">🏦 Bank Transfer</option>
                <option value="cheque">📄 Cheque</option>
                <option value="online">💻 Online</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Payment Date</label>
              <input type="date" className="form-control" value={form.paidDate} onChange={e => setForm({...form, paidDate: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Late Fee (PKR)</label>
              <input type="number" className="form-control" value={form.lateFee} onChange={e => setForm({...form, lateFee: e.target.value})} min="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Optional note..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-success">✅ Record Payment</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditPlanModal = ({ plan, onClose, onSave }) => {
  const [form, setForm] = useState({
    productName: plan.productName || '',
    notes: plan.notes || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave(plan._id, form);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">✏️ Edit Plan Details</h3>
          <button className="btn btn-sm btn-secondary btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Note: You can only edit basic details. Financial calculations cannot be altered once a plan is generated to ensure integrity.
            </p>
            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input type="text" className="form-control" value={form.productName} onChange={e => setForm({...form, productName: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-control" rows={3} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Optional note..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">✅ Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const InstallmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const load = async () => {
    try {
      const [planRes, payRes] = await Promise.all([
        installmentsAPI.getOne(id),
        paymentsAPI.getPlanPayments(id)
      ]);
      setPlan(planRes.data.plan);
      setPayments(payRes.data.payments);
      setSummary(payRes.data.summary);
    } catch {
      toast.error('Plan not found');
      navigate('/installments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    socket.on('payment_received', () => load());
    socket.on('plan_cancelled', () => load());
    return () => {
      socket.off('payment_received');
      socket.off('plan_cancelled');
    };
  }, [socket]);

  const recordPayment = async (paymentId, data) => {
    try {
      await paymentsAPI.record(paymentId, data);
      toast.success('Payment recorded! Receipt generated 🎉');
      setPayModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    }
  };

  const handleCancelPlan = async () => {
    if (!window.confirm('Are you absolutely sure you want to CANCEL this plan? All remaining payments will be waived and this cannot be undone.')) {
      return;
    }
    try {
      await installmentsAPI.cancel(id);
      toast.success('Plan cancelled successfully');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel plan');
    }
  };

  const downloadReceipt = async (paymentId) => {
    try {
      const res = await paymentsAPI.downloadReceipt(paymentId);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `receipt-${paymentId}.pdf`; a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download receipt');
    }
  };

  const handleEditPlan = async (id, data) => {
    try {
      await installmentsAPI.update(id, data);
      toast.success('Plan details updated successfully');
      setShowEditModal(false);
      load();
    } catch (err) {
      toast.error('Failed to update plan details');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!plan) return null;

  const progressPct = Math.min(100, (plan.paidMonths / plan.durationMonths) * 100);

  const statusColor = { paid: 'var(--success)', pending: 'var(--warning)', overdue: 'var(--danger)', partial: 'var(--info)', waived: 'var(--text-muted)' };
  const statusBadge = { paid: 'badge-success', pending: 'badge-warning', overdue: 'badge-danger', partial: 'badge-info', waived: 'badge-default' };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <button className="btn btn-sm btn-secondary mb-4" onClick={() => navigate('/installments')}>← Back</button>
          <div className="flex items-center gap-3">
            <h1 className="page-title">{plan.productName}</h1>
            <button 
              className="btn btn-sm btn-secondary shadow-sm" 
              onClick={() => setShowEditModal(true)}
            >
              ✏️ Edit
            </button>
            {plan.status === 'active' && (
              <button 
                className="btn btn-sm btn-danger shadow-sm" 
                onClick={handleCancelPlan}
              >
                <Ban size={14} /> Cancel Plan
              </button>
            )}
          </div>
          <p className="page-subtitle">{plan.planId} · Customer: {plan.customerId?.name}</p>
        </div>
        <span className={`badge ${plan.status === 'active' ? 'badge-success' : 'badge-default'}`} style={{ fontSize: 14, padding: '6px 16px' }}>
          {plan.status?.toUpperCase()}
        </span>
      </div>

      {/* Plan Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Base Price', value: `PKR ${plan.basePrice?.toLocaleString()}`, color: 'var(--text-primary)' },
          { label: 'Advance Paid', value: `PKR ${plan.advancePayment?.toLocaleString()}`, color: 'var(--success)' },
          { label: 'Interest Rate', value: `${plan.interestRate}%`, color: 'var(--text-muted)' },
          { label: 'Total Interest', value: `PKR ${plan.interestAmount?.toLocaleString()}`, color: 'var(--warning)' },
          { label: 'Total Financed', value: `PKR ${plan.totalAmount?.toLocaleString()}`, color: 'var(--warning)' },
          { label: 'Monthly EMI', value: `PKR ${plan.monthlyEmi?.toLocaleString()}`, color: 'var(--accent)' },
          { label: 'EMIs Paid', value: `PKR ${plan.totalPaid?.toLocaleString()}`, color: 'var(--success)' },
          { label: 'Remaining Bal', value: `PKR ${plan.totalRemaining?.toLocaleString()}`, color: 'var(--danger)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card">
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="card mb-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontWeight: 600 }}>Payment Progress</span>
          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{plan.paidMonths}/{plan.durationMonths} months</span>
        </div>
        <div style={{ background: 'var(--bg-tertiary)', borderRadius: 99, height: 12, overflow: 'hidden' }}>
          <div style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--success))', borderRadius: 99, transition: 'width 0.8s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            PKR {plan.totalPaid?.toLocaleString()} recovered / PKR {plan.totalAmount?.toLocaleString()} total
          </span>
          <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>{progressPct.toFixed(0)}% complete</span>
        </div>
      </div>

      {/* Payment Schedule */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">💳 Payment Schedule</h3>
          <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
            <span>✅ Paid: {summary.paid}</span>
            <span style={{ color: 'var(--warning)' }}>⏳ Pending: {summary.pending}</span>
            <span style={{ color: 'var(--danger)' }}>🚨 Overdue: {summary.overdue}</span>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Method</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p._id} style={p.status === 'overdue' ? { background: 'var(--danger-bg)' } : {}}>
                  <td><strong>Month {p.monthNumber}</strong></td>
                  <td style={{ color: p.status === 'overdue' ? 'var(--danger)' : 'var(--text-primary)' }}>
                    {new Date(p.dueDate).toLocaleDateString('en-PK')}
                  </td>
                  <td><strong>PKR {p.amount?.toLocaleString()}</strong></td>
                  <td>
                    {p.amountPaid > 0 ? (
                      <span style={{ color: 'var(--success)' }}>PKR {p.amountPaid?.toLocaleString()}</span>
                    ) : '-'}
                  </td>
                  <td style={{ fontSize: 12, textTransform: 'capitalize' }}>
                    {p.paymentMethod?.replace('_', ' ') || '-'}
                  </td>
                  <td><span className={`badge ${statusBadge[p.status] || 'badge-default'}`}>{p.status}</span></td>
                  <td>
                    <div className="flex gap-2">
                      {p.status !== 'paid' && p.status !== 'waived' && (
                        <button className="btn btn-sm btn-success" onClick={() => setPayModal(p)}>
                          💰 Pay
                        </button>
                      )}
                      {p.status === 'paid' && (
                        <button className="btn btn-sm btn-secondary" onClick={() => downloadReceipt(p._id)}>
                          📄 Receipt
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {payModal && (
        <PaymentModal
          payment={payModal}
          onClose={() => setPayModal(null)}
          onSave={recordPayment}
        />
      )}

      {showEditModal && (
        <EditPlanModal
          plan={plan}
          onClose={() => setShowEditModal(false)}
          onSave={handleEditPlan}
        />
      )}
    </div>
  );
};

export default InstallmentDetail;
