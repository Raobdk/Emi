import React, { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';

const RegisterModal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff', phone: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave(form);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">➕ Add New User</h3>
          <button className="btn btn-sm btn-secondary btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full Name" required />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input type="email" className="form-control" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="user@example.com" required />
            </div>
            <div className="form-group">
              <label className="form-label">Password *</label>
              <input type="password" className="form-control" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" required minLength={6} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+92 300 0000000" />
            </div>
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select className="form-control form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">✅ Create User</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdminPanel = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const loadUsers = async () => {
    try {
      const { data } = await authAPI.getUsers();
      setUsers(data.users);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleAddUser = async (form) => {
    try {
      await authAPI.register(form);
      toast.success('User created successfully!');
      setShowModal(false);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    }
  };

  const handleToggle = async (id, name, isActive) => {
    if (id === currentUser._id) {
      toast.error("You can't deactivate your own account");
      return;
    }
    try {
      await authAPI.toggleUser(id);
      toast.success(`User ${isActive ? 'deactivated' : 'activated'}`);
      loadUsers();
    } catch {
      toast.error('Failed to update user');
    }
  };

  const stats = {
    total: users.length,
    active: users.filter(u => u.isActive).length,
    admins: users.filter(u => u.role === 'admin').length,
    staff: users.filter(u => u.role === 'staff').length,
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">🛡️ Admin Panel</h1>
          <p className="page-subtitle">User management and system control</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          ➕ Add User
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid mb-6" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: 'Total Users', value: stats.total, icon: '👥', color: 'var(--accent)' },
          { label: 'Active', value: stats.active, icon: '✅', color: 'var(--success)' },
          { label: 'Admins', value: stats.admins, icon: '🛡️', color: 'var(--danger)' },
          { label: 'Staff', value: stats.staff, icon: '👤', color: 'var(--info)' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-icon" style={{ background: `${s.color}15`, fontSize: 20 }}>{s.icon}</div>
            <div className="stat-value" style={{ color: s.color, fontSize: 32 }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">👥 All Users</h3>
        </div>

        {loading ? <LoadingSpinner /> : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Last Login</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: u.role === 'admin' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, var(--accent), var(--accent-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 14 }}>
                          {u.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{u.name}</div>
                          {u._id === currentUser._id && <span style={{ fontSize: 10, color: 'var(--accent)' }}>You</span>}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{u.email}</td>
                    <td style={{ fontSize: 13 }}>{u.phone || '-'}</td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-danger' : 'badge-info'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en-PK') : 'Never'}
                    </td>
                    <td>
                      <span className={`badge ${u.isActive ? 'badge-success' : 'badge-default'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => handleToggle(u._id, u.name, u.isActive)}
                        disabled={u._id === currentUser._id}
                      >
                        {u.isActive ? '🔒 Deactivate' : '✅ Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* System Health */}
      <div className="card" style={{ marginTop: 24 }}>
        <h3 className="card-title mb-6">⚙️ System Health</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { label: 'API Server', status: 'Operational', icon: '🖥️', color: 'var(--success)' },
            { label: 'Database', status: 'Connected', icon: '🗄️', color: 'var(--success)' },
            { label: 'Cron Jobs', status: 'Running', icon: '⏰', color: 'var(--success)' },
            { label: 'PDF Service', status: 'Ready', icon: '📄', color: 'var(--success)' },
            { label: 'Excel Service', status: 'Ready', icon: '📊', color: 'var(--success)' },
            { label: 'AI Engine', status: 'Active', icon: '🤖', color: 'var(--accent)' },
          ].map(({ label, status, icon, color }) => (
            <div key={label} style={{ padding: 16, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>{icon}</span>
              <div>
                <p style={{ fontWeight: 600, fontSize: 14 }}>{label}</p>
                <p style={{ fontSize: 12, color }}>{status}</p>
              </div>
              <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: color, animation: 'pulse 2s infinite' }} />
            </div>
          ))}
        </div>
      </div>

      {showModal && <RegisterModal onClose={() => setShowModal(false)} onSave={handleAddUser} />}
    </div>
  );
};

export default AdminPanel;
