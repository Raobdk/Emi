import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './Sidebar.css';

import { 
  LayoutDashboard, Users, ClipboardList, AlertTriangle, 
  LineChart, Bell, Bot, Shield, Settings, CreditCard, LogOut 
} from 'lucide-react';

const navItems = [
  { path: '/dashboard',        icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
  { path: '/customers',        icon: <Users size={20} />, label: 'Customers' },
  { path: '/installments',     icon: <ClipboardList size={20} />, label: 'Installments' },
  { path: '/payments/overdue', icon: <AlertTriangle size={20} />, label: 'Overdue' },
  { path: '/reports',          icon: <LineChart size={20} />, label: 'Reports' },
  { path: '/notifications',    icon: <Bell size={20} />, label: 'Notifications' },
  { path: '/ai-assistant',     icon: <Bot size={20} />, label: 'AI Assistant' },
];

const adminItems = [
  { path: '/admin',   icon: <Shield size={20} />, label: 'Admin Panel' },
  { path: '/profile', icon: <Settings size={20} />, label: 'Settings' },
];

const Sidebar = ({ onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon"><CreditCard size={24} color="#fff" /></div>
        <div>
          <div className="logo-text">EMI System</div>
          <div className="logo-sub">Management Portal</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Main Menu</div>
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}

        {user?.role === 'admin' && (
          <>
            <div className="nav-section-label" style={{ marginTop: 16 }}>Admin</div>
            {adminItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ))}
          </>
        )}

        {user?.role !== 'admin' && (
          <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon"><Settings size={20} /></span>
            <span className="nav-label">Settings</span>
          </NavLink>
        )}
      </nav>

      {/* User Profile */}
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">
            {user?.avatar
              ? <img src={`http://${window.location.hostname}:5000${user.avatar}`} alt="avatar" />
              : user?.name?.[0]?.toUpperCase()
            }
          </div>
          <div className="user-details">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role}</div>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout} title="Logout">
          <LogOut size={20} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
