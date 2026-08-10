import React, { useState, useEffect, useContext } from 'react';
import { Row, Col, Card, Form, Button, Table, Badge, InputGroup } from 'react-bootstrap';
import api from '../services/api';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import { FaUserTag, FaPlusCircle, FaRupeeSign, FaUserCheck, FaFilter, FaTrophy } from 'react-icons/fa';

const SalesAndLeadManager = () => {
  const { user } = useContext(AuthContext);
  const [leads, setLeads] = useState([]);
  const [staffList, setStaffList] = useState([]);
  
  const [newLead, setNewLead] = useState({
    title: '',
    name: '',
    email: '',
    phone: '',
    amountINR: '',
    status: 'New',
    assignedTo: ''
  });

  const fetchData = async () => {
    try {
      const isStaff = user?.role === 'staff';
      const [leadsRes, staffRes] = await Promise.all([
        api.get(isStaff ? '/leads/my' : '/leads'),
        api.get('/admin/staff')
      ]);
      setLeads(leadsRes.data);
      setStaffList(staffRes.data);
      if (staffRes.data.length > 0 && !newLead.assignedTo) {
        setNewLead(prev => ({ ...prev, assignedTo: staffRes.data[0]._id }));
      }
    } catch (err) {
      toast.error('Failed to load lead assignment data');
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newLead.amountINR || newLead.amountINR <= 0) {
      toast.error('Please enter a valid deal amount in INR');
      return;
    }
    try {
      await api.post('/leads', newLead);
      toast.success('🎉 Lead created & assigned to staff!');
      setNewLead({
        title: '',
        name: '',
        email: '',
        phone: '',
        amountINR: '',
        status: 'New',
        assignedTo: staffList[0]?._id || ''
      });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create lead');
    }
  };

  const handleReassign = async (leadId, staffId) => {
    try {
      await api.put(`/leads/${leadId}`, { assignedTo: staffId });
      toast.success('Lead reassigned successfully!');
      fetchData();
    } catch (err) {
      toast.error('Failed to reassign lead');
    }
  };

  const handleStatusChange = async (leadId, status) => {
    try {
      await api.put(`/leads/${leadId}`, { status });
      toast.success(`Lead status updated to ${status}`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update lead status');
    }
  };

  // Won deals value only (not total pipeline)
  const wonLeadValue = leads
    .filter(l => ['Won','won'].includes(l.status))
    .reduce((acc, curr) => acc + (curr.amountINR || 0), 0);

  // Total pipeline value (all leads) for reference
  const totalLeadValueINR = leads.reduce((acc, curr) => acc + (curr.amountINR || 0), 0);

  return (
    <div>
      <div className="mb-4">
        <h3 className="fw-bold mb-1">Add Sale & Lead Assignment Hub</h3>
        <p className="text-muted small mb-0">Create new sales deals and assign active leads directly to staff members with INR (₹) deal values.</p>
      </div>

      <Row className="g-3 mb-4">
        <Col md={4}>
          <Card className="crm-card p-3 d-flex align-items-center gap-3" style={{ borderLeft: '4px solid #10b981' }}>
            <div className="d-flex align-items-center justify-content-center bg-success-subtle text-success rounded-circle" style={{ width: '48px', height: '48px', fontSize: '22px' }}>
              <FaTrophy />
            </div>
            <div>
              <div className="text-muted small fw-semibold text-uppercase">Won Sales Value (₹)</div>
              <h4 className="fw-bold mb-0 text-success">₹{wonLeadValue.toLocaleString('en-IN')}</h4>
              <div className="text-muted" style={{ fontSize: '11px' }}>Won deals only · not total pipeline</div>
            </div>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="crm-card p-3 d-flex align-items-center gap-3">
            <div className="d-flex align-items-center justify-content-center bg-primary-subtle text-primary rounded-circle" style={{ width: '48px', height: '48px', fontSize: '22px' }}>
              <FaUserTag />
            </div>
            <div>
              <div className="text-muted small fw-semibold text-uppercase">Total Active Leads</div>
              <h4 className="fw-bold mb-0">{leads.length} Leads</h4>
            </div>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="crm-card p-3 d-flex align-items-center gap-3">
            <div className="d-flex align-items-center justify-content-center bg-warning-subtle text-warning rounded-circle" style={{ width: '48px', height: '48px', fontSize: '22px' }}>
              <FaUserCheck />
            </div>
            <div>
              <div className="text-muted small fw-semibold text-uppercase">Assigned Staff Members</div>
              <h4 className="fw-bold mb-0">{staffList.length} Active Staff</h4>
            </div>
          </Card>
        </Col>
      </Row>

      <Row className="g-4">
        {/* Create Lead & Assign Form */}
        <Col lg={5}>
          <Card className="crm-card p-4 border-0">
            <div className="d-flex align-items-center gap-2 mb-3 text-primary">
              <FaPlusCircle className="fs-5" />
              <h5 className="fw-bold mb-0 text-dark">Add New Sale / Assign Lead</h5>
            </div>

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Deal / Lead Title</Form.Label>
                <Form.Control
                  required
                  value={newLead.title}
                  onChange={e => setNewLead({ ...newLead, title: e.target.value })}
                  placeholder="e.g. Enterprise Software License Deal"
                  style={{ borderRadius: '10px' }}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Client Name</Form.Label>
                <Form.Control
                  required
                  value={newLead.name}
                  onChange={e => setNewLead({ ...newLead, name: e.target.value })}
                  placeholder="e.g. Acme Corp / Vikram Malhotra"
                  style={{ borderRadius: '10px' }}
                />
              </Form.Group>

              <Row className="g-2 mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">Email (Optional)</Form.Label>
                    <Form.Control
                      type="email"
                      value={newLead.email}
                      onChange={e => setNewLead({ ...newLead, email: e.target.value })}
                      placeholder="client@acme.com"
                      style={{ borderRadius: '10px' }}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">Phone (Optional)</Form.Label>
                    <Form.Control
                      type="text"
                      value={newLead.phone}
                      onChange={e => setNewLead({ ...newLead, phone: e.target.value })}
                      placeholder="+91 9876543210"
                      style={{ borderRadius: '10px' }}
                    />
                  </Form.Group>
                </Col>
              </Row>

              {/* Admin only: assign lead to a staff member */}
              {user?.role === 'admin' && (
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold">Assign Lead to Staff Member</Form.Label>
                  <Form.Select
                    value={newLead.assignedTo}
                    onChange={e => setNewLead({ ...newLead, assignedTo: e.target.value })}
                    style={{ borderRadius: '10px' }}
                  >
                    <option value="">Unassigned / Admin</option>
                    {staffList.map(s => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.email})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              )}

              <Row className="g-2 mb-4">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">Stage Status</Form.Label>
                    <Form.Select
                      value={newLead.status}
                      onChange={e => setNewLead({ ...newLead, status: e.target.value })}
                      style={{ borderRadius: '10px' }}
                    >
                      <option value="New">New</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Qualified">Qualified</option>
                      <option value="Won">Won Deal</option>
                      <option value="Lost">Lost Deal</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">Deal Amount (INR ₹)</Form.Label>
                    <InputGroup>
                      <InputGroup.Text className="bg-body border-end-0 fw-bold">₹</InputGroup.Text>
                      <Form.Control
                        type="number"
                        min="1"
                        required
                        value={newLead.amountINR}
                        onChange={e => setNewLead({ ...newLead, amountINR: e.target.value })}
                        placeholder="e.g. 250000"
                        className="border-start-0"
                        style={{ borderRadius: '0 10px 10px 0' }}
                      />
                    </InputGroup>
                  </Form.Group>
                </Col>
              </Row>

              <Button type="submit" className="btn-violet w-100 py-3">
                Add Sale & Assign Lead →
              </Button>
            </Form>
          </Card>
        </Col>

        {/* Lead Assignment Table */}
        <Col lg={7}>
          <Card className="crm-card p-4 border-0">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0">Assigned Leads & Deals</h5>
              <Badge bg="success" className="px-3 py-2 rounded-pill fs-6">
                Won: ₹{wonLeadValue.toLocaleString('en-IN')}
              </Badge>
            </div>

            <Table responsive className="custom-table mb-0">
              <thead>
                <tr>
                  <th>Deal Title / Client</th>
                  <th>Value (INR)</th>
                  <th>Assigned Staff</th>
                  <th>Stage</th>
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-4 text-muted">
                      No leads recorded yet. Add a new sale/lead on the left!
                    </td>
                  </tr>
                ) : (
                  leads.map((l) => (
                    <tr key={l._id}>
                      <td>
                        <div className="fw-bold text-dark">{l.title}</div>
                        <div className="text-muted small">{l.name} • {l.phone || l.email || 'No contact info'}</div>
                      </td>
                      <td className="fw-bold text-success">
                        ₹{(l.amountINR || 0).toLocaleString('en-IN')}
                      </td>
                      <td>
                        {user?.role === 'admin' ? (
                          <Form.Select
                            size="sm"
                            value={l.assignedTo?._id || l.assignedTo || ''}
                            onChange={(e) => handleReassign(l._id, e.target.value)}
                            style={{ borderRadius: '8px', fontSize: '12px' }}
                          >
                            <option value="">Unassigned</option>
                            {staffList.map(s => (
                              <option key={s._id} value={s._id}>{s.name}</option>
                            ))}
                          </Form.Select>
                        ) : (
                          <span className="small fw-semibold">{l.assignedTo?.name || 'Assigned to You'}</span>
                        )}
                      </td>
                      <td>
                        <Form.Select
                          size="sm"
                          value={l.status}
                          onChange={(e) => handleStatusChange(l._id, e.target.value)}
                          style={{ borderRadius: '8px', fontSize: '12px' }}
                        >
                          <option value="New">New</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Qualified">Qualified</option>
                          <option value="Won">Won</option>
                          <option value="Lost">Lost</option>
                        </Form.Select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SalesAndLeadManager;
