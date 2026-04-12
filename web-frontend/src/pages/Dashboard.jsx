import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { installmentsAPI, paymentsAPI, reportsAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, LineElement, PointElement, ArcElement,
  Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import LoadingSpinner from '../components/common/LoadingSpinner';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

const StatCard = ({ icon, label, value, sub, color = 'var(--accent)', onClick }) => (
  <div className="stat-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
    <div className="stat-icon" style={{ background: `${color}15`, color }}>
      {icon}
    </div>
    <div className="stat-value" style={{ color }}>{value}</div>
    <div className="stat-label">{label}</div>
    {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const { socket } = useSocket();
  
  const loadData = async () => {
    try {
      const [statsRes, chartRes, distRes, overdueRes] = await Promise.all([
        installmentsAPI.getDashboard(),
        reportsAPI.getMonthlyChart(new Date().getFullYear()),
        reportsAPI.getDistribution(),
        paymentsAPI.getOverdue()
      ]);
      setStats(statsRes.data.stats);
      setChartData(chartRes.data.chartData);
      setDistribution(distRes.data.distribution);
      setOverdue(overdueRes.data.payments?.slice(0, 5) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    // Auto refresh data on any relevant socket events
    socket.on('payment_received', loadData);
    socket.on('plan_created', loadData);
    socket.on('plan_cancelled', loadData);
    socket.on('customer_added', loadData);

    return () => {
      socket.off('payment_received', loadData);
      socket.off('plan_created', loadData);
      socket.off('plan_cancelled', loadData);
      socket.off('customer_added', loadData);
    };
  }, [socket]);

  if (loading) return <LoadingSpinner />;

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: 'index' } },
    scales: {
      x: { grid: { color: 'var(--border)' }, ticks: { color: 'var(--text-muted)' } },
      y: { grid: { color: 'var(--border)' }, ticks: { color: 'var(--text-muted)', callback: v => `PKR ${(v/1000).toFixed(0)}k` } }
    }
  };

  const barData = chartData ? {
    labels: chartData.map(d => d.month),
    datasets: [{
      label: 'Monthly Collection',
      data: chartData.map(d => d.collected),
      backgroundColor: 'rgba(99,102,241,0.7)',
      borderColor: '#6366f1',
      borderRadius: 8,
      borderWidth: 2
    }]
  } : null;

  const statusColors = { paid: '#22c55e', pending: '#f59e0b', overdue: '#ef4444', partial: '#3b82f6', waived: '#8b5cf6' };

  const donutData = distribution ? {
    labels: distribution.map(d => d._id),
    datasets: [{
      data: distribution.map(d => d.count),
      backgroundColor: distribution.map(d => statusColors[d._id] || '#64748b'),
      borderColor: 'var(--bg-card)',
      borderWidth: 3
    }]
  } : null;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome to your financial overview</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/installments')}>
          ➕ New Plan
        </button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard icon="👥" label="Active Customers" value={stats?.totalCustomers?.toLocaleString() || 0} color="var(--accent)" onClick={() => navigate('/customers')} />
        <StatCard icon="📋" label="Active Plans" value={stats?.activePlans?.toLocaleString() || 0} sub={`${stats?.totalPlans} total`} color="#22c55e" onClick={() => navigate('/installments')} />
        <StatCard icon="⚠️" label="Overdue Payments" value={stats?.overduePayments?.toLocaleString() || 0} color="#ef4444" onClick={() => navigate('/payments/overdue')} />
        <StatCard icon="💰" label="Total Invested" value={`PKR ${((stats?.totalInvested || 0) / 1000).toFixed(0)}k`} color="#f59e0b" />
        <StatCard icon="💹" label="Total Profit" value={`PKR ${((stats?.totalProfit || 0) / 1000).toFixed(0)}k`} color="#22c55e" />
        <StatCard icon="📥" label="Collected" value={`PKR ${((stats?.totalPaid || 0) / 1000).toFixed(0)}k`} color="var(--accent)" />
        <StatCard icon="📤" label="Remaining" value={`PKR ${((stats?.totalRemaining || 0) / 1000).toFixed(0)}k`} color="#8b5cf6" />
        <StatCard icon="📅" label="Due Today" value={stats?.todayDue?.toLocaleString() || 0} color="#f59e0b" />
      </div>

      {/* Charts */}
      <div className="content-grid mb-6">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Monthly Collections</h3>
            <span className="badge badge-info">{new Date().getFullYear()}</span>
          </div>
          <div style={{ height: 260 }}>
            {barData && <Bar data={barData} options={barOptions} />}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Payment Status</h3>
          </div>
          <div style={{ height: 260, display: 'flex', gap: 24 }}>
            <div style={{ flex: 1 }}>
              {donutData && <Doughnut data={donutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: 'var(--text-secondary)', font: { size: 12 } } } }, cutout: '65%' }} />}
            </div>
          </div>
        </div>
      </div>

      {/* Overdue Payments Table */}
      {overdue.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🚨 Overdue Payments</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => navigate('/payments/overdue')}>View All</button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Plan</th>
                  <th>Month</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {overdue.map(p => (
                  <tr key={p._id}>
                    <td><strong>{p.customerId?.name}</strong><br /><span className="text-muted" style={{ fontSize: 11 }}>{p.customerId?.phone}</span></td>
                    <td>{p.installmentPlanId?.productName || '-'}</td>
                    <td>Month {p.monthNumber}</td>
                    <td style={{ color: 'var(--danger)' }}>{new Date(p.dueDate).toLocaleDateString('en-PK')}</td>
                    <td><strong>PKR {p.amount?.toLocaleString()}</strong></td>
                    <td><span className="badge badge-danger">OVERDUE</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
