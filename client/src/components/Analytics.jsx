import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Badge } from 'react-bootstrap';
import { Line, Bar } from 'react-chartjs-2';
import { io } from 'socket.io-client';
import api from '../services/api';
import { FaRupeeSign, FaChartLine, FaExchangeAlt, FaBolt } from 'react-icons/fa';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Analytics = () => {
  const [salesList, setSalesList] = useState([]);
  const [liveFeed, setLiveFeed] = useState([]);

  useEffect(() => {
    api.get('/sales')
      .then((res) => setSalesList(res.data || []))
      .catch((err) => console.error('Error fetching sales analytics:', err));

    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');

    socket.on('saleAdded', (payload) => {
      setSalesList((prev) => [...prev, payload]);
      setLiveFeed((prev) => [payload, ...prev.slice(0, 7)]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const totalRevenueINR = salesList.reduce((acc, curr) => acc + (Number(curr.amountINR || curr.amount) || 0), 0);
  const avgSaleINR = salesList.length ? totalRevenueINR / salesList.length : 0;

  const chartLabels = salesList.map((s, idx) =>
    s.createdAt
      ? new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : `Deal #${idx + 1}`
  );
  const chartAmountsINR = salesList.map((s) => Number(s.amountINR || s.amount) || 0);

  const lineChartData = {
    labels: chartLabels.length ? chartLabels : ['No Data'],
    datasets: [
      {
        label: 'Real-Time Revenue (INR ₹)',
        data: chartAmountsINR.length ? chartAmountsINR : [0],
        borderColor: '#5c50e6',
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(92, 80, 230, 0.35)');
          gradient.addColorStop(1, 'rgba(92, 80, 230, 0.0)');
          return gradient;
        },
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#5c50e6',
        pointRadius: 4,
        pointHoverRadius: 7,
      },
    ],
  };

  const barChartData = {
    labels: chartLabels.slice(-8),
    datasets: [
      {
        label: 'Recent Transaction Amounts (INR ₹)',
        data: chartAmountsINR.slice(-8),
        backgroundColor: '#10b981',
        borderRadius: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { family: 'Plus Jakarta Sans', size: 13, weight: 'bold' },
        bodyFont: { family: 'Plus Jakarta Sans', size: 12 },
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          label: (context) => ` Amount: ₹${context.raw.toLocaleString('en-IN')}`
        }
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: 'rgba(0, 0, 0, 0.05)' }, beginAtZero: true },
    },
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Live WebSocket Analytics (INR ₹)</h3>
          <p className="text-muted small mb-0">Real-time revenue metrics formatted in Indian Rupees (₹)</p>
        </div>
        <div className="d-flex align-items-center gap-2 bg-success-subtle text-success px-3 py-2 rounded-pill fw-semibold small">
          <span className="live-dot"></span> Socket IO Live Feed Active
        </div>
      </div>

      {/* Metric Cards */}
      <Row className="g-3 mb-4">
        <Col lg={4} md={6}>
          <Card className="crm-card p-3 d-flex align-items-center gap-3">
            <div className="d-flex align-items-center justify-content-center bg-success-subtle text-success rounded-circle" style={{ width: '52px', height: '52px', fontSize: '24px' }}>
              ₹
            </div>
            <div>
              <div className="text-muted small fw-semibold text-uppercase">Total Gross Revenue (INR)</div>
              <h3 className="fw-bold mb-0">₹{totalRevenueINR.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            </div>
          </Card>
        </Col>

        <Col lg={4} md={6}>
          <Card className="crm-card p-3 d-flex align-items-center gap-3">
            <div className="d-flex align-items-center justify-content-center bg-primary-subtle text-primary rounded-circle" style={{ width: '52px', height: '52px', fontSize: '22px' }}>
              <FaChartLine />
            </div>
            <div>
              <div className="text-muted small fw-semibold text-uppercase">Total Closed Transactions</div>
              <h3 className="fw-bold mb-0">{salesList.length} Deals Recorded</h3>
            </div>
          </Card>
        </Col>

        <Col lg={4} md={12}>
          <Card className="crm-card p-3 d-flex align-items-center gap-3">
            <div className="d-flex align-items-center justify-content-center bg-warning-subtle text-warning rounded-circle" style={{ width: '52px', height: '52px', fontSize: '22px' }}>
              <FaExchangeAlt />
            </div>
            <div>
              <div className="text-muted small fw-semibold text-uppercase">Average Deal Value (INR)</div>
              <h3 className="fw-bold mb-0">₹{avgSaleINR.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h3>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row className="g-4 mb-4">
        <Col lg={8}>
          <Card className="crm-card p-4 border-0">
            <h5 className="fw-bold mb-3">Live Revenue Trend (INR ₹)</h5>
            <div style={{ height: '320px' }}>
              <Line data={lineChartData} options={chartOptions} />
            </div>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="crm-card p-4 border-0">
            <h5 className="fw-bold mb-3">Recent Deal Volume (INR ₹)</h5>
            <div style={{ height: '320px' }}>
              <Bar data={barChartData} options={chartOptions} />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Live Feed */}
      <Card className="crm-card p-4 border-0">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold mb-0">Live Socket Transaction Feed</h5>
          <Badge bg="success" className="px-3 py-2 rounded-pill">Real-Time Broadcast</Badge>
        </div>
        {liveFeed.length === 0 ? (
          <p className="text-muted small mb-0">Waiting for live sales entries from staff workspace...</p>
        ) : (
          <div className="d-flex flex-column gap-2">
            {liveFeed.map((evt, idx) => (
              <div 
                key={idx} 
                className="d-flex justify-content-between align-items-center p-3 rounded-3 border"
              >
                <div className="d-flex align-items-center gap-3">
                  <div className="d-flex align-items-center justify-content-center bg-success-subtle text-success rounded-circle" style={{ width: '40px', height: '40px', fontSize: '18px' }}>
                    +
                  </div>
                  <div>
                    <div className="fw-bold">{evt.name || 'Sales Deal Entry'}</div>
                    <div className="text-muted small">{new Date(evt.createdAt || Date.now()).toLocaleTimeString()}</div>
                  </div>
                </div>
                <div className="fw-bold text-success fs-5">+₹{Number(evt.amountINR || evt.amount || 0).toLocaleString('en-IN')}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Analytics;
