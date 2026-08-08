import React, { useContext, useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import StaffRoutes from './StaffRoutes';
import { io } from 'socket.io-client';
import { FaThLarge, FaPlusCircle, FaCalendarAlt, FaUserTag, FaCog, FaSearch, FaBell, FaSignOutAlt } from 'react-icons/fa';
import { ProgressBar, Button, Badge } from 'react-bootstrap';

const StaffDashboard = () => {
  const { logout, user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState(0);

  useEffect(() => {
    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');
    socket.on('meetingAssigned', () => setNotifications(n => n + 1));
    socket.on('leadAssigned', () => setNotifications(n => n + 1));
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
              <NavLink to="/staff/overview" className={({ isActive }) => `crm-nav-item ${isActive ? 'active' : ''}`}>
                <FaThLarge /> Overview
              </NavLink>
              <NavLink to="/staff/sales" className={({ isActive }) => `crm-nav-item ${isActive ? 'active' : ''}`}>
                <FaPlusCircle /> Add Sale (INR ₹)
              </NavLink>
              <NavLink to="/staff/meetings" className={({ isActive }) => `crm-nav-item ${isActive ? 'active' : ''}`}>
                <FaCalendarAlt /> My Meetings
              </NavLink>
              <NavLink to="/staff/leads" className={({ isActive }) => `crm-nav-item ${isActive ? 'active' : ''}`}>
                <FaUserTag /> Assigned Leads
              </NavLink>
              <NavLink to="/staff/settings" className={({ isActive }) => `crm-nav-item ${isActive ? 'active' : ''}`}>
                <FaCog /> Settings & Integrations
              </NavLink>
            </nav>
          </div>

          {/* Bottom Profile Widget matching image */}
          <div>
            <div className="crm-user-widget mb-3">
              <div className="crm-user-widget-profile">
                <div className="crm-avatar-fallback">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
                </div>
                <div>
                  <div className="fw-bold small text-dark">{user?.name || 'Staff User'}</div>
                  <div className="text-muted" style={{ fontSize: '11px' }}>Staff Member</div>
                </div>
              </div>
              <div>
                <div className="d-flex justify-content-between small text-muted fw-semibold mb-1" style={{ fontSize: '11px' }}>
                  <span>My Drive</span>
                  <span>80%</span>
                </div>
                <ProgressBar now={80} variant="success" style={{ height: '5px' }} />
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
              <input type="text" className="crm-search-input" placeholder="Search my deals & meetings..." />
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
                <div className="crm-avatar-fallback" style={{ width: '38px', height: '38px', fontSize: '14px' }}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
                </div>
                <div className="d-none d-md-block">
                  <div className="fw-bold small leading-none">{user?.name || 'Staff User'}</div>
                  <div className="text-muted" style={{ fontSize: '12px' }}>{user?.email || 'staff@crm.com'}</div>
                </div>
              </div>
            </div>
          </header>

          {/* Dynamic Page Content */}
          <main className="p-4 flex-grow-1" style={{ overflowY: 'auto' }}>
            <StaffRoutes />
          </main>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
