import React, { useState, useContext } from 'react';
import { Form, Button } from 'react-bootstrap';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isAuthenticated, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(email, password);
  };



  if (isAuthenticated) {
    if (user?.role === 'admin') navigate('/admin');
    else navigate('/staff');
    return null;
  }

  return (
    <div className="login-split-wrapper">
      {/* Background Glowing Ambient Light Orbs */}
      <div className="login-bg-orb-1"></div>
      <div className="login-bg-orb-2"></div>

      {/* Left Glassmorphic Login Form Section */}
      <div className="login-left-section">
        {/* Brand Header */}
        <div>
          <div className="login-brand-box">
            <span className="login-logo-black">dipch</span>
            <span className="fw-extrabold text-dark fs-4">CRM</span>
          </div>
          {/* Gemini AI Badge */}
          <div className="gemini-ai-badge" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            marginTop: '10px',
            padding: '5px 13px 5px 9px',
            borderRadius: '100px',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.10) 0%, rgba(168,85,247,0.12) 50%, rgba(59,130,246,0.10) 100%)',
            border: '1px solid rgba(99,102,241,0.25)',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 2px 12px rgba(99,102,241,0.15)',
            cursor: 'default',
            userSelect: 'none',
          }}>
            {/* Gemini Spark Icon */}
            <svg width="16" height="16" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <defs>
                <linearGradient id="gemGrad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="50%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
              <path d="M14 2C14 2 15.5 9.5 22 14C15.5 18.5 14 26 14 26C14 26 12.5 18.5 6 14C12.5 9.5 14 2 14 2Z" fill="url(#gemGrad)" />
            </svg>
            <span style={{
              fontSize: '11.5px',
              fontWeight: 600,
              background: 'linear-gradient(90deg, #6366f1, #a855f7, #3b82f6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '0.01em',
            }}>Gemini AI Integrated</span>
          </div>
        </div>

        {/* Glassmorphic Form Card */}
        <div className="login-glass-card my-auto" style={{ maxWidth: '420px', width: '100%', margin: '0 auto' }}>
          <div className="mb-4">
            <h2 className="fw-bold mb-1 text-dark" style={{ letterSpacing: '-0.6px' }}>
              Log in to account
            </h2>
            <p className="text-muted small mb-0">Welcome back! Please enter your staff or admin details.</p>
          </div>

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label className="small text-muted fw-semibold mb-1">Email address</Form.Label>
              <Form.Control
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="login-input-clean"
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="small text-muted fw-semibold mb-1">Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="login-input-clean"
              />
            </Form.Group>

            <Button type="submit" className="login-btn-black mb-4">
              Log in to Dashboard →
            </Button>
          </Form>
        </div>

        {/* Footer info */}
        <div className="text-muted small">
          &copy; {new Date().getFullYear()} dipch CRM. Real-time Sales &amp; Lead Management Platform.
        </div>
      </div>

      {/* Right Glassmorphic Studio & UI Mockup Section */}
      <div className="login-right-section">
        {/* Geometric Background SVGs */}
        <svg className="login-geo-shape" style={{ top: '20px', left: '20px', opacity: 0.4 }} width="120" height="80">
          <pattern id="dotGrid" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="2.5" fill="#ffffff" />
          </pattern>
          <rect width="120" height="80" fill="url(#dotGrid)" />
        </svg>

        <svg className="login-geo-shape" style={{ top: '-40px', right: '-40px', opacity: 0.6 }} width="220" height="220">
          <circle cx="110" cy="110" r="110" fill="#ef4444" />
        </svg>

        <svg className="login-geo-shape" style={{ bottom: '40px', left: '-50px', opacity: 0.5 }} width="160" height="160">
          <polygon points="80,0 160,160 0,160" fill="#ec4899" />
        </svg>

        {/* Glassmorphic Interactive Dashboard Card Mockup */}
        <div className="glass-dashboard-preview my-auto text-center">
          {/* Header Row of Mockup */}
          <div className="d-flex align-items-center justify-content-between mb-4 border-bottom border-white-10 pb-3">
            <div className="d-flex align-items-center gap-2 text-start">
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#6366f1', color: '#fff', fontWeight: 800, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                d
              </div>
              <div>
                <div className="fw-bold text-white small leading-none">dipch CRM Dashboard</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>Real-time Sales Feed</div>
              </div>
            </div>
            <span className="glass-pill-badge">● Live Websocket</span>
          </div>

          {/* Metric Tiles inside Mockup */}
          <div className="d-grid gap-2 mb-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="p-2 rounded-3 text-start" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>Won Sales</div>
              <div className="fw-bold text-success small">₹2,45,000</div>
            </div>
            <div className="p-2 rounded-3 text-start" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>Deals Won</div>
              <div className="fw-bold text-info small">4 Deals</div>
            </div>
            <div className="p-2 rounded-3 text-start" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>Satisfaction</div>
              <div className="fw-bold text-warning small">86% Win</div>
            </div>
          </div>

          {/* Vector Chart Line Graphic inside Mockup */}
          <div className="p-3 rounded-3 mb-3 text-start" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="small text-white-50" style={{ fontSize: '11px' }}>Monthly Sales Pipeline Growth</span>
              <span className="text-success fw-bold" style={{ fontSize: '11px' }}>+34.2% ↗</span>
            </div>
            <svg width="100%" height="60" viewBox="0 0 300 60" fill="none">
              <path d="M0,50 Q40,45 80,30 T160,25 T240,10 T300,5" stroke="#6366f1" strokeWidth="3" fill="none" />
              <path d="M0,50 Q40,45 80,30 T160,25 T240,10 T300,5 L300,60 L0,60 Z" fill="url(#chartGrad)" opacity="0.3" />
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Subtitle & Carousel Dots */}
          <div className="mt-4 pt-1">
            <h4 className="fw-bold mb-1 text-white" style={{ letterSpacing: '-0.3px', fontSize: '20px' }}>
              Check the status
            </h4>
            <p className="text-white-50 small mb-3" style={{ fontSize: '12px', maxWidth: '340px', margin: '0 auto' }}>
              It's easy to track the status of your online deals, staff performance &amp; sales pipeline in real-time.
            </p>
            {/* Carousel Dots */}
            <div className="d-flex justify-content-center gap-2">
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 8px #6366f1' }} />
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
