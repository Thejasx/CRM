import React, { useEffect, useState } from 'react';
import { Table, Button, Form, Modal, Card, Badge, Row, Col, Offcanvas } from 'react-bootstrap';
import api from '../services/api';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import { FaUserPlus, FaTrash, FaRupeeSign, FaCalendarCheck, FaChartLine, FaEye } from 'react-icons/fa';

const StaffList = () => {
  const [staff, setStaff] = useState([]);
  const [sales, setSales] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [leads, setLeads] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', temporaryPassword: '' });

  // Activity Drawer state
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);

  const fetchStaffData = async () => {
    try {
      const [sRes, salesRes, meetRes, leadsRes] = await Promise.all([
        api.get('/admin/staff'),
        api.get('/sales').catch(() => ({ data: [] })),
        api.get('/meetings').catch(() => ({ data: [] })),
        api.get('/leads').catch(() => ({ data: [] }))
      ]);
      setStaff(sRes.data || []);
      setSales(salesRes.data || []);
      setMeetings(meetRes.data || []);
      setLeads(leadsRes.data || []);
    } catch (err) {
      console.error('Error fetching staff list:', err);
      toast.error('Failed to load staff management data');
    }
  };

  useEffect(() => {
    fetchStaffData();

    // Listen to real-time socket events
    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');
    socket.on('staffAdded',   () => fetchStaffData());
    socket.on('staffDeleted', () => fetchStaffData());
    socket.on('saleAdded',    () => fetchStaffData());
    socket.on('meetingAssigned', () => fetchStaffData());
    socket.on('leadAssigned', () => fetchStaffData());
    socket.on('leadWon',      () => fetchStaffData());
    return () => socket.disconnect();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newStaff.name || !newStaff.email || !newStaff.temporaryPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    try {
      const res = await api.post('/admin/staff', newStaff);
      toast.success('🎉 Staff account created successfully!');
      setShowModal(false);
      setNewStaff({ name: '', email: '', temporaryPassword: '' });
      fetchStaffData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating staff member');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this staff member?')) return;
    try {
      await api.delete(`/admin/staff/${id}`);
      toast.success('Staff member deleted');
      fetchStaffData();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const openStaffActivity = (staffMember) => {
    setSelectedStaff(staffMember);
    setShowDrawer(true);
  };

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const getStaffStats = (staffId) => {
    // Sales model data
    const staffSales = sales.filter(s => s.createdBy?._id === staffId || s.createdBy === staffId);
    const totalAmountINR = staffSales.reduce((acc, curr) => acc + (curr.amountINR || curr.amount || 0), 0);
    const wonSalesModel = staffSales.filter(s => ['won','Won'].includes(s.status));
    const wonSalesAmount = wonSalesModel.reduce((acc, curr) => acc + (curr.amountINR || curr.amount || 0), 0);
    const staffMeetings = meetings.filter(m => m.assignedTo?._id === staffId || m.assignedTo === staffId);

    // Leads model data — source of truth for Won/Lost pipeline
    const staffLeads = leads.filter(l =>
      l.assignedTo?._id === staffId || l.assignedTo === staffId ||
      l.createdBy?._id === staffId  || l.createdBy  === staffId
    );
    const wonLeads    = staffLeads.filter(l => ['Won','won'].includes(l.status));
    const lostLeads   = staffLeads.filter(l => ['Lost','lost'].includes(l.status));
    const activeLeads = staffLeads.filter(l => !['Won','won','Lost','lost'].includes(l.status));
    const wonLeadValue = wonLeads.reduce((a, b) => a + (b.amountINR || 0), 0);
    const totalLeadValue = staffLeads.reduce((a, b) => a + (b.amountINR || 0), 0);
    const totalDecided = wonLeads.length + lostLeads.length;
    const winRate = totalDecided > 0 ? Math.round((wonLeads.length / totalDecided) * 100) : 0;

    // Monthly won breakdown for last 6 months (from leads)
    const now = new Date();
    const monthlyWon = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const monthWon = wonLeads.filter(l => {
        const ld = new Date(l.createdAt);
        return ld.getFullYear() === d.getFullYear() && ld.getMonth() === d.getMonth();
      });
      return {
        label: d.toLocaleString('default', { month: 'short' }),
        won: monthWon.reduce((a, b) => a + (b.amountINR || 0), 0),
        count: monthWon.length
      };
    });

    return {
      salesCount: staffSales.length,
      totalAmountINR,
      wonSalesAmount,
      staffMeetings,
      staffSales,
      monthlyWon,
      // Lead-based stats
      staffLeads,
      wonLeads,
      lostLeads,
      activeLeads,
      wonLeadValue,
      totalLeadValue,
      winRate,
      wonCount: wonLeads.length,
      lostCount: lostLeads.length,
      activeCount: activeLeads.length,
    };
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Staff Management & Activity Monitor</h3>
          <p className="text-muted small mb-0">Create staff credentials and track each staff member's live performance & deal volume.</p>
        </div>
        <Button className="btn-violet" onClick={() => setShowModal(true)}>
          <FaUserPlus className="me-2" /> Add Staff Member
        </Button>
      </div>

      {/* Top Stat Summary */}
      <Row className="g-3 mb-4">
        <Col md={4}>
          <Card className="crm-card p-3 d-flex align-items-center gap-3">
            <div className="d-flex align-items-center justify-content-center bg-primary-subtle text-primary rounded-circle" style={{ width: '48px', height: '48px', fontSize: '20px' }}>
              👥
            </div>
            <div>
              <div className="text-muted small fw-semibold">Active Staff Accounts</div>
              <h4 className="fw-bold mb-0">{staff.length} Active Staff</h4>
            </div>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="crm-card p-3 d-flex align-items-center gap-3">
            <div className="d-flex align-items-center justify-content-center bg-success-subtle text-success rounded-circle" style={{ width: '48px', height: '48px', fontSize: '20px' }}>
              ₹
            </div>
            <div>
              <div className="text-muted small fw-semibold">Total Staff Sales Volume</div>
              <h4 className="fw-bold mb-0">₹{sales.reduce((a, b) => a + (b.amountINR || b.amount || 0), 0).toLocaleString('en-IN')}</h4>
            </div>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="crm-card p-3 d-flex align-items-center gap-3">
            <div className="d-flex align-items-center justify-content-center bg-warning-subtle text-warning rounded-circle" style={{ width: '48px', height: '48px', fontSize: '20px' }}>
              📅
            </div>
            <div>
              <div className="text-muted small fw-semibold">Total Meetings Assigned</div>
              <h4 className="fw-bold mb-0">{meetings.length} Meetings</h4>
            </div>
          </Card>
        </Col>
      </Row>

      <Card className="crm-card p-4 border-0">
        <Table responsive className="custom-table mb-0">
          <thead>
            <tr>
              <th>Staff Member</th>
              <th>Email Address</th>
              <th>Deals Closed (INR)</th>
              <th>Assigned Meetings</th>
              <th>Status</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-4 text-muted">
                  No staff members added yet. Click "Add Staff Member" above to create credentials.
                </td>
              </tr>
            ) : (
              staff.map((s) => {
                const stats = getStaffStats(s._id);
                return (
                  <tr key={s._id}>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        <div className="crm-avatar-fallback">
                          {s.name ? s.name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div>
                          <div className="fw-bold text-dark">{s.name}</div>
                          <div className="text-muted" style={{ fontSize: '11px' }}>Role: Staff Access</div>
                        </div>
                      </div>
                    </td>
                    <td>{s.email}</td>
                    <td>
                      {/* Won deals from Lead model - source of truth */}
                      <div className="fw-bold text-success">
                        ₹{getStaffStats(s._id).wonLeadValue.toLocaleString('en-IN')}
                      </div>
                      <div className="d-flex gap-1 mt-1">
                        <span style={{ fontSize: '10px', background: '#d1fae5', color: '#059669', borderRadius: '6px', padding: '1px 6px', fontWeight: 600 }}>
                          ✓ {getStaffStats(s._id).wonCount} Won
                        </span>
                        <span style={{ fontSize: '10px', background: '#eef2ff', color: '#4f46e5', borderRadius: '6px', padding: '1px 6px', fontWeight: 600 }}>
                          ~ {getStaffStats(s._id).activeCount} Active
                        </span>
                        <span style={{ fontSize: '10px', background: '#fee2e2', color: '#dc2626', borderRadius: '6px', padding: '1px 6px', fontWeight: 600 }}>
                          ✗ {getStaffStats(s._id).lostCount} Lost
                        </span>
                      </div>
                    </td>
                    <td>
                      <Badge bg="info" className="px-3 py-2 rounded-pill">
                        {getStaffStats(s._id).staffMeetings.length} Scheduled
                      </Badge>
                    </td>
                    <td>
                      <span className="badge bg-success-subtle text-success px-3 py-2 rounded-pill d-inline-flex align-items-center gap-1">
                        <span className="live-dot"></span> Active / Online
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="d-flex justify-content-end gap-2">
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                          onClick={() => openStaffActivity(s)}
                          style={{ borderRadius: '8px' }}
                        >
                          <FaEye className="me-1" /> View Activity
                        </Button>
                        <Button 
                          variant="outline-danger" 
                          size="sm" 
                          onClick={() => handleDelete(s._id)}
                          style={{ borderRadius: '8px' }}
                        >
                          <FaTrash />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </Card>

      {/* Staff Activity Offcanvas Drawer */}
      <Offcanvas show={showDrawer} onHide={() => setShowDrawer(false)} placement="end" style={{ width: '420px' }}>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title className="fw-bold">Staff Activity Details</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-4">
          {selectedStaff && (
            <div>
              <div className="d-flex align-items-center gap-3 mb-4 p-3 bg-subtle rounded-3">
                <div className="crm-avatar-fallback" style={{ width: '48px', height: '48px', fontSize: '20px' }}>
                  {selectedStaff.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h5 className="fw-bold mb-0">{selectedStaff.name}</h5>
                  <div className="text-muted small">{selectedStaff.email}</div>
                </div>
              </div>

              {(() => {
                const stats = getStaffStats(selectedStaff._id);
                return (
                  <div>
                    <h6 className="fw-bold mb-3">Performance Overview — Leads Pipeline (₹)</h6>
                    {/* Lead status breakdown */}
                    <div className="d-flex gap-2 mb-3">
                      <div className="flex-fill p-2 rounded-2 text-center" style={{ background: '#f0fdf4' }}>
                        <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>🏆 Won</div>
                        <div className="fw-bold" style={{ color: '#10b981', fontSize: '22px' }}>{stats.wonCount}</div>
                        <div style={{ fontSize: '10px', color: '#059669' }}>₹{stats.wonLeadValue.toLocaleString('en-IN')}</div>
                      </div>
                      <div className="flex-fill p-2 rounded-2 text-center" style={{ background: '#eef2ff' }}>
                        <div style={{ fontSize: '11px', color: '#4f46e5', fontWeight: 700 }}>📋 Active</div>
                        <div className="fw-bold" style={{ color: '#6366f1', fontSize: '22px' }}>{stats.activeCount}</div>
                        <div style={{ fontSize: '10px', color: '#6366f1' }}>In progress</div>
                      </div>
                      <div className="flex-fill p-2 rounded-2 text-center" style={{ background: '#fef2f2' }}>
                        <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 700 }}>❌ Lost</div>
                        <div className="fw-bold" style={{ color: '#ef4444', fontSize: '22px' }}>{stats.lostCount}</div>
                        <div style={{ fontSize: '10px', color: '#ef4444' }}>Closed lost</div>
                      </div>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-3 p-2 rounded-2" style={{ background: '#f8fafc' }}>
                      <span className="text-muted small">Win Rate</span>
                      <span className="fw-bold" style={{ color: stats.winRate >= 50 ? '#10b981' : '#ef4444' }}>{stats.winRate}%</span>
                    </div>

                    <h6 className="fw-bold mb-2">Monthly Won Value (₹)</h6>
                    <div className="mb-3">
                      {stats.monthlyWon.map((m, i) => (
                        <div key={i} className="d-flex align-items-center gap-2 mb-1">
                          <div className="text-muted" style={{ fontSize: '11px', width: '28px' }}>{m.label}</div>
                          <div className="flex-grow-1" style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: stats.monthlyWon.some(x => x.won > 0)
                                ? `${(m.won / Math.max(...stats.monthlyWon.map(x => x.won), 1)) * 100}%`
                                : '0%',
                              background: 'linear-gradient(90deg, #10b981, #5c50e6)',
                              borderRadius: '4px',
                              transition: 'width 0.5s'
                            }}></div>
                          </div>
                          <div className="fw-semibold" style={{ fontSize: '11px', width: '70px', textAlign: 'right' }}>₹{m.won.toLocaleString('en-IN')}</div>
                        </div>
                      ))}
                    </div>

                    <h6 className="fw-bold mb-2">Assigned Meetings</h6>
                    <div className="mb-4">
                      {stats.staffMeetings.length === 0 ? (
                        <div className="text-muted small">No meetings assigned.</div>
                      ) : (
                        stats.staffMeetings.map(m => (
                          <div key={m._id} className="p-2 border-bottom small">
                            <div className="fw-bold text-dark">{m.title}</div>
                            <div className="text-muted">{m.date} ({m.timeSlot || m.time})</div>
                            <Badge bg={m.acknowledged ? 'success' : 'warning'} style={{ fontSize: '10px' }}>
                              {m.acknowledged ? 'Acknowledged' : 'Pending Ack'}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>

                    <h6 className="fw-bold mb-2">Recorded Sales Activity</h6>
                    <div>
                      {stats.staffSales.length === 0 ? (
                        <div className="text-muted small">No sales recorded yet.</div>
                      ) : (
                        stats.staffSales.map(s => (
                          <div key={s._id} className="p-2 border-bottom small d-flex justify-content-between">
                            <div>
                              <div className="fw-bold">{s.name || 'Sales Deal'}</div>
                              <div className="text-muted">{new Date(s.createdAt).toLocaleDateString()}</div>
                            </div>
                            <div className="fw-bold text-success">₹{(s.amountINR || s.amount || 0).toLocaleString('en-IN')}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </Offcanvas.Body>
      </Offcanvas>

      {/* Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">Create Staff Credentials</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form onSubmit={handleCreate}>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">Staff Full Name</Form.Label>
              <Form.Control 
                required 
                value={newStaff.name} 
                onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} 
                placeholder="e.g. Rahul Sharma"
                style={{ borderRadius: '10px' }}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">Email Address</Form.Label>
              <Form.Control 
                type="email" 
                required 
                value={newStaff.email} 
                onChange={e => setNewStaff({ ...newStaff, email: e.target.value })} 
                placeholder="rahul@company.com"
                style={{ borderRadius: '10px' }}
              />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label className="small fw-semibold">Assign Initial Password</Form.Label>
              <Form.Control 
                required 
                type="password"
                value={newStaff.temporaryPassword} 
                onChange={e => setNewStaff({ ...newStaff, temporaryPassword: e.target.value })} 
                placeholder="Set initial password"
                style={{ borderRadius: '10px' }}
              />
            </Form.Group>
            <div className="d-flex justify-content-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowModal(false)} style={{ borderRadius: '10px' }}>Cancel</Button>
              <Button className="btn-violet" type="submit">Create Credentials</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default StaffList;
