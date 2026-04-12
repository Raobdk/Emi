import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data } = await authAPI.updateProfile(profileForm);
      updateUser(data.user);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSavingPass(true);
    try {
      await authAPI.changePassword({ currentPassword: passForm.currentPassword, newPassword: passForm.newPassword });
      toast.success('Password changed successfully!');
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <div className="animate-fadeIn" style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">⚙️ Profile & Settings</h1>
          <p className="page-subtitle">Manage your account information</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="card mb-6" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, fontWeight: 700, color: '#fff', flexShrink: 0,
          boxShadow: '0 8px 24px var(--accent-glow)'
        }}>
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>{user?.name}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{user?.email}</p>
          <span className={`badge ${user?.role === 'admin' ? 'badge-danger' : 'badge-info'}`} style={{ marginTop: 8 }}>
            {user?.role?.toUpperCase()}
          </span>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Last Login</p>
          <p style={{ fontSize: 14, fontWeight: 600 }}>
            {user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString('en-PK') : 'N/A'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {[
          { id: 'profile', label: '👤 Profile Info' },
          { id: 'password', label: '🔐 Change Password' },
          { id: 'system', label: '⚙️ System Info' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card animate-fadeIn">
          <h3 className="card-title mb-6">Update Profile Information</h3>
          <form onSubmit={handleProfileSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-control" value={profileForm.name}
                  onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} placeholder="Your name" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input className="form-control" value={profileForm.phone}
                  onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="+92 300 0000000" />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-control" value={user?.email} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Email cannot be changed</p>
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <input className="form-control" value={user?.role} disabled style={{ opacity: 0.6, cursor: 'not-allowed', textTransform: 'capitalize' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                {savingProfile ? '⏳ Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <div className="card animate-fadeIn">
          <h3 className="card-title mb-6">Change Password</h3>
          <form onSubmit={handlePasswordSave} style={{ maxWidth: 420 }}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input type="password" className="form-control" value={passForm.currentPassword}
                onChange={e => setPassForm({ ...passForm, currentPassword: e.target.value })}
                placeholder="Enter current password" required />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input type="password" className="form-control" value={passForm.newPassword}
                onChange={e => setPassForm({ ...passForm, newPassword: e.target.value })}
                placeholder="Min. 6 characters" required minLength={6} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input type="password" className="form-control" value={passForm.confirmPassword}
                onChange={e => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                placeholder="Repeat new password" required />
              {passForm.confirmPassword && passForm.newPassword !== passForm.confirmPassword && (
                <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>⚠️ Passwords do not match</p>
              )}
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingPass}>
              {savingPass ? '⏳ Changing...' : '🔐 Change Password'}
            </button>
          </form>
        </div>
      )}

      {/* System Info Tab */}
      {activeTab === 'system' && (
        <div className="card animate-fadeIn">
          <h3 className="card-title mb-6">System Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              ['Application', 'EMI Management System'],
              ['Version', '1.0.0'],
              ['Backend', 'Node.js + Express'],
              ['Database', 'MongoDB'],
              ['Frontend', 'React 18'],
              ['PDF Engine', 'PDFKit'],
              ['Excel Engine', 'ExcelJS'],
              ['Real-time', 'Socket.IO'],
            ].map(([key, val]) => (
              <div key={key} style={{ padding: 14, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{key}</p>
                <p style={{ fontWeight: 600, marginTop: 4 }}>{val}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24, padding: 16, background: 'var(--success-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--success)30' }}>
            <p style={{ color: 'var(--success)', fontWeight: 700 }}>✅ All systems operational</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>EMI system running in {process.env.NODE_ENV || 'development'} mode</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
