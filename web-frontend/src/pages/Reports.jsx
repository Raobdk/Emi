import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../services/api';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

const Reports = () => {
  const [overview, setOverview] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [topCustomers, setTopCustomers] = useState([]);
  const [period, setPeriod] = useState('month');
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [ovRes, chartRes, distRes, topRes] = await Promise.all([
          reportsAPI.getOverview(period),
          reportsAPI.getMonthlyChart(year),
          reportsAPI.getDistribution(),
          reportsAPI.getTopCustomers()
        ]);
        setOverview(ovRes.data.report);
        setChartData(chartRes.data.chartData);
        setDistribution(distRes.data.distribution);
        setTopCustomers(topRes.data.customers);
      } catch {
        toast.error('Failed to load reports');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period, year]);

  const handleExport = async (type) => {
    setExporting(true);
    try {
      const res = await reportsAPI.exportExcel(type, period);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `${type}_report_${Date.now()}.xlsx`; a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Excel report downloaded! 📊');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: 'var(--border)' }, ticks: { color: 'var(--text-muted)', font: { size: 11 } } },
      y: { grid: { color: 'var(--border)' }, ticks: { color: 'var(--text-muted)', callback: v => `${(v/1000).toFixed(0)}k` } }
    }
  };

  const barData = chartData ? {
    labels: chartData.map(d => d.month),
    datasets: [{
      data: chartData.map(d => d.collected),
      backgroundColor: chartData.map((_, i) => `hsla(${240 + i * 5}, 80%, 65%, 0.8)`),
      borderRadius: 8, borderWidth: 0
    }]
  } : null;

  const lineData = chartData ? {
    labels: chartData.map(d => d.month),
    datasets: [{
      data: chartData.map(d => d.collected),
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.1)',
      fill: true, tension: 0.4, pointRadius: 5,
      pointBackgroundColor: '#6366f1'
    }]
  } : null;

  const statusColors = { paid: '#22c55e', pending: '#f59e0b', overdue: '#ef4444', partial: '#3b82f6', waived: '#8b5cf6' };
  const donutData = distribution ? {
    labels: distribution.map(d => d._id),
    datasets: [{
      data: distribution.map(d => d.count),
      backgroundColor: distribution.map(d => statusColors[d._id] || '#64748b'),
      borderColor: 'var(--bg-card)', borderWidth: 3
    }]
  } : null;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">📈 Reports & Analytics</h1>
          <p className="page-subtitle">Financial performance overview</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="form-control" style={{ width: 130 }} value={period} onChange={e => setPeriod(e.target.value)}>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">Quarter</option>
            <option value="year">This Year</option>
          </select>
          <select className="form-control" style={{ width: 100 }} value={year} onChange={e => setYear(Number(e.target.value))}>
            {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid mb-6">
        {[
          { label: 'Total Investment', value: `PKR ${(overview?.totalInvestment / 1000 || 0).toFixed(0)}k`, color: 'var(--accent)', icon: '💰' },
          { label: 'Total Profit', value: `PKR ${(overview?.totalProfit / 1000 || 0).toFixed(0)}k`, color: 'var(--success)', icon: '💹' },
          { label: 'Period Income', value: `PKR ${(overview?.monthlyIncome / 1000 || 0).toFixed(0)}k`, color: 'var(--warning)', icon: '📥' },
          { label: 'ROI', value: `${overview?.totalInvestment > 0 ? ((overview.totalProfit / overview.totalInvestment) * 100).toFixed(1) : 0}%`, color: '#22c55e', icon: '📊' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-icon" style={{ background: `${s.color}15`, fontSize: 20 }}>{s.icon}</div>
            <div className="stat-value" style={{ color: s.color, fontSize: 24 }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Export Buttons */}
      <div className="card mb-6">
        <div className="card-header">
          <h3 className="card-title">📦 Export Reports</h3>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { type: 'installments', label: '📋 Installment Plans' },
            { type: 'payments', label: '💳 Payment History' },
            { type: 'customers', label: '👥 Customers List' },
          ].map(({ type, label }) => (
            <button key={type} className="btn btn-secondary" disabled={exporting} onClick={() => handleExport(type)}>
              {exporting ? '⏳ Exporting...' : `⬇️ Export ${label}`}
            </button>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="content-grid mb-6">
        <div className="card">
          <div className="card-header"><h3 className="card-title">📊 Monthly Collections (Bar)</h3></div>
          <div style={{ height: 260 }}>{barData && <Bar data={barData} options={chartOptions} />}</div>
        </div>
        <div className="card">
          <div className="card-header"><h3 className="card-title">📈 Collection Trend (Line)</h3></div>
          <div style={{ height: 260 }}>{lineData && <Line data={lineData} options={chartOptions} />}</div>
        </div>
      </div>

      <div className="content-grid">
        <div className="card">
          <div className="card-header"><h3 className="card-title">🥧 Payment Status Distribution</h3></div>
          <div style={{ height: 260 }}>
            {donutData && <Doughnut data={donutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: 'var(--text-secondary)' } } }, cutout: '65%' }} />}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="card-title">🏆 Top 10 Customers</h3></div>
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {topCustomers.map((c, i) => (
              <div key={c._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 700, color: i < 3 ? 'var(--warning)' : 'var(--text-muted)', width: 20 }}>
                    {i < 3 ? ['🥇','🥈','🥉'][i] : `${i+1}.`}
                  </span>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.plans} plan{c.plans !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 14 }}>PKR {c.totalInvested?.toLocaleString()}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>invested</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
