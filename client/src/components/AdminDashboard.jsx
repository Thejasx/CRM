import React, { useContext, useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import AdminRoutes from './AdminRoutes';
import { io } from 'socket.io-client';
import { FaThLarge, FaUsers, FaCalendarAlt, FaUserTag, FaChartLine, FaCog, FaSearch, FaBell, FaSignOutAlt } from 'react-icons/fa';
import { ProgressBar, Button, Badge } from 'react-bootstrap';

const AdminDashboard = () => {
  const { logout, user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState(0);

  useEffect(() => {
    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');
    socket.on('saleAdded', () => setNotifications(n => n + 1));
    socket.on('meetingAcknowledged', () => setNotifications(n => n + 1));
    return () => socket.disconnect();
  }, []);

  return (
    <div className="crm-app-wrapper">
      <div className="crm-main-container">
        {/* Left Sidebar matching Reference Image */}
        <aside className="crm-sidebar">
          <div>
            {/* Logo */}
            <div className="crm-brand">
              <div className="crm-brand-logo">
                ⚡
              </div>
              <span className="crm-brand-name">CRM</span>
            </div>

            {/* Navigation Menu */}
            <nav className="crm-nav-menu">
              <NavLink to="/admin/dashboard" className={({ isActive }) => `crm-nav-item ${isActive ? 'active' : ''}`}>
                <FaThLarge /> Dashboard
              </NavLink>
              <NavLink to="/admin/staff" className={({ isActive }) => `crm-nav-item ${isActive ? 'active' : ''}`}>
                <FaUsers /> Staff Management
              </NavLink>
              <NavLink to="/admin/meetings" className={({ isActive }) => `crm-nav-item ${isActive ? 'active' : ''}`}>
                <FaCalendarAlt /> Meeting Calendar
              </NavLink>
              <NavLink to="/admin/leads" className={({ isActive }) => `crm-nav-item ${isActive ? 'active' : ''}`}>
                <FaUserTag /> Add Sale / Assign Leads
              </NavLink>
              <NavLink to="/admin/analytics" className={({ isActive }) => `crm-nav-item ${isActive ? 'active' : ''}`}>
                <FaChartLine /> Live Analytics (INR)
              </NavLink>
              <NavLink to="/admin/settings" className={({ isActive }) => `crm-nav-item ${isActive ? 'active' : ''}`}>
                <FaCog /> Settings & Integrations
              </NavLink>
            </nav>
          </div>

          {/* Bottom Admin Profile Widget */}
          <div>
            <div className="crm-user-widget mb-3">
              <div className="crm-user-widget-profile">
                <div className="crm-avatar-fallback bg-danger text-white">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div>
                  <div className="fw-bold small text-dark">{user?.name || 'Central Admin'}</div>
                  <div className="text-muted" style={{ fontSize: '11px' }}>System Admin</div>
                </div>
              </div>
              <div>
                <div className="d-flex justify-content-between small text-muted fw-semibold mb-1" style={{ fontSize: '11px' }}>
                  <span>System Capacity</span>
                  <span>95%</span>
                </div>
                <ProgressBar now={95} variant="primary" style={{ height: '5px' }} />
              </div>
            </div>

            <Button 
              variant="outline-danger" 
              size="sm" 
              className="w-100 d-flex align-items-center justify-content-center gap-2"
              onClick={logout}
              style={{ borderRadius: '12px' }}
            >
              <FaSignOutAlt /> Logout
            </Button>
          </div>
        </aside>

        {/* Main Content Workspace */}
        <div className="flex-grow-1 d-flex flex-column" style={{ background: 'var(--bg-card)' }}>
          {/* Top Header Bar */}
          <header className="crm-header">
            <div className="crm-search-bar">
              <FaSearch className="crm-search-icon" />
              <input type="text" className="crm-search-input" placeholder="Search deals, staff, leads..." />
            </div>

            <div className="d-flex align-items-center gap-4">
              <div 
                className="position-relative text-muted" 
                style={{ cursor: 'pointer', fontSize: '18px' }}
                onClick={() => setNotifications(0)}
              >
                <FaBell />
                {notifications > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '9px' }}>
                    {notifications}
                  </span>
                )}
              </div>

              <div className="d-flex align-items-center gap-3">
                <div className="crm-avatar-fallback bg-danger text-white" style={{ width: '38px', height: '38px', fontSize: '14px' }}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className="d-none d-md-block">
                  <div className="fw-bold small leading-none">{user?.name || 'Central Admin'}</div>
                  <div className="text-muted" style={{ fontSize: '12px' }}>{user?.email || 'admin@crm.com'}</div>
                </div>
              </div>
            </div>
          </header>

          {/* Dynamic Page Content */}
          <main className="p-4 flex-grow-1" style={{ overflowY: 'auto' }}>
            <AdminRoutes />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
