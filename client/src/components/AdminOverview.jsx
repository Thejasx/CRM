import React, { useState, useEffect, useContext } from 'react';
import { Row, Col, Card, Badge, ProgressBar } from 'react-bootstrap';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { io } from 'socket.io-client';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, PointElement, LineElement, ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { FaUsers, FaCalendarCheck, FaCheckCircle, FaTrophy } from 'react-icons/fa';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ArcElement);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const AdminOverview = () => {
  const { user } = useContext(AuthContext);
  const [sales, setSales] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [staff, setStaff] = useState([]);
  const [leads, setLeads] = useState([]);

  const fetchDashboardData = async () => {
    try {
      const [salesRes, meetRes, staffRes, leadRes] = await Promise.all([
        api.get('/sales').catch(() => ({ data: [] })),
        api.get('/meetings').catch(() => ({ data: [] })),
        api.get('/admin/staff').catch(() => ({ data: [] })),
        api.get('/leads').catch(() => ({ data: [] }))
      ]);
      setSales(salesRes.data || []);
      setMeetings(meetRes.data || []);
      setStaff(staffRes.data || []);
      setLeads(leadRes.data || []);
    } catch (err) {
      console.error('Error loading admin overview data:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');
    socket.on('saleAdded', fetchDashboardData);
    socket.on('meetingAssigned', fetchDashboardData);
    socket.on('meetingAcknowledged', fetchDashboardData);
    socket.on('leadAssigned', fetchDashboardData);
    socket.on('leadWon', fetchDashboardData);   // fires when any lead marked Won

    return () => socket.disconnect();
  }, []);

  // ── Aggregate stats from LEADS (source of truth for Won/Lost) ──
  const wonLeads = leads.filter(l => l.status === 'Won' || l.status === 'won');
  const lostLeads = leads.filter(l => l.status === 'Lost' || l.status === 'lost');
  const activeLeads = leads.filter(l => !['Won','won','Lost','lost'].includes(l.status));

  const wonValueINR = wonLeads.reduce((a, b) => a + (b.amountINR || 0), 0);
  const totalPipelineINR = leads.reduce((a, b) => a + (b.amountINR || 0), 0);

  // ── Monthly data (last 6 months) from leads ──
  const now = new Date();
  const last6 = Array.from({ length: 6 }, (_, i) => {
    const idx = (now.getMonth() - 5 + i + 12) % 12;
    const year = now.getFullYear() - (idx > now.getMonth() ? 1 : 0);

    const monthLeads = leads.filter(l => {
      const d = new Date(l.createdAt);
      return !isNaN(d) && d.getMonth() === idx && d.getFullYear() === year;
    });
    const monthWon = monthLeads.filter(l => l.status === 'Won' || l.status === 'won');

    return {
      label: MONTHS[idx],
      total: monthLeads.reduce((a, b) => a + (b.amountINR || 0), 0),
      won: monthWon.reduce((a, b) => a + (b.amountINR || 0), 0),
      wonCount: monthWon.length
    };
  });

  const revenueChartData = {
    labels: last6.map(m => m.label),
    datasets: [
      {
        label: 'Total Pipeline (₹)',
        data: last6.map(m => m.total),
        backgroundColor: 'rgba(92, 80, 230, 0.8)',
        borderRadius: 8,
      },
      {
        label: 'Won Value (₹)',
        data: last6.map(m => m.won),
        backgroundColor: 'rgba(16, 185, 129, 0.85)',
        borderRadius: 8,
      }
    ]
  };

  const revenueChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top', labels: { font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: ctx => ` ${ctx.dataset.label}: ₹${ctx.raw.toLocaleString('en-IN')}`
        }
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: { callback: v => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}` }
      }
    }
  };

  const pipelineData = {
    labels: ['Won Deals', 'Active Leads', 'Lost Deals'],
    datasets: [{
      data: [wonLeads.length || 0, activeLeads.length || 0, lostLeads.length || 0],
      backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
      borderWidth: 0,
    }]
  };

  // ── Staff performance ranked by won value ──
  const staffPerformance = staff.map(s => {
    const sLeads = leads.filter(l =>
      l.assignedTo?._id === s._id || l.assignedTo === s._id ||
      l.createdBy?._id === s._id || l.createdBy === s._id
    );
    const wonStaff = sLeads.filter(l => l.status === 'Won' || l.status === 'won');
    const wonVal = wonStaff.reduce((a, b) => a + (b.amountINR || 0), 0);
    const totalVal = sLeads.reduce((a, b) => a + (b.amountINR || 0), 0);
    return { ...s, wonVal, totalVal, wonCount: wonStaff.length, dealsCount: sLeads.length };
  }).sort((a, b) => b.wonVal - a.wonVal).slice(0, 5);

  const maxWon = staffPerformance[0]?.wonVal || 1;

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Central Admin Dashboard ⚡</h3>
          <p className="text-muted small mb-0">Real-time metrics, live revenue tracking in INR (₹), and staff performance.</p>
        </div>
        <div className="d-flex align-items-center gap-2 bg-success-subtle text-success px-3 py-2 rounded-pill fw-semibold small">
          <span className="live-dot"></span> Live · Auto-updates on Won
        </div>
      </div>

      {/* KPI Cards */}
      <Row className="g-4 mb-4">
        <Col lg={3} md={6}>
          <Card className="crm-card p-3">
            <div className="d-flex align-items-center gap-3">
              <div className="d-flex align-items-center justify-content-center bg-primary-subtle text-primary rounded-circle" style={{ width:'52px',height:'52px',fontSize:'22px' }}>
                ₹
              </div>
              <div>
                <div className="text-muted small fw-semibold text-uppercase">Total Pipeline (INR)</div>
                <h4 className="fw-bold mb-0">₹{totalPipelineINR.toLocaleString('en-IN')}</h4>
                <div className="text-muted" style={{fontSize:'11px'}}>{leads.length} leads</div>
              </div>
            </div>
          </Card>
        </Col>

        <Col lg={3} md={6}>
          <Card className="crm-card p-3">
            <div className="d-flex align-items-center gap-3">
              <div className="d-flex align-items-center justify-content-center bg-success-subtle text-success rounded-circle" style={{ width:'52px',height:'52px',fontSize:'22px' }}>
                <FaTrophy />
              </div>
              <div>
                <div className="text-muted small fw-semibold text-uppercase">Won Value (INR)</div>
                <h4 className="fw-bold mb-0 text-success">₹{wonValueINR.toLocaleString('en-IN')}</h4>
                <div className="text-muted" style={{fontSize:'11px'}}>{wonLeads.length} deals closed</div>
              </div>
            </div>
          </Card>
        </Col>

        <Col lg={3} md={6}>
          <Card className="crm-card p-3">
            <div className="d-flex align-items-center gap-3">
              <div className="d-flex align-items-center justify-content-center bg-primary-subtle text-primary rounded-circle" style={{ width:'52px',height:'52px',fontSize:'22px' }}>
                <FaUsers />
              </div>
              <div>
                <div className="text-muted small fw-semibold text-uppercase">Active Staff</div>
                <h4 className="fw-bold mb-0">{staff.length} Members</h4>
              </div>
            </div>
          </Card>
        </Col>

        <Col lg={3} md={6}>
          <Card className="crm-card p-3">
            <div className="d-flex align-items-center gap-3">
              <div className="d-flex align-items-center justify-content-center bg-warning-subtle text-warning rounded-circle" style={{ width:'52px',height:'52px',fontSize:'22px' }}>
                <FaCalendarCheck />
              </div>
              <div>
                <div className="text-muted small fw-semibold text-uppercase">Meetings Scheduled</div>
                <h4 className="fw-bold mb-0">{meetings.length}</h4>
                <div className="text-muted" style={{fontSize:'11px'}}>{meetings.filter(m=>m.acknowledged).length} acknowledged</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row className="g-4 mb-4">
        {/* Monthly Revenue vs Won Bar Chart */}
        <Col lg={7} md={12}>
          <Card className="crm-card p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h6 className="fw-bold mb-0">Monthly Pipeline vs Won Value (INR ₹)</h6>
                <div className="text-muted" style={{fontSize:'11px'}}>Last 6 months — updates in real-time when leads are marked Won</div>
              </div>
              <Badge bg="success" className="px-3 py-2 rounded-pill">
                This Month Won: ₹{last6[last6.length-1]?.won.toLocaleString('en-IN') || '0'}
              </Badge>
            </div>
            <div style={{ height:'250px' }}>
              <Bar data={revenueChartData} options={revenueChartOptions} />
            </div>
          </Card>
        </Col>

        {/* Pipeline Doughnut */}
        <Col lg={5} md={12}>
          <Card className="crm-card p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0">Deal Conversion Pipeline</h6>
              <span className="text-muted small">Real-time</span>
            </div>
            <div className="d-flex align-items-center justify-content-center" style={{ height:'190px' }}>
              <Doughnut data={pipelineData} options={{ maintainAspectRatio: false }} />
            </div>
            <div className="d-flex justify-content-center gap-3 mt-3 small">
              <div className="text-center">
                <div className="text-success fw-bold">Won</div>
                <div className="fw-semibold">{wonLeads.length}</div>
                <div style={{fontSize:'10px'}}>₹{wonValueINR.toLocaleString('en-IN')}</div>
              </div>
              <div className="text-center">
                <div className="text-warning fw-bold">Active</div>
                <div className="fw-semibold">{activeLeads.length}</div>
              </div>
              <div className="text-center">
                <div className="text-danger fw-bold">Lost</div>
                <div className="fw-semibold">{lostLeads.length}</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Staff Performance & Recent Activity */}
      <Row className="g-4">
        {/* Staff Won Value Leaderboard */}
        <Col lg={6}>
          <Card className="crm-card p-4">
            <h6 className="fw-bold mb-1">Staff Performance — Won Deals (₹)</h6>
            <div className="text-muted small mb-3">Updates when any staff marks a lead as Won</div>
            {staffPerformance.length === 0 ? (
              <div className="text-muted small py-3 text-center">No staff data yet.</div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {staffPerformance.map((s, i) => (
                  <div key={s._id}>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <div className="d-flex align-items-center gap-2">
                        <div className="crm-avatar-fallback" style={{ width:'30px', height:'30px', fontSize:'12px' }}>
                          {s.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="fw-semibold small">{s.name}</div>
                          <div className="text-muted" style={{fontSize:'10px'}}>
                            {s.dealsCount} leads · {s.wonCount} won
                          </div>
                        </div>
                      </div>
                      <span className="fw-bold small text-success">₹{s.wonVal.toLocaleString('en-IN')}</span>
                    </div>
                    <ProgressBar
                      now={maxWon > 0 ? (s.wonVal / maxWon) * 100 : 0}
                      style={{ height:'6px', borderRadius:'4px' }}
                      variant={i === 0 ? 'success' : i === 1 ? 'primary' : 'info'}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>

        {/* Recent Won / Activity Feed */}
        <Col lg={6}>
          <Card className="crm-card p-4">
            <h6 className="fw-bold mb-3">Recent Won Deals Feed</h6>
            <div className="d-flex flex-column gap-3">
              {wonLeads.length === 0 ? (
                <div className="text-muted small py-3 text-center">No won deals yet. Mark a lead as Won to see it here.</div>
              ) : (
                wonLeads.slice(0, 6).map(l => (
                  <div key={l._id} className="d-flex justify-content-between align-items-center border-bottom pb-2">
                    <div>
                      <div className="fw-bold text-dark small">{l.title || l.name || 'Lead Deal'}</div>
                      <div className="text-muted" style={{fontSize:'11px'}}>
                        Client: <strong>{l.name}</strong>
                        {l.assignedTo?.name && <> · Staff: <strong className="text-primary">{l.assignedTo.name}</strong></>}
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="fw-bold text-success">₹{(l.amountINR || 0).toLocaleString('en-IN')}</div>
                      <Badge bg="success" style={{fontSize:'10px'}}>
                        <FaCheckCircle className="me-1" />Won
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminOverview;
