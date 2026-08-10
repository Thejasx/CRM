import React, { useState, useContext, useEffect, useCallback } from 'react';
import { Form, Button, Card, Table, Badge, Row, Col, InputGroup, Nav } from 'react-bootstrap';
import api from '../services/api';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { FaRupeeSign, FaPlusCircle, FaHistory, FaUserTag, FaTrophy, FaChartLine } from 'react-icons/fa';

const STATUS_COLOR = {
  won:       'success',
  Won:       'success',
  pending:   'warning',
  Pending:   'warning',
  new:       'primary',
  New:       'primary',
  lost:      'danger',
  Lost:      'danger',
  contacted: 'info',
  Contacted: 'info',
  qualified: 'secondary',
  Qualified: 'secondary',
};

const SalesForm = () => {
  const [name, setName]         = useState('');
  const [details, setDetails]   = useState('');
  const [amountINR, setAmountINR] = useState('');
  const [status, setStatus]     = useState('pending');
  const [mySales, setMySales]   = useState([]);
  const [myLeads, setMyLeads]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [activeTab, setActiveTab] = useState('sales'); // 'sales' | 'leads'
  const { user } = useContext(AuthContext);

  /* ── Fetch both sales + assigned leads ────────────────── */
  const fetchAll = useCallback(async () => {
    try {
      const isStaff    = user?.role === 'staff';
      const salesEndpt = isStaff ? '/sales/my' : '/sales';
      const [salesRes, leadsRes] = await Promise.all([
        api.get(salesEndpt).catch(() => ({ data: [] })),
        api.get('/leads/my').catch(() => ({ data: [] })),
      ]);
      setMySales(salesRes.data || []);
      setMyLeads(leadsRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchAll();
    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');
    socket.on('saleAdded',    fetchAll);
    socket.on('leadAssigned', fetchAll);
    socket.on('leadWon',      fetchAll);
    return () => socket.disconnect();
  }, [fetchAll]);

  /* ── Derived totals ───────────────────────────────────── */
  const wonSalesOnly = mySales.filter(s => ['won','Won'].includes(s.status));
  const wonAmountINR = wonSalesOnly.reduce((a, b) => a + (b.amountINR || b.amount || 0), 0);
  const totalDeals   = mySales.length;
  
  const wonLeadsOnly = myLeads.filter(l => ['won','Won'].includes(l.status));
  const wonLeadsValue = wonLeadsOnly.reduce((a, b) => a + (b.amountINR || 0), 0);

  /* ── Submit sale ──────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const numericAmount = parseFloat(amountINR);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('Please enter a valid amount in INR');
      return;
    }
    setLoading(true);
    try {
      await api.post('/sales', {
        name: name.trim() || 'Sales Deal Entry',
        details: details.trim() || '',
        amountINR: numericAmount,
        amount:    numericAmount,
        status:    status.toLowerCase()
      });
      toast.success('🎉 Sale entry added & broadcasted to live dashboard!');
      setName(''); setDetails(''); setAmountINR(''); setStatus('pending');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record sale');
    } finally {
      setLoading(false);
    }
  };

  /* ── Update lead status inline ────────────────────────── */
  const handleLeadStatusChange = async (leadId, newStatus) => {
    try {
      await api.put(`/leads/${leadId}`, { status: newStatus });
      toast.success(`Lead status updated to ${newStatus}`);
      fetchAll();
    } catch (err) {
      toast.error('Failed to update lead status');
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h3 className="fw-bold mb-1">Add &amp; Manage Sales &amp; Assigned Leads (INR ₹)</h3>
        <p className="text-muted small mb-0">
          All-in-one workspace: Record new sales deals, track sales activity, and update status on your assigned leads in real-time.
        </p>
      </div>

      {/* ── Stat Cards ────────────────────────────────── */}
      <Row className="g-3 mb-4">
        {/* Won Sales only */}
        <Col md={4}>
          <div className="crm-card p-3 d-flex align-items-center gap-3"
            style={{ borderLeft: '4px solid #10b981' }}>
            <div className="d-flex align-items-center justify-content-center bg-success-subtle text-success rounded-circle"
              style={{ width: '48px', height: '48px', fontSize: '20px' }}>
              <FaTrophy />
            </div>
            <div>
              <div className="text-muted small fw-semibold text-uppercase">Won Sales Value (INR ₹)</div>
              <h3 className="fw-bold mb-0 text-success">
                ₹{wonAmountINR.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
              </h3>
              <div className="text-muted" style={{ fontSize: '11px' }}>
                {wonSalesOnly.length} won sales deal{wonSalesOnly.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </Col>

        {/* Total Deals Recorded */}
        <Col md={4}>
          <div className="crm-card p-3 d-flex align-items-center gap-3"
            style={{ borderLeft: '4px solid #6366f1' }}>
            <div className="d-flex align-items-center justify-content-center bg-primary-subtle text-primary rounded-circle"
              style={{ width: '48px', height: '48px', fontSize: '20px' }}>
              <FaChartLine />
            </div>
            <div>
              <div className="text-muted small fw-semibold text-uppercase">Total Deals Recorded</div>
              <h3 className="fw-bold mb-0">{totalDeals} Entries</h3>
              <div className="text-muted" style={{ fontSize: '11px' }}>Recorded sales deals</div>
            </div>
          </div>
        </Col>

        {/* Assigned Leads */}
        <Col md={4}>
          <div className="crm-card p-3 d-flex align-items-center gap-3"
            style={{ borderLeft: '4px solid #f59e0b' }}>
            <div className="d-flex align-items-center justify-content-center bg-warning-subtle text-warning rounded-circle"
              style={{ width: '48px', height: '48px', fontSize: '20px' }}>
              <FaUserTag />
            </div>
            <div>
              <div className="text-muted small fw-semibold text-uppercase">Assigned Leads &amp; Value</div>
              <h3 className="fw-bold mb-0">{myLeads.length} Leads</h3>
              <div className="text-muted" style={{ fontSize: '11px' }}>
                Won: ₹{wonLeadsValue.toLocaleString('en-IN')} ({wonLeadsOnly.length} won)
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* ── Main Content ──────────────────────────────── */}
      <Row className="g-4">
        {/* Left: Add New Sale Form */}
        <Col lg={5}>
          <Card className="crm-card p-4 border-0">
            <div className="d-flex align-items-center gap-2 mb-3 text-primary">
              <FaPlusCircle className="fs-5" />
              <h5 className="fw-bold mb-0 text-dark">Add New Sale Entry</h5>
            </div>

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Sale / Deal Name</Form.Label>
                <Form.Control
                  required value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Enterprise CRM License Deal"
                  style={{ borderRadius: '10px' }}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Deal Details / Description</Form.Label>
                <Form.Control
                  as="textarea" rows={2} value={details}
                  onChange={e => setDetails(e.target.value)}
                  placeholder="e.g. Annual subscription package for 50 seats"
                  style={{ borderRadius: '10px' }}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Sale Status</Form.Label>
                <Form.Select
                  required value={status}
                  onChange={e => setStatus(e.target.value)}
                  style={{ borderRadius: '10px' }}
                >
                  <option value="pending">Pending</option>
                  <option value="won">Won Deal ✅</option>
                  <option value="lost">Lost Deal ❌</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="small fw-semibold">Amount (INR ₹)</Form.Label>
                <InputGroup>
                  <InputGroup.Text className="bg-body border-end-0 fw-bold">₹</InputGroup.Text>
                  <Form.Control
                    type="number" min="1" step="1" required
                    value={amountINR}
                    onChange={e => setAmountINR(e.target.value)}
                    placeholder="e.g. 150000"
                    className="border-start-0"
                    style={{ borderRadius: '0 10px 10px 0' }}
                  />
                </InputGroup>
              </Form.Group>

              <Button type="submit" className="btn-violet w-100 py-3" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Sale Record (INR ₹) →'}
              </Button>
            </Form>
          </Card>
        </Col>

        {/* Right: Tabbed view — Recent Sales | Assigned Leads */}
        <Col lg={7}>
          <Card className="crm-card p-4 border-0">
            {/* Tab Nav */}
            <div className="d-flex justify-content-between align-items-center mb-3">
              <Nav variant="pills" className="gap-2"
                activeKey={activeTab} onSelect={k => setActiveTab(k)}>
                <Nav.Item>
                  <Nav.Link eventKey="sales"
                    style={{ borderRadius: '10px', fontSize: '13px', padding: '6px 16px' }}>
                    <FaHistory className="me-1" /> My Sales
                    <Badge bg="secondary" className="ms-2 rounded-pill">{mySales.length}</Badge>
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="leads"
                    style={{ borderRadius: '10px', fontSize: '13px', padding: '6px 16px' }}>
                    <FaUserTag className="me-1" /> Assigned Leads &amp; Pipeline
                    <Badge bg="warning" text="dark" className="ms-2 rounded-pill">{myLeads.length}</Badge>
                  </Nav.Link>
                </Nav.Item>
              </Nav>

              {activeTab === 'sales' && (
                <Badge bg="success" className="px-3 py-2 rounded-pill fs-6">
                  Won: ₹{wonAmountINR.toLocaleString('en-IN')}
                </Badge>
              )}
              {activeTab === 'leads' && (
                <Badge bg="success" className="px-3 py-2 rounded-pill fs-6">
                  Won: ₹{wonLeadsValue.toLocaleString('en-IN')}
                </Badge>
              )}
            </div>

            {/* ── Sales Tab ── */}
            {activeTab === 'sales' && (
              <Table responsive className="custom-table mb-0">
                <thead>
                  <tr>
                    <th>Deal Name</th>
                    <th>Amount (INR)</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {mySales.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-4 text-muted">
                        No sales recorded yet. Use the form on the left to add your first deal!
                      </td>
                    </tr>
                  ) : (
                    mySales.map((s, idx) => (
                      <tr key={s._id || idx}>
                        <td>
                          <div className="fw-bold text-dark">{s.name || 'Sales Deal'}</div>
                          <div className="text-muted small">{s.details || 'No details'}</div>
                        </td>
                        <td className={['won','Won'].includes(s.status) ? 'fw-bold text-success' : 'fw-bold'}>
                          ₹{(s.amountINR || s.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td>
                          <Badge
                            bg={STATUS_COLOR[s.status] || 'secondary'}
                            className="px-3 py-2 rounded-pill text-capitalize">
                            {s.status}
                          </Badge>
                        </td>
                        <td className="small text-muted">
                          {new Date(s.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            )}

            {/* ── Assigned Leads Tab (Interactive Management) ── */}
            {activeTab === 'leads' && (
              <Table responsive className="custom-table mb-0">
                <thead>
                  <tr>
                    <th>Lead / Client</th>
                    <th>Value (INR)</th>
                    <th>Update Stage Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {myLeads.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-4 text-muted">
                        No leads assigned yet. Ask your admin to assign leads to you!
                      </td>
                    </tr>
                  ) : (
                    myLeads.map(l => (
                      <tr key={l._id}>
                        <td>
                          <div className="fw-bold text-dark">{l.title}</div>
                          <div className="text-muted small">
                            {l.name} {l.phone ? `· ${l.phone}` : l.email ? `· ${l.email}` : ''}
                          </div>
                        </td>
                        <td className={['Won','won'].includes(l.status) ? 'fw-bold text-success' : 'fw-bold'}>
                          ₹{(l.amountINR || 0).toLocaleString('en-IN')}
                        </td>
                        <td>
                          <Form.Select
                            size="sm"
                            value={l.status}
                            onChange={(e) => handleLeadStatusChange(l._id, e.target.value)}
                            style={{ borderRadius: '8px', fontSize: '12px', width: '130px', fontWeight: 600 }}
                          >
                            <option value="New">New</option>
                            <option value="Contacted">Contacted</option>
                            <option value="Qualified">Qualified</option>
                            <option value="Won">Won ✅</option>
                            <option value="Lost">Lost ❌</option>
                          </Form.Select>
                        </td>
                        <td className="small text-muted">
                          {new Date(l.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SalesForm;
