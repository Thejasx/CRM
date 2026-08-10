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
import { FaUsers, FaCalendarCheck, FaCheckCircle, FaTrophy, FaShoppingBag } from 'react-icons/fa';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ArcElement);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const AdminOverview = () => {
  const { user } = useContext(AuthContext);
  const [sales, setSales]       = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [staff, setStaff]       = useState([]);
  const [leads, setLeads]       = useState([]);

  // Chart Source Selector for Admin Overview
  const [chartSource, setChartSource] = useState('combined'); // 'combined' | 'sales' | 'leads'

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
    socket.on('leadWon', fetchDashboardData);

    return () => socket.disconnect();
  }, []);

  // ── Aggregate stats ──
  const wonLeads    = leads.filter(l => ['Won','won'].includes(l.status));
  const lostLeads   = leads.filter(l => ['Lost','lost'].includes(l.status));
  const activeLeads = leads.filter(l => !['Won','won','Lost','lost'].includes(l.status));
  const lostSales   = lostLeads.length;

  const wonSalesEntries = sales.filter(s => ['won','Won'].includes(s.status));
  const wonSalesValue   = wonSalesEntries.reduce((a, b) => a + (b.amountINR || b.amount || 0), 0);
  const totalSalesValue = sales.reduce((a, b) => a + (b.amountINR || b.amount || 0), 0);

  const wonLeadsValue    = wonLeads.reduce((a, b) => a + (b.amountINR || 0), 0);
  const totalPipelineINR = leads.reduce((a, b) => a + (b.amountINR || 0), 0);

  const combinedWonRevenue = wonLeadsValue + wonSalesValue;

  // ── Monthly 6-month breakdown ──
  const now = new Date();
  const last6 = Array.from({ length: 6 }, (_, i) => {
    const idx = (now.getMonth() - 5 + i + 12) % 12;
    const year = now.getFullYear() - (idx > now.getMonth() ? 1 : 0);

    // Leads for month
    const monthLeads = leads.filter(l => {
      const d = new Date(l.createdAt);
      return !isNaN(d) && d.getMonth() === idx && d.getFullYear() === year;
    });
    const monthWonLeads = monthLeads.filter(l => ['Won','won'].includes(l.status));
    const leadsWonVal   = monthWonLeads.reduce((a, b) => a + (b.amountINR || 0), 0);

    // Sales entries for month
    const monthSales = sales.filter(s => {
      const d = new Date(s.createdAt);
      return !isNaN(d) && d.getMonth() === idx && d.getFullYear() === year && ['won','Won'].includes(s.status);
    });
    const salesWonVal = monthSales.reduce((a, b) => a + (b.amountINR || b.amount || 0), 0);

    return {
      label: MONTHS[idx],
      leadsWon: leadsWonVal,
      salesWon: salesWonVal,
      combinedWon: leadsWonVal + salesWonVal,
    };
  });

  const revenueChartData = {
    labels: last6.map(m => m.label),
    datasets: chartSource === 'sales' ? [
      {
        label: 'Recorded Staff Sales Entries (₹)',
        data: last6.map(m => m.salesWon),
        backgroundColor: '#10b981',
        borderRadius: 8,
      }
    ] : chartSource === 'leads' ? [
      {
        label: 'Won Leads Pipeline (₹)',
        data: last6.map(m => m.leadsWon),
        backgroundColor: '#6366f1',
        borderRadius: 8,
      }
    ] : [
      {
        label: 'Combined Won Revenue (Sales + Leads ₹)',
        data: last6.map(m => m.combinedWon),
        backgroundColor: 'rgba(99, 102, 241, 0.85)',
        borderRadius: 8,
      },
      {
        label: 'Recorded Staff Sales Entries (₹)',
        data: last6.map(m => m.salesWon),
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
      data: [
        wonLeads.length   > 0 ? wonLeads.length   : 0,
        activeLeads.length > 0 ? activeLeads.length : 0,
        lostLeads.length  > 0 ? lostLeads.length  : 0,
      ],
      backgroundColor: ['#10b981', '#6366f1', '#ef4444'],
      borderWidth: 2,
      borderColor: '#fff',
      hoverOffset: 8,
    }]
  };

  // Win rate
  const totalDecided = wonLeads.length + lostLeads.length;
  const winRate = totalDecided > 0 ? Math.round((wonLeads.length / totalDecided) * 100) : 0;

  // ── Staff performance ranked by combined won value (Leads + Sales) ──
  const staffPerformance = staff.map(s => {
    const sLeads = leads.filter(l =>
      l.assignedTo?._id === s._id || l.assignedTo === s._id ||
      l.createdBy?._id === s._id || l.createdBy === s._id
    );
    const wonStaffLeads = sLeads.filter(l => ['Won','won'].includes(l.status));
    const wonLeadsVal   = wonStaffLeads.reduce((a, b) => a + (b.amountINR || 0), 0);

    const sSales = sales.filter(sec =>
      sec.createdBy?._id === s._id || sec.createdBy === s._id
    );
    const wonSalesEntries = sSales.filter(sec => ['won','Won'].includes(sec.status));
    const wonSalesVal     = wonSalesEntries.reduce((a, b) => a + (b.amountINR || b.amount || 0), 0);

    const combinedWonVal = wonLeadsVal + wonSalesVal;
    const totalDealsCount = sLeads.length + sSales.length;
    const wonCountTotal = wonStaffLeads.length + wonSalesEntries.length;

    return {
      ...s,
      wonVal: combinedWonVal,
      wonLeadsVal,
      wonSalesVal,
      wonCount: wonCountTotal,
      dealsCount: totalDealsCount
    };
  }).sort((a, b) => b.wonVal - a.wonVal).slice(0, 5);

  const maxWon = staffPerformance[0]?.wonVal || 1;

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h3 className="fw-bold mb-1">Central Admin Dashboard ⚡</h3>
          <p className="text-muted small mb-0">Real-time revenue analytics, staff sales entries, and lead pipeline monitoring.</p>
        </div>
        <div className="d-flex align-items-center gap-2 bg-success-subtle text-success px-3 py-2 rounded-pill fw-semibold small">
          <span className="live-dot"></span> Live · Real-time Socket Connected
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
                <div className="text-muted small fw-semibold text-uppercase">Total Combined Won</div>
                <h4 className="fw-bold mb-0">₹{combinedWonRevenue.toLocaleString('en-IN')}</h4>
                <div className="text-muted" style={{fontSize:'11px'}}>Won Leads + Sales Entries</div>
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
                <div className="text-muted small fw-semibold text-uppercase">Won Leads Value</div>
                <h4 className="fw-bold mb-0 text-success">₹{wonLeadsValue.toLocaleString('en-IN')}</h4>
                <div className="text-muted" style={{fontSize:'11px'}}>{wonLeads.length} leads won</div>
              </div>
            </div>
          </Card>
        </Col>

        <Col lg={3} md={6}>
          <Card className="crm-card p-3">
            <div className="d-flex align-items-center gap-3">
              <div className="d-flex align-items-center justify-content-center rounded-circle" style={{ width:'52px',height:'52px',fontSize:'22px', background: '#d1fae5', color: '#059669' }}>
                <FaShoppingBag />
              </div>
              <div>
                <div className="text-muted small fw-semibold text-uppercase">Staff Recorded Sales</div>
                <h4 className="fw-bold mb-0 text-success">₹{wonSalesValue.toLocaleString('en-IN')}</h4>
                <div className="text-muted" style={{fontSize:'11px'}}>{sales.length} sales entries</div>
              </div>
            </div>
          </Card>
        </Col>

        <Col lg={3} md={6}>
          <Card className="crm-card p-3">
            <div className="d-flex align-items-center gap-3">
              <div className="d-flex align-items-center justify-content-center bg-warning-subtle text-warning rounded-circle" style={{ width:'52px',height:'52px',fontSize:'22px' }}>
                <FaUsers />
              </div>
              <div>
                <div className="text-muted small fw-semibold text-uppercase">Active Staff Accounts</div>
                <h4 className="fw-bold mb-0">{staff.length} Members</h4>
                <div className="text-muted" style={{fontSize:'11px'}}>{meetings.length} meetings scheduled</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row className="g-4 mb-4">
        {/* Monthly Revenue vs Staff Sales Bar Chart */}
        <Col lg={7} md={12}>
          <Card className="crm-card p-4">
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <div>
                <h6 className="fw-bold mb-0">Sales &amp; Revenue Analytics (INR ₹)</h6>
                <div className="text-muted" style={{fontSize:'11px'}}>Real-time updates when staff adds sales or updates leads</div>
              </div>
              
              {/* Data Source Selector buttons */}
              <div className="d-flex gap-1 bg-subtle p-1 rounded-3">
                <button
                  onClick={() => setChartSource('combined')}
                  style={{
                    border: 'none', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', fontWeight: 700,
                    background: chartSource === 'combined' ? '#6366f1' : 'transparent',
                    color: chartSource === 'combined' ? '#fff' : '#64748b'
                  }}>
                  Combined
                </button>
                <button
                  onClick={() => setChartSource('sales')}
                  style={{
                    border: 'none', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', fontWeight: 700,
                    background: chartSource === 'sales' ? '#059669' : 'transparent',
                    color: chartSource === 'sales' ? '#fff' : '#64748b'
                  }}>
                  Staff Sales Entries
                </button>
                <button
                  onClick={() => setChartSource('leads')}
                  style={{
                    border: 'none', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', fontWeight: 700,
                    background: chartSource === 'leads' ? '#3b82f6' : 'transparent',
                    color: chartSource === 'leads' ? '#fff' : '#64748b'
                  }}>
                  Won Leads
                </button>
              </div>
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
              <div className="d-flex align-items-center gap-2">
                <span className="text-muted small">Win rate:</span>
                <span className="fw-bold" style={{ color: winRate >= 50 ? '#10b981' : '#ef4444' }}>{winRate}%</span>
              </div>
            </div>
            <div className="d-flex align-items-center justify-content-center" style={{ height: '180px' }}>
              {leads.length === 0 ? (
                <div className="text-muted small text-center">No leads yet. Create leads to see pipeline.</div>
              ) : (
                <Doughnut
                  data={pipelineData}
                  options={{
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: ctx => ` ${ctx.label}: ${ctx.raw} deal${ctx.raw !== 1 ? 's' : ''}`
                        }
                      }
                    }
                  }}
                />
              )}
            </div>
            {/* Detailed legend with values */}
            <div className="mt-3">
              <div className="d-flex justify-content-between align-items-center mb-2 p-2 rounded-2" style={{ background: '#f0fdf4' }}>
                <span style={{ color: '#10b981', fontWeight: 700, fontSize: '13px' }}>🏆 Won Deals</span>
                <div className="text-end">
                  <span className="fw-bold me-2" style={{ color: '#10b981' }}>{wonLeads.length}</span>
                  <span className="text-muted small">₹{wonLeadsValue.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2 p-2 rounded-2" style={{ background: '#eef2ff' }}>
                <span style={{ color: '#6366f1', fontWeight: 700, fontSize: '13px' }}>📋 Active Leads</span>
                <span className="fw-bold" style={{ color: '#6366f1' }}>{activeLeads.length}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center p-2 rounded-2" style={{ background: '#fef2f2' }}>
                <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '13px' }}>❌ Lost Deals</span>
                <span className="fw-bold" style={{ color: '#ef4444' }}>{lostSales}</span>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Staff Performance & Recent Activity */}
      <Row className="g-4">
        {/* Staff Combined Won Value Leaderboard */}
        <Col lg={6}>
          <Card className="crm-card p-4">
            <h6 className="fw-bold mb-1">Staff Performance Leaderboard (₹)</h6>
            <div className="text-muted small mb-3">Combines staff recorded sales + won leads revenue</div>
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
                            {s.dealsCount} deals total · ₹{s.wonSalesVal.toLocaleString('en-IN')} sales + ₹{s.wonLeadsVal.toLocaleString('en-IN')} leads
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
            <h6 className="fw-bold mb-3">Recent Closed Sales &amp; Won Deals</h6>
            <div className="d-flex flex-column gap-3">
              {wonLeads.length === 0 && sales.length === 0 ? (
                <div className="text-muted small py-3 text-center">No won deals or sales recorded yet.</div>
              ) : (
                [...wonLeads, ...sales].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6).map((item, idx) => (
                  <div key={item._id || idx} className="d-flex justify-content-between align-items-center border-bottom pb-2">
                    <div>
                      <div className="fw-bold text-dark small">{item.title || item.name || 'Sales Record'}</div>
                      <div className="text-muted" style={{fontSize:'11px'}}>
                        {item.createdBy?.name ? `Staff: ${item.createdBy.name}` : item.assignedTo?.name ? `Assigned: ${item.assignedTo.name}` : 'Recorded Deal'}
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="fw-bold text-success">₹{(item.amountINR || item.amount || 0).toLocaleString('en-IN')}</div>
                      <Badge bg={['won','Won'].includes(item.status) ? 'success' : 'warning'} style={{fontSize:'10px'}}>
                        <FaCheckCircle className="me-1" />{item.status || 'won'}
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
