import React, { useState, useEffect } from 'react';
import { installmentsAPI } from '../../services/api';

const INTEREST_TABLE = [
  { months: '12+ months', rate: 40, min: 12 },
  { months: '9–11 months', rate: 30, min: 9 },
  { months: '6–8 months', rate: 20, min: 6 },
  { months: '3–5 months', rate: 10, min: 3 },
  { months: '1–2 months', rate: 5, min: 1 },
];

const InstallmentCalculator = ({ onResult }) => {
  const [form, setForm] = useState({ basePrice: '', advancePayment: '', durationMonths: 12 });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    const doCalc = async () => {
      if (!form.basePrice || !form.durationMonths) return;
      setLoading(true);
      try {
        const { data } = await installmentsAPI.calculate({
          basePrice: Number(form.basePrice),
          advancePayment: Number(form.advancePayment || 0),
          durationMonths: Number(form.durationMonths),
        });
        setResult(data.calculation);
        if (onResult) onResult(data.calculation);
      } catch {}
      setLoading(false);
    };
    const t = setTimeout(doCalc, 400);
    return () => clearTimeout(t);
  }, [form.basePrice, form.advancePayment, form.durationMonths]);

  const formatPKR = (n) => `PKR ${Number(n || 0).toLocaleString()}`;

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
        padding: '20px 24px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 28 }}>🧮</span>
        <div>
          <p style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>EMI Calculator</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>Real-time installment preview</p>
        </div>
      </div>

      <div style={{ padding: 24 }}>
        {/* Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">🏷️ Base Price (PKR)</label>
            <input
              name="basePrice"
              type="number"
              value={form.basePrice}
              onChange={handleChange}
              className="form-control"
              placeholder="e.g. 100000"
              min="1"
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">💵 Advance Payment (PKR)</label>
            <input
              name="advancePayment"
              type="number"
              value={form.advancePayment}
              onChange={handleChange}
              className="form-control"
              placeholder="e.g. 10000 (optional)"
              min="0"
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">📅 Duration</label>
            <select name="durationMonths" value={form.durationMonths} onChange={handleChange} className="form-control form-select">
              {[1,2,3,4,5,6,7,8,9,10,11,12,18,24,36,48,60].map(m => (
                <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Result */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>
            ⚙️ Calculating...
          </div>
        )}

        {result && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Monthly EMI - highlight */}
            <div style={{
              background: 'linear-gradient(135deg, var(--accent-glow), rgba(99,102,241,0.15))',
              border: '2px solid var(--accent)',
              borderRadius: 'var(--radius)',
              padding: 20, textAlign: 'center', marginBottom: 8,
            }}>
              <p style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1 }}>Monthly EMI</p>
              <p style={{ fontSize: 36, fontWeight: 900, color: 'var(--accent)', lineHeight: 1.1 }}>
                {formatPKR(result.monthlyEmi)}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                × {result.durationMonths} months = {formatPKR(result.totalAmount)}
              </p>
            </div>

            {/* Breakdown rows */}
            {[
              { label: '🏷️ Base Price', value: formatPKR(result.basePrice), muted: false },
              { label: '💵 Advance Paid', value: formatPKR(result.advancePayment), muted: true },
              { label: '📤 Remaining', value: formatPKR(result.remainingAmount), muted: false },
              { label: `📈 Interest (${result.interestRate}%)`, value: formatPKR(result.interestAmount), color: 'var(--warning)' },
              { label: '💰 Total Amount', value: formatPKR(result.totalAmount), color: 'var(--success)', bold: true },
            ].map(({ label, value, muted, color, bold }) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)', fontSize: 13,
              }}>
                <span style={{ color: muted ? 'var(--text-muted)' : 'var(--text-secondary)' }}>{label}</span>
                <span style={{ fontWeight: bold ? 800 : 600, color: color || 'var(--text-primary)' }}>{value}</span>
              </div>
            ))}

            {/* Interest rate badge */}
            <div style={{
              marginTop: 8, padding: '10px 14px', borderRadius: 'var(--radius-sm)',
              background: result.interestRate >= 30 ? 'var(--success-bg)' : 'var(--info-bg)',
              border: `1px solid ${result.interestRate >= 30 ? 'var(--success)' : 'var(--info)'}30`,
              fontSize: 12, color: result.interestRate >= 30 ? 'var(--success)' : 'var(--info)',
            }}>
              {result.interestRate >= 40
                ? '🏆 Maximum profit plan (40% interest)'
                : result.interestRate >= 30
                ? '💹 High profit plan (30% interest)'
                : result.interestRate >= 20
                ? '📊 Moderate profit plan (20% interest)'
                : result.interestRate >= 10
                ? '📉 Standard plan (10% interest)'
                : '⚡ Short-term plan (5% interest)'}
            </div>
          </div>
        )}

        {/* Interest Table */}
        <div style={{ marginTop: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            Interest Rate Guide
          </p>
          {INTEREST_TABLE.map(({ months, rate, min }) => {
            const isActive = Number(form.durationMonths) >= min && (
              INTEREST_TABLE.findIndex(t => t.min === min) === 0
                ? true
                : Number(form.durationMonths) < INTEREST_TABLE[INTEREST_TABLE.findIndex(t => t.min === min) - 1].min
            );
            return (
              <div key={months} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '7px 10px', borderRadius: 6, marginBottom: 4, fontSize: 12,
                background: result?.interestRate === rate ? 'var(--accent-glow)' : 'transparent',
                border: result?.interestRate === rate ? '1px solid var(--accent)30' : '1px solid transparent',
                transition: 'var(--transition)',
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>{months}</span>
                <span style={{
                  fontWeight: 700,
                  color: rate >= 40 ? 'var(--success)' : rate >= 30 ? 'var(--warning)' : 'var(--text-muted)',
                }}>
                  {rate}%
                  {result?.interestRate === rate && ' ✓'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default InstallmentCalculator;
