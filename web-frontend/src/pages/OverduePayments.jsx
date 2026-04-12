import React, { useState, useEffect } from 'react';
import { paymentsAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const OverduePayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await paymentsAPI.getOverdue();
      setPayments(data.payments);
    } catch {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const daysOverdue = (dueDate) => {
    const diff = Math.floor((Date.now() - new Date(dueDate)) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const urgencyColor = (days) => {
    if (days > 30) return 'var(--danger)';
    if (days > 14) return 'var(--warning)';
    return 'var(--text-primary)';
  };

  const totalOverdue = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">⚠️ Overdue Payments</h1>
          <p className="page-subtitle">Payments that require immediate attention</p>
        </div>
        <div className="stat-card" style={{ padding: '12px 20px', minWidth: 200 }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>TOTAL OVERDUE AMOUNT</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--danger)' }}>PKR {totalOverdue.toLocaleString()}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{payments.length} pending records</p>
        </div>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card">
          {payments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎉</div>
              <h3>No overdue payments!</h3>
              <p>All payments are up to date</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Plan / Product</th>
                    <th>Month</th>
                    <th>Due Date</th>
                    <th>Days Overdue</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => {
                    const days = daysOverdue(p.dueDate);
                    return (
                      <tr key={p._id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{p.customerId?.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.customerId?.customerId}</div>
                        </td>
                        <td><a href={`tel:${p.customerId?.phone}`} style={{ color: 'var(--accent)' }}>{p.customerId?.phone}</a></td>
                        <td>
                          <div>{p.installmentPlanId?.productName || '-'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.installmentPlanId?.planId}</div>
                        </td>
                        <td>Month {p.monthNumber}</td>
                        <td style={{ color: 'var(--danger)' }}>{new Date(p.dueDate).toLocaleDateString('en-PK')}</td>
                        <td>
                          <span style={{
                            fontWeight: 700, color: urgencyColor(days),
                            background: days > 30 ? 'var(--danger-bg)' : days > 14 ? 'var(--warning-bg)' : '',
                            padding: '3px 8px', borderRadius: 99, fontSize: 13
                          }}>
                            {days} days
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--danger)', fontSize: 16 }}>PKR {p.amount?.toLocaleString()}</strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OverduePayments;
