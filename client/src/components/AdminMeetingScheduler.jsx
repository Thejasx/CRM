import React, { useEffect, useState, useContext } from 'react';
import { Table, Button, Form, Modal, Card, Badge, Row, Col } from 'react-bootstrap';
import api from '../services/api';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { FaCalendarPlus, FaClock, FaUserCheck, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

const AdminMeetingScheduler = () => {
  const { user } = useContext(AuthContext);
  const [meetings, setMeetings] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const timeSlots = [
    '09:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '01:00 PM - 02:00 PM',
    '02:00 PM - 03:00 PM',
    '03:00 PM - 04:00 PM',
    '04:00 PM - 05:00 PM',
    '05:00 PM - 06:00 PM'
  ];

  const [newMeeting, setNewMeeting] = useState({
    title: '',
    details: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00 AM',
    timeSlot: '10:00 AM - 11:00 AM',
    assignedTo: ''
  });

  const fetchData = async () => {
    try {
      const isStaff = user?.role === 'staff';
      const endpoint = isStaff ? '/meetings/my' : '/meetings';
      
      const [mRes, sRes] = await Promise.all([
        api.get(endpoint).catch(() => ({ data: [] })),
        api.get('/admin/staff').catch(() => ({ data: [] }))
      ]);

      setMeetings(mRes.data || []);
      setStaffList(sRes.data || []);

      if (sRes.data && sRes.data.length > 0 && !newMeeting.assignedTo) {
        setNewMeeting(prev => ({ ...prev, assignedTo: sRes.data[0]._id }));
      }
    } catch (err) {
      console.error('Error loading meeting data:', err);
      toast.error('Failed to load meeting calendar data');
    }
  };

  useEffect(() => {
    fetchData();

    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');
    socket.on('staffAdded', () => fetchData());
    socket.on('meetingAssigned', () => fetchData());
    socket.on('meetingAcknowledged', () => fetchData());

    return () => socket.disconnect();
  }, [user]);

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    if (!newMeeting.title) {
      toast.error('Please enter a meeting title');
      return;
    }
    // Build payload ensuring assignedTo is set
    const payload = { ...newMeeting };
    if (!payload.assignedTo && staffList.length > 0) {
      payload.assignedTo = staffList[0]._id;
    }
    if (!payload.assignedTo) {
      toast.error('Please select an active staff member to assign');
      return;
    }

    try {
      await api.post('/meetings', payload);
      toast.success('🎉 Meeting scheduled & real-time notification sent to staff!');
      setShowModal(false);
      setNewMeeting({
        title: '',
        details: '',
        date: new Date().toISOString().split('T')[0],
        time: '10:00 AM',
        timeSlot: '10:00 AM - 11:00 AM',
        assignedTo: staffList[0]?._id || ''
      });
      fetchData();
    } catch (err) {
      console.error('Error scheduling meeting:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to schedule meeting');
    }
  };

  const handleAcknowledge = async (meetingId) => {
    try {
      await api.put(`/meetings/${meetingId}/acknowledge`);
      toast.success('✅ Meeting acknowledged!');
      fetchData();
    } catch (err) {
      toast.error('Failed to acknowledge meeting');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api.put(`/meetings/${id}`, { status });
      toast.success(`Meeting status updated to ${status}`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Calendar & Time-Slot Scheduler</h3>
          <p className="text-muted small mb-0">Assign time-slots to active staff with real-time notification & staff acknowledgement tracking.</p>
        </div>
        <Button className="btn-violet" onClick={() => setShowModal(true)}>
          <FaCalendarPlus className="me-2" /> Schedule Meeting Time-Slot
        </Button>
      </div>

      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card className="crm-card p-3 d-flex align-items-center gap-3">
            <div className="d-flex align-items-center justify-content-center bg-primary-subtle text-primary rounded-circle" style={{ width: '48px', height: '48px', fontSize: '20px' }}>
              📅
            </div>
            <div>
              <div className="text-muted small fw-semibold">Total Meetings</div>
              <h4 className="fw-bold mb-0">{meetings.length}</h4>
            </div>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="crm-card p-3 d-flex align-items-center gap-3">
            <div className="d-flex align-items-center justify-content-center bg-warning-subtle text-warning rounded-circle" style={{ width: '48px', height: '48px', fontSize: '20px' }}>
              ⏳
            </div>
            <div>
              <div className="text-muted small fw-semibold">Pending Ack</div>
              <h4 className="fw-bold mb-0">{meetings.filter(m => !m.acknowledged).length}</h4>
            </div>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="crm-card p-3 d-flex align-items-center gap-3">
            <div className="d-flex align-items-center justify-content-center bg-success-subtle text-success rounded-circle" style={{ width: '48px', height: '48px', fontSize: '20px' }}>
              <FaUserCheck />
            </div>
            <div>
              <div className="text-muted small fw-semibold">Acknowledged</div>
              <h4 className="fw-bold mb-0">{meetings.filter(m => m.acknowledged).length}</h4>
            </div>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="crm-card p-3 d-flex align-items-center gap-3">
            <div className="d-flex align-items-center justify-content-center bg-info-subtle text-info rounded-circle" style={{ width: '48px', height: '48px', fontSize: '20px' }}>
              ✅
            </div>
            <div>
              <div className="text-muted small fw-semibold">Completed</div>
              <h4 className="fw-bold mb-0">{meetings.filter(m => m.status === 'completed').length}</h4>
            </div>
          </Card>
        </Col>
      </Row>

      <Card className="crm-card p-4 border-0">
        <Table responsive className="custom-table mb-0">
          <thead>
            <tr>
              <th>Meeting Agenda</th>
              <th>Assigned Staff</th>
              <th>Date & Time-Slot</th>
              <th>Staff Ack Status</th>
              <th>Status</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {meetings.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-4 text-muted">
                  No scheduled meetings found. Click "Schedule Meeting Time-Slot" to assign meetings to staff.
                </td>
              </tr>
            ) : (
              meetings.map((m) => (
                <tr key={m._id}>
                  <td>
                    <div className="fw-bold text-dark">{m.title}</div>
                    <div className="text-muted small">{m.details || 'No additional notes'}</div>
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <div className="crm-avatar-fallback" style={{ width: '32px', height: '32px', fontSize: '13px' }}>
                        {m.assignedTo?.name ? m.assignedTo.name.charAt(0).toUpperCase() : 'S'}
                      </div>
                      <div>
                        <div className="fw-semibold small">{m.assignedTo?.name || 'Staff Member'}</div>
                        <div className="text-muted" style={{ fontSize: '11px' }}>{m.assignedTo?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-1 small text-dark fw-semibold">
                      <FaClock className="text-muted" />
                      <span>{m.date}</span>
                    </div>
                    <Badge bg="light" text="dark" className="border mt-1">
                      {m.timeSlot || m.time}
                    </Badge>
                  </td>
                  <td>
                    {m.acknowledged ? (
                      <Badge bg="success" className="px-3 py-2 rounded-pill d-inline-flex align-items-center gap-1">
                        <FaCheckCircle /> Acknowledged
                      </Badge>
                    ) : (
                      <Badge bg="warning" className="px-3 py-2 rounded-pill d-inline-flex align-items-center gap-1">
                        <FaExclamationCircle /> Awaiting Ack
                      </Badge>
                    )}
                  </td>
                  <td>
                    {m.status === 'scheduled' && <Badge bg="primary" className="px-3 py-2 rounded-pill">Scheduled</Badge>}
                    {m.status === 'completed' && <Badge bg="success" className="px-3 py-2 rounded-pill">Completed</Badge>}
                    {m.status === 'cancelled' && <Badge bg="danger" className="px-3 py-2 rounded-pill">Cancelled</Badge>}
                  </td>
                  <td className="text-end">
                    <div className="d-flex justify-content-end gap-2">
                      {!m.acknowledged && (
                        <Button variant="success" size="sm" onClick={() => handleAcknowledge(m._id)}>
                          <FaCheckCircle className="me-1" /> Acknowledge
                        </Button>
                      )}
                      {m.status === 'scheduled' && (
                        <>
                          <Button variant="outline-success" size="sm" onClick={() => handleStatusChange(m._id, 'completed')}>
                            Complete
                          </Button>
                          <Button variant="outline-danger" size="sm" onClick={() => handleStatusChange(m._id, 'cancelled')}>
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>

      {/* Schedule Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">Assign Staff Meeting & Time-Slot</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form onSubmit={handleCreateMeeting}>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">Meeting Title / Agenda</Form.Label>
              <Form.Control 
                required 
                value={newMeeting.title} 
                onChange={e => setNewMeeting({ ...newMeeting, title: e.target.value })} 
                placeholder="e.g. Q4 Strategy Sync / Product Demo"
                style={{ borderRadius: '10px' }}
              />
            </Form.Group>


            {/* Admin only: Assign to a staff member */}
            {user?.role === 'admin' && (
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Assign Active Staff Member</Form.Label>
                <Form.Select
                  required
                  value={newMeeting.assignedTo}
                  onChange={e => setNewMeeting({ ...newMeeting, assignedTo: e.target.value })}
                  style={{ borderRadius: '10px' }}
                >
                  <option value="">-- Select Staff Member --</option>
                  {staffList.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.email})
                    </option>
                  ))}
                </Form.Select>
                {staffList.length === 0 && (
                  <div className="text-warning small mt-1">⚠️ No staff members yet. Add staff first.</div>
                )}
              </Form.Group>
            )}

            <Row className="g-2 mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Meeting Date</Form.Label>
                  <Form.Control 
                    type="date"
                    required
                    value={newMeeting.date}
                    onChange={e => setNewMeeting({ ...newMeeting, date: e.target.value })}
                    style={{ borderRadius: '10px' }}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Select Time-Slot</Form.Label>
                  <Form.Select
                    required
                    value={newMeeting.timeSlot}
                    onChange={e => setNewMeeting({
                      ...newMeeting,
                      timeSlot: e.target.value,
                      time: e.target.value.split(' - ')[0]
                    })}
                    style={{ borderRadius: '10px' }}
                  >
                    {timeSlots.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-4">
              <Form.Label className="small fw-semibold">Meeting Notes / Agenda</Form.Label>
              <Form.Control 
                as="textarea"
                rows={3}
                value={newMeeting.details} 
                onChange={e => setNewMeeting({ ...newMeeting, details: e.target.value })} 
                placeholder="Details or link for staff member..."
                style={{ borderRadius: '10px' }}
              />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowModal(false)} style={{ borderRadius: '10px' }}>Cancel</Button>
              <Button className="btn-violet" type="submit" disabled={staffList.length === 0}>Assign Time-Slot & Notify Staff</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default AdminMeetingScheduler;
