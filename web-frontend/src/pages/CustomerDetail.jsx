import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { customersAPI, installmentsAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await customersAPI.getOne(id);
        setData(res.data);
      } catch {
        toast.error('Customer not found');
        navigate('/customers');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  const addNote = async () => {
    if (!note.trim()) return;
    try {
      await customersAPI.addNote(id, note);
      toast.success('Note added');
      setNote('');
      const res = await customersAPI.getOne(id);
      setData(res.data);
    } catch {
      toast.error('Failed to add note');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!data) return null;

  const { customer, installmentPlans, stats } = data;

  const statusBadge = (s) => ({
    active: 'badge-success', completed: 'badge-info',
    defaulted: 'badge-danger', cancelled: 'badge-default'
  }[s] || 'badge-default');

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <button className="btn btn-sm btn-secondary mb-4" onClick={() => navigate('/customers')}>
            ← Back to Customers
          </button>
          <h1 className="page-title">{customer.name}</h1>
          <p className="page-subtitle">ID: {customer.customerId} · {customer.cnic}</p>
        </div>
        <span className={`badge ${customer.status === 'active' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 14, padding: '6px 16px' }}>
          {customer.status?.toUpperCase()}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 24 }}>
        {/* Left: Profile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <h3 className="card-title mb-4">👤 Profile Information</h3>
            {[
              ['📱 Phone', customer.phone],
              ['📧 Email', customer.email || '-'],
              ['🏠 Address', [customer.address?.street, customer.address?.city, customer.address?.country].filter(Boolean).join(', ') || '-'],
              ['💼 Occupation', customer.occupation || '-'],
              ['💵 Monthly Income', customer.monthlyIncome ? `PKR ${customer.monthlyIncome.toLocaleString()}` : '-'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontWeight: 500 }}>{value}</span>
              </div>
            ))}
            {customer.reference?.name && (
              <div style={{ marginTop: 16, padding: 14, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Guarantor</p>
                <p style={{ fontSize: 14 }}>{customer.reference.name} · {customer.reference.phone}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{customer.reference.relation}</p>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="card">
            <h3 className="card-title mb-4">📊 Financial Summary</h3>
            {[
              ['Total Plans', stats.totalPlans, ''],
              ['Active Plans', stats.activePlans, 'badge-success'],
              ['Completed', stats.completedPlans, 'badge-info'],
              ['Total Invested', `PKR ${stats.totalInvested?.toLocaleString()}`, ''],
              ['Total Paid', `PKR ${stats.totalPaid?.toLocaleString()}`, ''],
              ['Remaining', `PKR ${stats.totalRemaining?.toLocaleString()}`, ''],
            ].map(([label, value, badge]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{label}</span>
                {badge ? <span className={`badge ${badge}`}>{value}</span> : <strong style={{ fontSize: 14 }}>{value}</strong>}
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="card">
            <h3 className="card-title mb-4">📝 Notes</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                className="form-control"
                placeholder="Add a note..."
                value={note}
                onChange={e => setNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addNote()}
              />
              <button className="btn btn-primary btn-sm" onClick={addNote}>Add</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {customer.notes?.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No notes yet</p>}
              {customer.notes?.map((note, i) => (
                <div key={i} style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                  <p>{note.content}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {note.addedBy?.name} · {new Date(note.addedAt).toLocaleDateString('en-PK')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Plans */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📋 Installment Plans</h3>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/installments', { state: { customerId: customer._id } })}>
              ➕ New Plan
            </button>
          </div>

          {installmentPlans.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3>No installment plans</h3>
              <p>Create a plan for this customer</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {installmentPlans.map(plan => (
                <div key={plan._id} style={{ padding: 20, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <p style={{ fontWeight: 700 }}>{plan.productName}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{plan.planId}</p>
                    </div>
                    <span className={`badge ${statusBadge(plan.status)}`}>{plan.status}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                    {[
                      ['Base Price', `PKR ${plan.basePrice?.toLocaleString()}`],
                      ['Monthly EMI', `PKR ${plan.monthlyEmi?.toLocaleString()}`],
                      ['Duration', `${plan.durationMonths} months`],
                      ['Interest', `${plan.interestRate}%`],
                      ['Paid', `${plan.paidMonths}/${plan.durationMonths}`],
                      ['Remaining', `PKR ${plan.totalRemaining?.toLocaleString()}`],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</p>
                        <p style={{ fontSize: 13, fontWeight: 600 }}>{value}</p>
                      </div>
                    ))}
                  </div>
                  {/* Progress bar */}
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, (plan.paidMonths / plan.durationMonths) * 100)}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--accent), var(--success))',
                      borderRadius: 99,
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                    <span>{Math.round((plan.paidMonths / plan.durationMonths) * 100)}% complete</span>
                    <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/installments/${plan._id}`)}>View Details →</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDetail;
