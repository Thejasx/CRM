import React, { useState, useContext, useEffect } from 'react';
import { Form, Button, Card, Table, Badge, Row, Col, InputGroup } from 'react-bootstrap';
import api from '../services/api';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { FaRupeeSign, FaPlusCircle, FaHistory } from 'react-icons/fa';

const SalesForm = () => {
  const [name, setName] = useState('');
  const [details, setDetails] = useState('');
  const [amountINR, setAmountINR] = useState('');
  const [status, setStatus] = useState('pending');
  const [mySales, setMySales] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useContext(AuthContext);

  const fetchMySales = async () => {
    try {
      const isStaff = user?.role === 'staff';
      const endpoint = isStaff ? '/sales/my' : '/sales';
      const { data } = await api.get(endpoint);
      setMySales(data || []);
    } catch (err) {
      console.error('Error fetching sales:', err);
    }
  };

  useEffect(() => {
    fetchMySales();

    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');
    socket.on('saleAdded', () => fetchMySales());
    return () => socket.disconnect();
  }, [user]);

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
        amount: numericAmount,
        status: status.toLowerCase()
      });

      toast.success('🎉 Sale entry added & broadcasted to live dashboard!');
      setName('');
      setDetails('');
      setAmountINR('');
      setStatus('pending');
      fetchMySales();
    } catch (err) {
      console.error('Error submitting sale:', err);
      toast.error(err.response?.data?.message || 'Failed to record sale');
    } finally {
      setLoading(false);
    }
  };

  const totalAmountINR = mySales.reduce((acc, curr) => acc + (curr.amountINR || curr.amount || 0), 0);

  return (
    <div>
      <div className="mb-4">
        <h3 className="fw-bold mb-1">Add & Manage Sales (INR ₹)</h3>
        <p className="text-muted small mb-0">Record new sales deals with name, status, and details in Indian Rupees.</p>
      </div>

      <Row className="g-3 mb-4">
        <Col md={6}>
          <div className="crm-card p-3 d-flex align-items-center gap-3">
            <div className="d-flex align-items-center justify-content-center bg-success-subtle text-success rounded-circle" style={{ width: '48px', height: '48px', fontSize: '22px' }}>
              ₹
            </div>
            <div>
              <div className="text-muted small fw-semibold text-uppercase">Total Sales Volume (INR)</div>
              <h3 className="fw-bold mb-0">₹{totalAmountINR.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            </div>
          </div>
        </Col>
        <Col md={6}>
          <div className="crm-card p-3 d-flex align-items-center gap-3">
            <div className="d-flex align-items-center justify-content-center bg-primary-subtle text-primary rounded-circle" style={{ width: '48px', height: '48px', fontSize: '22px' }}>
              📊
            </div>
            <div>
              <div className="text-muted small fw-semibold text-uppercase">Total Deals Recorded</div>
              <h3 className="fw-bold mb-0">{mySales.length} Entries</h3>
            </div>
          </div>
        </Col>
      </Row>

      <Row className="g-4">
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
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Enterprise CRM License Deal"
                  style={{ borderRadius: '10px' }}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Deal Details / Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  placeholder="e.g. Annual subscription package for 50 seats"
                  style={{ borderRadius: '10px' }}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Sale Status</Form.Label>
                <Form.Select
                  required
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  style={{ borderRadius: '10px' }}
                >
                  <option value="pending">Pending</option>
                  <option value="won">Won Deal</option>
                  <option value="lost">Lost Deal</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="small fw-semibold">Amount (INR ₹)</Form.Label>
                <InputGroup>
                  <InputGroup.Text className="bg-body border-end-0 fw-bold">₹</InputGroup.Text>
                  <Form.Control
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={amountINR}
                    onChange={e => setAmountINR(e.target.value)}
                    placeholder="e.g. 150000"
                    className="border-start-0"
                    style={{ borderRadius: '0 10px 10px 0' }}
                  />
                </InputGroup>
              </Form.Group>

              <Button type="submit" className="btn-violet w-100 py-3" disabled={loading}>
                {loading ? 'Submitting Sale...' : 'Submit Sale Record (INR ₹) →'}
              </Button>
            </Form>
          </Card>
        </Col>

        <Col lg={7}>
          <Card className="crm-card p-4 border-0">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex align-items-center gap-2">
                <FaHistory className="text-secondary" />
                <h5 className="fw-bold mb-0">Your Recent Sales</h5>
              </div>
              <Badge bg="success" className="px-3 py-2 rounded-pill fs-6">
                Total: ₹{totalAmountINR.toLocaleString('en-IN')}
              </Badge>
            </div>

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
                      <td className="fw-bold text-success">
                        ₹{(s.amountINR || s.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td>
                        {s.status === 'won' && <Badge bg="success" className="px-3 py-2 rounded-pill">Won</Badge>}
                        {s.status === 'pending' && <Badge bg="warning" className="px-3 py-2 rounded-pill">Pending</Badge>}
                        {s.status === 'lost' && <Badge bg="danger" className="px-3 py-2 rounded-pill">Lost</Badge>}
                      </td>
                      <td className="small text-muted">{new Date(s.createdAt).toLocaleDateString()}</td>
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

export default SalesForm;
