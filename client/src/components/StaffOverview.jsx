import React, { useState, useEffect, useContext } from 'react';
import { Row, Col, Card, Badge, ProgressBar, Button } from 'react-bootstrap';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { io } from 'socket.io-client';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ArcElement } from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { FaCalendarAlt, FaCheckCircle, FaArrowUp, FaAngleRight, FaSearch } from 'react-icons/fa';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ArcElement);

const StaffOverview = () => {
  const { user } = useContext(AuthContext);
  const [sales, setSales] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [salesRes, meetRes, leadRes] = await Promise.all([
          api.get('/sales/my').catch(() => ({ data: [] })),
          api.get('/meetings/my').catch(() => ({ data: [] })),
          api.get('/leads/my').catch(() => ({ data: [] }))
        ]);
        setSales(salesRes.data || []);
        setMeetings(meetRes.data || []);
        setLeads(leadRes.data || []);
      } catch (err) {
        console.error('Error fetching staff dashboard data:', err);
      }
    };
    loadData();

    // Real-time: reload when a lead is won
    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');
    socket.on('leadWon', loadData);
    socket.on('leadAssigned', loadData);
    return () => socket.disconnect();
  }, []);

  // Compute from leads (source of truth)
  const wonLeads = leads.filter(l => l.status === 'Won' || l.status === 'won');
  const lostLeads = leads.filter(l => l.status === 'Lost' || l.status === 'lost');
  const activeLeads = leads.filter(l => !['Won','won','Lost','lost'].includes(l.status));
  const wonValue = wonLeads.reduce((a, b) => a + (b.amountINR || 0), 0);
  const totalRevenue = leads.reduce((a, b) => a + (b.amountINR || 0), 0);
  const wonSales = wonLeads.length;
  const pendingSales = activeLeads.length;
  const lostSales = lostLeads.length;

  // Monthly won data for chart
  const MONTHS_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now = new Date();
  const last7Labels = Array.from({ length: 7 }, (_, i) => {
    const idx = (now.getDay() - 6 + i + 7) % 7;
    return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][idx];
  });

  // Chart Data: Pipeline Bar Chart (real data — monthly won)
  const last6Monthly = Array.from({ length: 6 }, (_, i) => {
    const idx = (now.getMonth() - 5 + i + 12) % 12;
    const year = now.getFullYear() - (idx > now.getMonth() ? 1 : 0);
    const monthWon = wonLeads.filter(l => {
      const d = new Date(l.createdAt);
      return !isNaN(d) && d.getMonth() === idx && d.getFullYear() === year;
    });
    return {
      label: MONTHS_LABELS[idx],
      won: monthWon.reduce((a, b) => a + (b.amountINR || 0), 0)
    };
  });

  const revenueChartData = {
    labels: last6Monthly.map(m => m.label),
    datasets: [
      {
        label: 'Won Value (INR ₹)',
        data: last6Monthly.map(m => m.won),
        backgroundColor: '#5c50e6',
        borderRadius: 8,
      }
    ]
  };

  const revenueChartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` ₹${context.raw.toLocaleString('en-IN')}`
        }
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: '#f1f5f9' }, ticks: { precision: 0 } }
    }
  };

  // Chart Data: Wave Line Chart
  const waveData = {
    labels: ['W1', 'W2', 'W3', 'W4'],
    datasets: [
      {
        data: [25000, 31000, 28000, 34862],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 3
      }
    ]
  };

  return (
    <div>
      {/* Top Welcome Banner */}
      <div className="mb-4">
        <h3 className="fw-bold mb-1">Welcome back, {user?.name || 'Staff Member'} 👋</h3>
        <p className="text-muted small mb-0">Here is your personal performance dashboard & scheduled tasks overview.</p>
      </div>

      {/* Grid Layout matching reference image */}
      <Row className="g-4 mb-4">
        {/* Today Task / Today Meetings */}
        <Col lg={4} md={6}>
          <Card className="crm-card p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0">Today Task</h6>
              <span className="text-muted small">
                {meetings.filter(m => m.status === 'completed').length} task completed out of {meetings.length || 4}
              </span>
            </div>
            <ProgressBar now={meetings.length ? (meetings.filter(m => m.status === 'completed').length / meetings.length) * 100 : 40} variant="success" style={{ height: '6px' }} className="mb-4" />

            <div className="d-flex flex-column gap-3">
              {meetings.length === 0 ? (
                <>
                  <div className="d-flex justify-content-between align-items-start border-bottom pb-2">
                    <div>
                      <div className="fw-bold text-dark small">Edit the landing page</div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>Submitted by Manager • 12 hours ago</div>
                    </div>
                    <span className="text-danger fw-semibold small" style={{ cursor: 'pointer' }}>Detail &gt;</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-start border-bottom pb-2">
                    <div>
                      <div className="fw-bold text-dark small">Client Demo Call</div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>Submitted by CEO • 11 hours ago</div>
                    </div>
                    <span className="text-danger fw-semibold small" style={{ cursor: 'pointer' }}>Detail &gt;</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <div className="fw-bold text-dark small">Review Sales Pipeline</div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>Submitted by Manager • 10 hours ago</div>
                    </div>
                    <span className="text-danger fw-semibold small" style={{ cursor: 'pointer' }}>Detail &gt;</span>
                  </div>
                </>
              ) : (
                meetings.slice(0, 3).map((m) => (
                  <div key={m._id} className="d-flex justify-content-between align-items-start border-bottom pb-2">
                    <div>
                      <div className="fw-bold text-dark small">{m.title}</div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>{m.date} at {m.time}</div>
                    </div>
                    <span className="text-danger fw-semibold small" style={{ cursor: 'pointer' }}>Detail &gt;</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </Col>

        {/* Mini Calendar Widget */}
        <Col lg={4} md={6}>
          <Card className="crm-card p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0">December 2026</h6>
              <div className="d-flex gap-1">
                <Button size="sm" variant="light" className="py-0 px-2">&lt;</Button>
                <Button size="sm" variant="light" className="py-0 px-2">&gt;</Button>
              </div>
            </div>
            
            {/* Calendar Grid */}
            <div className="text-center small">
              <div className="d-grid text-muted fw-semibold mb-2" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
              </div>
              <div className="d-grid gap-1" style={{ gridTemplateColumns: 'repeat(7, 1fr)', fontSize: '12px' }}>
                <span className="text-muted opacity-50">29</span>
                <span className="text-muted opacity-50">30</span>
                <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                <span>6</span><span>7</span><span>8</span><span>9</span><span>10</span>
                <span>11</span><span>12</span><span>13</span><span>14</span>
                <span className="bg-primary text-white rounded-circle d-inline-block py-1 fw-bold">15</span>
                <span>16</span><span>17</span><span>18</span><span>19</span><span>20</span>
                <span>21</span><span>22</span><span>23</span><span>24</span><span>25</span>
                <span>26</span><span>27</span><span>28</span><span>29</span><span>30</span><span>31</span>
              </div>
            </div>
          </Card>
        </Col>

        {/* Top Customer / Top Staff Card */}
        <Col lg={4} md={12}>
          <Card className="crm-card p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0">Top Customer</h6>
              <Button size="sm" variant="outline-primary" style={{ borderRadius: '10px', fontSize: '11px' }}>Weekly ▾</Button>
            </div>

            <div className="d-flex flex-column gap-3">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3">
                  <div className="crm-avatar-fallback bg-danger text-white">A</div>
                  <div>
                    <div className="fw-bold small mb-0">Ava Corlette</div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>43352</div>
                  </div>
                </div>
                <span className="badge-pill-star">Star Member</span>
              </div>

              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3">
                  <div className="crm-avatar-fallback bg-primary text-white">E</div>
                  <div>
                    <div className="fw-bold small mb-0">Everly Isla</div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>43352</div>
                  </div>
                </div>
                <span className="badge-pill-star">Star Member</span>
              </div>

              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3">
                  <div className="crm-avatar-fallback bg-info text-white">M</div>
                  <div>
                    <div className="fw-bold small mb-0">Mila Scarlett</div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>43352</div>
                  </div>
                </div>
                <span className="badge-pill-gold">Gold Member</span>
              </div>

              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3">
                  <div className="crm-avatar-fallback bg-success text-white">N</div>
                  <div>
                    <div className="fw-bold small mb-0">Nora Hazel</div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>43352</div>
                  </div>
                </div>
                <span className="badge-pill-silver">Silver Member</span>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row className="g-4 mb-4">
        <Col lg={4} md={6}>
          <Card className="crm-card p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0">Won Value (INR ₹)</h6>
            </div>
            <div className="text-muted small mb-2">Monthly won deals revenue</div>
            <div style={{ height: '180px' }}>
              <Bar data={revenueChartData} options={revenueChartOptions} />
            </div>
          </Card>
        </Col>

        {/* Sales Pipeline Doughnut Chart */}
        <Col lg={4} md={6}>
          <Card className="crm-card p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0">My Sales Pipeline</h6>
            </div>
            <div className="d-flex align-items-center justify-content-center" style={{ height: '150px' }}>
              <Doughnut
                data={{
                  labels: ['Won', 'Active', 'Lost'],
                  datasets: [{
                    data: [wonSales || 0, pendingSales || 0, lostSales || 0],
                    backgroundColor: ['#10b981','#f59e0b','#ef4444'],
                    borderWidth: 0
                  }]
                }}
                options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }}
              />
            </div>
            <div className="d-flex justify-content-center gap-3 mt-3 small">
              <span className="text-danger fw-semibold">• Store Sale</span>
              <span className="text-success fw-semibold">• Ad Sale</span>
              <span className="text-primary fw-semibold">• Search Sale</span>
            </div>
          </Card>
        </Col>

        {/* Customer Visit Online / Satisfaction & Industry */}
        <Col lg={4} md={12}>
          <div className="d-flex flex-column gap-4">
            <Card className="crm-card p-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="fw-bold mb-0">Satisfaction Rate</h6>
              </div>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <h4 className="fw-bold mb-0">63,745 vote</h4>
                  <span className="text-muted small">Vote by Consumer</span>
                </div>
                <div className="text-end">
                  <h3 className="fw-extrabold text-primary mb-0">78%</h3>
                  <Badge bg="info" className="small">2.5% ↗</Badge>
                </div>
              </div>
            </Card>

            <Card className="crm-card p-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="fw-bold mb-0">Customer visit Online</h6>
                <Button size="sm" variant="light" style={{ fontSize: '11px' }}>View As</Button>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted small">Total in july</div>
                  <h4 className="fw-bold mb-0">34,862 <span className="text-primary small" style={{ fontSize: '12px' }}>2.5% ↗</span></h4>
                </div>
                <div style={{ width: '120px', height: '50px' }}>
                  <Line data={waveData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }} />
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
