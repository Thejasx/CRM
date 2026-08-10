import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Row, Col, Card, Badge, ProgressBar, Button } from 'react-bootstrap';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { io } from 'socket.io-client';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend,
  PointElement, LineElement, ArcElement
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { FaTrophy, FaSmile, FaEye, FaChartBar, FaShoppingBag, FaUserCheck } from 'react-icons/fa';

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend,
  PointElement, LineElement, ArcElement
);

// Color palette for avatar initials
const AVATAR_COLORS = ['#6366f1','#ec4899','#10b981','#f59e0b','#3b82f6','#8b5cf6','#ef4444'];

const BADGE_TIERS = [
  { label: '⭐ Star',   className: 'badge-pill-star',   threshold: 3 },
  { label: '🥇 Gold',   className: 'badge-pill-gold',   threshold: 2 },
  { label: '🥈 Silver', className: 'badge-pill-silver', threshold: 1 },
  { label: '🥉 Bronze', className: 'badge-pill-bronze', threshold: 0 },
];

const getTier = (deals) => BADGE_TIERS.find(t => deals > t.threshold) || BADGE_TIERS[3];

const MONTHS_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const StaffOverview = () => {
  const { user } = useContext(AuthContext);

  // Raw data
  const [leads, setLeads]       = useState([]);
  const [sales, setSales]       = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [stats, setStats]       = useState(null);

  // UI state for chart controls
  const [chartMode, setChartMode]       = useState('combined'); // 'combined' | 'sales' | 'leads'
  const [pipelineView, setPipelineView] = useState('Month');    // 'Day' | 'Week' | 'Month'
  const [calDate, setCalDate]           = useState(new Date());

  /* ── Data fetching ─────────────────────────────────────── */
  const loadData = useCallback(async () => {
    try {
      const [meetRes, leadRes, salesRes, statsRes] = await Promise.all([
        api.get('/meetings/my').catch(() => ({ data: [] })),
        api.get('/leads/my').catch(() => ({ data: [] })),
        api.get('/sales/my').catch(() => ({ data: [] })),
        api.get('/leads/stats').catch(() => ({ data: null })),
      ]);
      setMeetings(meetRes.data || []);
      setLeads(leadRes.data || []);
      setSales(salesRes.data || []);
      setStats(statsRes.data || null);
    } catch (err) {
      console.error('StaffOverview: error loading data', err);
    }
  }, []);

  useEffect(() => {
    loadData();
    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');
    socket.on('leadWon',      loadData);
    socket.on('leadAssigned', loadData);
    socket.on('saleAdded',    loadData);
    return () => socket.disconnect();
  }, [loadData]);

  /* ── Derived lead & sales counts ───────────────────────────────── */
  const wonLeads    = leads.filter(l => ['Won','won'].includes(l.status));
  const lostLeads   = leads.filter(l => ['Lost','lost'].includes(l.status));
  const activeLeads = leads.filter(l => !['Won','won','Lost','lost'].includes(l.status));

  const wonSalesEntries  = sales.filter(s => ['won','Won'].includes(s.status));
  const wonSalesValue    = wonSalesEntries.reduce((a, b) => a + (b.amountINR || b.amount || 0), 0);
  const wonLeadsValue    = wonLeads.reduce((a, b) => a + (b.amountINR || 0), 0);

  // Combined total won revenue (Leads + Recorded Sales)
  const totalCombinedWonValue = wonLeadsValue + wonSalesValue;
  const totalWonDealsCount    = wonLeads.length + wonSalesEntries.length;

  const wonSales     = wonLeads.length;
  const pendingSales = activeLeads.length;
  const lostSales    = lostLeads.length;

  /* ── Aggregated Chart Data based on chartMode & pipelineView ── */
  const now = new Date();

  // Monthly 6-month breakdown for Sales entries
  const last6MonthsSales = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const mSales = sales.filter(s => {
      const sd = new Date(s.createdAt);
      return sd.getFullYear() === d.getFullYear() && sd.getMonth() === d.getMonth() && ['won','Won'].includes(s.status);
    });
    return {
      label: d.toLocaleString('default', { month: 'short' }),
      value: mSales.reduce((a, b) => a + (b.amountINR || b.amount || 0), 0)
    };
  });

  const chartDataComputed = (() => {
    if (chartMode === 'sales') {
      return {
        labels: last6MonthsSales.map(m => m.label),
        values: last6MonthsSales.map(m => m.value),
        title: 'Recorded Sales Entries Revenue (₹)'
      };
    }

    if (chartMode === 'leads') {
      const src = pipelineView === 'Day' ? stats?.daily : pipelineView === 'Week' ? stats?.weekly : stats?.monthly;
      return {
        labels: (src || []).map(d => d.label),
        values: (src || []).map(d => d.won),
        title: 'Assigned Leads Won Pipeline (₹)'
      };
    }

    // Combined Mode (Sales Entries + Won Leads)
    const src = stats?.monthly || last6MonthsSales;
    return {
      labels: src.map((d, idx) => d.label),
      values: src.map((d, idx) => (d.won || 0) + (last6MonthsSales[idx]?.value || 0)),
      title: 'Combined Total Won Revenue (Sales + Leads ₹)'
    };
  })();

  const barChartData = {
    labels: chartDataComputed.labels,
    datasets: [{
      label: chartDataComputed.title,
      data:  chartDataComputed.values,
      backgroundColor: (ctx) => {
        const chart = ctx.chart;
        const { ctx: c, chartArea } = chart;
        if (!chartArea) return '#6366f1';
        const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        if (chartMode === 'sales') {
          gradient.addColorStop(0, '#34d399');
          gradient.addColorStop(1, '#059669');
        } else {
          gradient.addColorStop(0, '#818cf8');
          gradient.addColorStop(1, '#6366f1');
        }
        return gradient;
      },
      borderRadius: 10,
      borderSkipped: false,
    }]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => ` ₹${ctx.raw.toLocaleString('en-IN')}`
        }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: { color: '#94a3b8', precision: 0,
          callback: v => v >= 1e5 ? `₹${(v/1e5).toFixed(1)}L` : `₹${v.toLocaleString('en-IN')}`
        }
      }
    }
  };

  /* ── Customer Visit sparkline ─────────────────────────── */
  const visitSparkData = {
    labels: (stats?.customerVisits || []).map(v => v.label),
    datasets: [{
      data: (stats?.customerVisits || []).map(v => v.visits),
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.12)',
      tension: 0.5,
      fill: true,
      pointRadius: 2,
      borderWidth: 2,
    }]
  };

  const totalVisitsThisMonth = stats?.customerVisits?.slice(-1)[0]?.visits ?? 0;
  const prevVisits           = stats?.customerVisits?.slice(-2)[0]?.visits ?? 0;
  const visitTrend           = prevVisits > 0
    ? (((totalVisitsThisMonth - prevVisits) / prevVisits) * 100).toFixed(1)
    : '0.0';

  /* ── Satisfaction Rate ────────────────────────────────── */
  const satisfactionRate = stats?.satisfactionRate ?? 0;
  const totalDecided     = (stats?.totalWon ?? 0) + (stats?.totalLost ?? 0);

  /* ── Top Customers ────────────────────────────────────── */
  const topCustomers = stats?.topCustomers ?? [];

  /* ── Mini Calendar ────────────────────────────────────── */
  const calYear  = calDate.getFullYear();
  const calMonth = calDate.getMonth();

  const MONTH_NAMES = ['January','February','March','April','May','June',
                       'July','August','September','October','November','December'];
  const firstDay     = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth  = new Date(calYear, calMonth + 1, 0).getDate();
  const calCells     = [];
  for (let i = 0; i < firstDay; i++) calCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calCells.push(d);

  const meetingDates = new Set(
    meetings.map(m => {
      const d = new Date(m.date || m.scheduledAt);
      return isNaN(d) ? null : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    }).filter(Boolean)
  );

  /* ── Completed tasks % ────────────────────────────────── */
  const completedMeetings = meetings.filter(m => m.status === 'completed').length;
  const taskProgress      = meetings.length
    ? Math.round((completedMeetings / meetings.length) * 100)
    : 40;

  return (
    <div>
      {/* Top Welcome Banner */}
      <div className="mb-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h3 className="fw-bold mb-1">Welcome back, {user?.name || 'Staff Member'} 👋</h3>
          <p className="text-muted small mb-0">
            Real-time performance &amp; sales analytics — all figures calculated from <strong>won deals &amp; sales</strong>.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 px-4 py-2 rounded-pill fw-bold shadow-sm"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: '14px' }}>
          <FaTrophy /> ₹{totalCombinedWonValue.toLocaleString('en-IN')} Total Won Sales
        </div>
      </div>

      {/* ── Deal Status & Sales Summary Strip ── */}
      <Row className="g-3 mb-4">
        <Col xs={6} md={3}>
          <div className="crm-card p-3 d-flex align-items-center gap-3 h-100"
            style={{ borderLeft: '4px solid #10b981' }}>
            <div className="d-flex align-items-center justify-content-center rounded-circle"
              style={{ width: '44px', height: '44px', background: '#d1fae5', fontSize: '20px' }}>🏆</div>
            <div>
              <div className="text-muted" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Won Leads</div>
              <h3 className="fw-bold mb-0 text-success">{wonSales}</h3>
              <div style={{ fontSize: '11px', color: '#10b981' }}>₹{wonLeadsValue.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </Col>
        <Col xs={6} md={3}>
          <div className="crm-card p-3 d-flex align-items-center gap-3 h-100"
            style={{ borderLeft: '4px solid #6366f1' }}>
            <div className="d-flex align-items-center justify-content-center rounded-circle"
              style={{ width: '44px', height: '44px', background: '#ede9fe', fontSize: '20px' }}>📋</div>
            <div>
              <div className="text-muted" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Active / Pending</div>
              <h3 className="fw-bold mb-0" style={{ color: '#6366f1' }}>{pendingSales}</h3>
              <div style={{ fontSize: '11px', color: '#6366f1' }}>In pipeline</div>
            </div>
          </div>
        </Col>
        <Col xs={6} md={3}>
          <div className="crm-card p-3 d-flex align-items-center gap-3 h-100"
            style={{ borderLeft: '4px solid #059669' }}>
            <div className="d-flex align-items-center justify-content-center rounded-circle"
              style={{ width: '44px', height: '44px', background: '#d1fae5', fontSize: '20px' }}>🛍️</div>
            <div>
              <div className="text-muted" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Recorded Sales</div>
              <h3 className="fw-bold mb-0 text-success">{sales.length}</h3>
              <div style={{ fontSize: '11px', color: '#059669' }}>₹{wonSalesValue.toLocaleString('en-IN')} won</div>
            </div>
          </div>
        </Col>
        <Col xs={6} md={3}>
          <div className="crm-card p-3 d-flex align-items-center gap-3 h-100"
            style={{ borderLeft: '4px solid #ef4444' }}>
            <div className="d-flex align-items-center justify-content-center rounded-circle"
              style={{ width: '44px', height: '44px', background: '#fee2e2', fontSize: '20px' }}>❌</div>
            <div>
              <div className="text-muted" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Lost Deals</div>
              <h3 className="fw-bold mb-0 text-danger">{lostSales}</h3>
              <div style={{ fontSize: '11px', color: '#ef4444' }}>Closed lost</div>
            </div>
          </div>
        </Col>
      </Row>

      {/* ── Row 1: Today Task · Calendar · Top Customers ── */}
      <Row className="g-4 mb-4">

        {/* Today Tasks */}
        <Col lg={4} md={6}>
          <Card className="crm-card p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0">Today Tasks</h6>
              <span className="text-muted small">
                {completedMeetings}/{meetings.length || 0} done
              </span>
            </div>
            <ProgressBar
              now={taskProgress}
              variant="success"
              style={{ height: '6px', borderRadius: '10px' }}
              className="mb-4"
            />
            <div className="d-flex flex-column gap-3">
              {meetings.length === 0 ? (
                <>
                  {['Edit landing page', 'Client Demo Call', 'Review Sales Pipeline'].map((t, i) => (
                    <div key={i} className="d-flex justify-content-between align-items-start border-bottom pb-2">
                      <div>
                        <div className="fw-bold text-dark small">{t}</div>
                        <div className="text-muted" style={{ fontSize: '11px' }}>No meetings scheduled</div>
                      </div>
                      <span className="text-primary fw-semibold small" style={{ cursor: 'pointer' }}>Detail ›</span>
                    </div>
                  ))}
                </>
              ) : (
                meetings.slice(0, 3).map(m => (
                  <div key={m._id} className="d-flex justify-content-between align-items-start border-bottom pb-2">
                    <div>
                      <div className="fw-bold text-dark small">{m.title}</div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>
                        {m.date || (m.scheduledAt ? new Date(m.scheduledAt).toLocaleDateString() : '—')}
                        {m.time ? ` at ${m.time}` : ''}
                      </div>
                    </div>
                    <Badge bg={m.status === 'completed' ? 'success' : 'warning'} className="rounded-pill" style={{ fontSize: '10px' }}>
                      {m.status === 'completed' ? 'Done' : 'Pending'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Card>
        </Col>

        {/* Mini Calendar */}
        <Col lg={4} md={6}>
          <Card className="crm-card p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0">{MONTH_NAMES[calMonth]} {calYear}</h6>
              <div className="d-flex gap-1">
                <Button size="sm" variant="light" className="py-0 px-2"
                  onClick={() => setCalDate(new Date(calYear, calMonth - 1, 1))}>‹</Button>
                <Button size="sm" variant="light" className="py-0 px-2"
                  onClick={() => setCalDate(new Date(calYear, calMonth + 1, 1))}>›</Button>
              </div>
            </div>
            <div className="text-center small">
              <div className="d-grid text-muted fw-semibold mb-2"
                style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {['S','M','T','W','T','F','S'].map((d, i) => <span key={i}>{d}</span>)}
              </div>
              <div className="d-grid gap-1"
                style={{ gridTemplateColumns: 'repeat(7, 1fr)', fontSize: '12px' }}>
                {calCells.map((day, i) => {
                  if (!day) return <span key={`e${i}`} />;
                  const isToday = day === now.getDate() && calMonth === now.getMonth() && calYear === now.getFullYear();
                  const hasMtg  = meetingDates.has(`${calYear}-${calMonth}-${day}`);
                  return (
                    <span key={day}
                      className={isToday ? 'bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center fw-bold'
                                         : hasMtg ? 'text-primary fw-bold' : ''}
                      style={isToday ? { width: '24px', height: '24px', margin: 'auto' } : {}}>
                      {day}
                      {hasMtg && !isToday && <span style={{ position: 'absolute', bottom: '1px', left: '50%', transform: 'translateX(-50%)', width: '4px', height: '4px', borderRadius: '50%', background: '#6366f1' }} />}
                    </span>
                  );
                })}
              </div>
            </div>
          </Card>
        </Col>

        {/* Top Customers — real data from won leads */}
        <Col lg={4} md={12}>
          <Card className="crm-card p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
                <FaTrophy className="text-warning" /> Top Customers
              </h6>
              <Badge bg="success" className="rounded-pill px-3" style={{ fontSize: '10px' }}>
                Won Deals
              </Badge>
            </div>

            {topCustomers.length === 0 ? (
              <div className="d-flex flex-column align-items-center justify-content-center text-muted py-4" style={{ flex: 1 }}>
                <FaTrophy style={{ fontSize: '32px', opacity: 0.2 }} />
                <div className="small mt-2">No won deals yet</div>
                <div style={{ fontSize: '11px' }}>Win your first lead to see top customers</div>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {topCustomers.map((c, idx) => {
                  const tier = getTier(c.deals);
                  return (
                    <div key={idx} className="d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center gap-3">
                        <div
                          className="crm-avatar-fallback text-white fw-bold"
                          style={{ background: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="fw-bold small mb-0">{c.name}</div>
                          <div className="text-muted" style={{ fontSize: '11px' }}>
                            ₹{c.value.toLocaleString('en-IN')} · {c.deals} deal{c.deals !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <span className={tier.className}>{tier.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Row 2: Sales & Revenue Analytics Bar Chart · Doughnut · Satisfaction + Visits ── */}
      <Row className="g-4 mb-4">

        {/* Won Sales & Revenue Analytics Bar Chart with Source Selector */}
        <Col lg={5} md={12}>
          <Card className="crm-card p-4 h-100">
            <div className="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">
              <div>
                <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
                  <FaChartBar className="text-primary" /> {chartDataComputed.title}
                </h6>
                <div className="text-muted" style={{ fontSize: '11px' }}>
                  Live sales &amp; leads revenue analytics
                </div>
              </div>

              {/* Data Source & Pipeline View Selectors */}
              <div className="d-flex flex-wrap gap-2 align-items-center">
                {chartMode === 'leads' && (
                  <div className="d-flex gap-1 bg-subtle p-1 rounded-3 me-2">
                    {['Day', 'Week', 'Month'].map(v => (
                      <button
                        key={v}
                        onClick={() => setPipelineView(v)}
                        style={{
                          border: 'none', borderRadius: '6px', padding: '2px 8px', fontSize: '10px', fontWeight: 700,
                          background: pipelineView === v ? '#3b82f6' : 'transparent',
                          color: pipelineView === v ? '#fff' : '#64748b'
                        }}>
                        {v}
                      </button>
                    ))}
                  </div>
                )}
                <div className="d-flex gap-1 bg-subtle p-1 rounded-3">
                  <button
                    onClick={() => setChartMode('combined')}
                    style={{
                      border: 'none', borderRadius: '6px', padding: '2px 8px', fontSize: '10px', fontWeight: 700,
                      background: chartMode === 'combined' ? '#6366f1' : 'transparent',
                      color: chartMode === 'combined' ? '#fff' : '#64748b'
                    }}>
                    Combined
                  </button>
                  <button
                    onClick={() => setChartMode('sales')}
                    style={{
                      border: 'none', borderRadius: '6px', padding: '2px 8px', fontSize: '10px', fontWeight: 700,
                      background: chartMode === 'sales' ? '#059669' : 'transparent',
                      color: chartMode === 'sales' ? '#fff' : '#64748b'
                    }}>
                    Sales Entries
                  </button>
                  <button
                    onClick={() => setChartMode('leads')}
                    style={{
                      border: 'none', borderRadius: '6px', padding: '2px 8px', fontSize: '10px', fontWeight: 700,
                      background: chartMode === 'leads' ? '#3b82f6' : 'transparent',
                      color: chartMode === 'leads' ? '#fff' : '#64748b'
                    }}>
                    Leads
                  </button>
                </div>
              </div>
            </div>

            {/* Won value summary */}
            <div className="d-flex align-items-baseline gap-2 mb-3">
              <h4 className="fw-bold mb-0">
                ₹{(chartMode === 'sales' ? wonSalesValue : chartMode === 'leads' ? wonLeadsValue : totalCombinedWonValue).toLocaleString('en-IN')}
              </h4>
              <span className="text-success small fw-semibold">
                {chartMode === 'sales' ? `${wonSalesEntries.length} sales entries` : chartMode === 'leads' ? `${wonSales} won leads` : `${totalWonDealsCount} total won deals`}
              </span>
            </div>

            <div style={{ height: '180px' }}>
              {chartDataComputed.labels.length > 0 ? (
                <Bar data={barChartData} options={barChartOptions} />
              ) : (
                <div className="d-flex align-items-center justify-content-center h-100 text-muted small">
                  No data available for this view
                </div>
              )}
            </div>
          </Card>
        </Col>

        {/* My Sales Pipeline Doughnut */}
        <Col lg={3} md={6}>
          <Card className="crm-card p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="fw-bold mb-0">My Sales Pipeline</h6>
            </div>
            <div className="d-flex align-items-center justify-content-center"
              style={{ height: '150px' }}>
              {leads.length === 0 ? (
                <div className="d-flex align-items-center justify-content-center h-100 text-muted small">No leads yet</div>
              ) : (
                <Doughnut
                  data={{
                    labels: ['Won Leads', 'Active Leads', 'Lost Leads'],
                    datasets: [{
                      data: [
                        wonSales  > 0 ? wonSales  : 0,
                        pendingSales > 0 ? pendingSales : 0,
                        lostSales > 0 ? lostSales : 0,
                      ],
                      backgroundColor: ['#10b981','#6366f1','#ef4444'],
                      borderWidth: 2,
                      borderColor: '#fff',
                      hoverOffset: 8,
                    }]
                  }}
                  options={{
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: ctx => ` ${ctx.label}: ${ctx.raw} deal${ctx.raw !== 1 ? 's' : ''}`
                        }
                      }
                    },
                    cutout: '65%',
                  }}
                />
              )}
            </div>
            {/* Legend with real counts */}
            <div className="mt-3">
              <div className="d-flex justify-content-between align-items-center mb-1 px-1">
                <span style={{ color: '#10b981', fontWeight: 700, fontSize: '12px' }}>🏆 Won Leads</span>
                <span className="fw-bold" style={{ color: '#10b981' }}>{wonSales} deal{wonSales !== 1 ? 's' : ''}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-1 px-1">
                <span style={{ color: '#6366f1', fontWeight: 700, fontSize: '12px' }}>📋 Active Leads</span>
                <span className="fw-bold" style={{ color: '#6366f1' }}>{pendingSales} deal{pendingSales !== 1 ? 's' : ''}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center px-1">
                <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '12px' }}>❌ Lost Leads</span>
                <span className="fw-bold" style={{ color: '#ef4444' }}>{lostSales} deal{lostSales !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </Card>
        </Col>

        {/* Satisfaction Rate + Customer Visit Online */}
        <Col lg={4} md={6}>
          <div className="d-flex flex-column gap-4 h-100">

            {/* Satisfaction Rate — computed from real won/lost data */}
            <Card className="crm-card p-4 flex-grow-1">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
                  <FaSmile className="text-success" /> Satisfaction Rate
                </h6>
              </div>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <h4 className="fw-bold mb-0">{totalDecided.toLocaleString()} votes</h4>
                  <span className="text-muted small">Based on won vs lost deals</span>
                </div>
                <div className="text-end">
                  <h3 className="fw-bold mb-0" style={{ color: satisfactionRate >= 50 ? '#10b981' : '#ef4444' }}>
                    {satisfactionRate}%
                  </h3>
                  <Badge
                    style={{ background: satisfactionRate >= 50 ? '#d1fae5' : '#fee2e2',
                             color: satisfactionRate >= 50 ? '#059669' : '#dc2626' }}
                    className="small">
                    {satisfactionRate >= 50 ? '↗ Positive' : '↘ Needs Work'}
                  </Badge>
                </div>
              </div>
              {/* Progress bar */}
              <ProgressBar
                now={satisfactionRate}
                className="mt-3"
                style={{ height: '6px', borderRadius: '10px' }}
                variant={satisfactionRate >= 70 ? 'success' : satisfactionRate >= 40 ? 'warning' : 'danger'}
              />
            </Card>

            {/* Customer Visit Online — real sparkline */}
            <Card className="crm-card p-4 flex-grow-1">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
                  <FaEye className="text-primary" /> Customer Visits Online
                </h6>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted small">Unique clients this month</div>
                  <h4 className="fw-bold mb-0">
                    {totalVisitsThisMonth}
                    <span className="ms-2" style={{ fontSize: '13px', color: Number(visitTrend) >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                      {Number(visitTrend) >= 0 ? '↗' : '↘'} {Math.abs(visitTrend)}%
                    </span>
                  </h4>
                </div>
                <div style={{ width: '110px', height: '50px' }}>
                  <Line
                    data={visitSparkData}
                    options={{
                      responsive: true,
                      plugins: { legend: { display: false } },
                      scales: { x: { display: false }, y: { display: false } },
                      elements: { point: { radius: 2 } }
                    }}
                  />
                </div>
              </div>
            </Card>

          </div>
        </Col>
      </Row>
    </div>
  );
};

export default StaffOverview;
