import React, { useState, useEffect } from 'react';
import { notificationsAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const typeIcon = {
  payment_due: '⏰',
  payment_received: '✅',
  payment_overdue: '🚨',
  plan_created: '📋',
  plan_completed: '🎉',
  customer_added: '👤',
  system_alert: '⚙️',
  ai_insight: '🤖'
};

const priorityColor = {
  critical: 'var(--danger)',
  high: 'var(--warning)',
  medium: 'var(--accent)',
  low: 'var(--text-muted)'
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await notificationsAPI.getAll({ limit: 50 });
      setNotifications(data.data);
      setUnreadCount(data.unreadCount);
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await notificationsAPI.markRead(id);
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await notificationsAPI.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    toast.success('All notifications marked as read');
  };

  const deleteNotif = async (id) => {
    await notificationsAPI.delete(id);
    setNotifications(prev => prev.filter(n => n._id !== id));
    toast.success('Notification deleted');
  };

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date);
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">🔔 Notifications</h1>
          <p className="page-subtitle">{unreadCount} unread{unreadCount > 0 ? ' — click to mark as read' : ''}</p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-secondary" onClick={markAllRead}>
            ✓ Mark All Read
          </button>
        )}
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card">
          {notifications.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔕</div>
              <h3>No notifications</h3>
              <p>You're all caught up!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {notifications.map(n => (
                <div key={n._id} onClick={() => !n.isRead && markRead(n._id)} style={{
                  display: 'flex', gap: 16, padding: '16px',
                  borderBottom: '1px solid var(--border)',
                  background: n.isRead ? 'transparent' : 'var(--accent-glow)',
                  cursor: n.isRead ? 'default' : 'pointer',
                  transition: 'var(--transition)',
                  ':hover': { background: 'var(--bg-hover)' }
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'var(--bg-tertiary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, flexShrink: 0,
                    border: `2px solid ${priorityColor[n.priority] || 'var(--border)'}`,
                  }}>
                    {typeIcon[n.type] || '🔔'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <p style={{ fontWeight: n.isRead ? 500 : 700, fontSize: 14 }}>{n.title}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                        {!n.isRead && (
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
                        )}
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(n.createdAt)}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteNotif(n._id); }}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: 2 }}
                        >✕</button>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{n.message}</p>
                    {n.customerId && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Customer: {n.customerId.name}</p>}
                    <span style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700, color: priorityColor[n.priority], letterSpacing: 0.5 }}>
                      {n.priority} priority
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Notifications;
