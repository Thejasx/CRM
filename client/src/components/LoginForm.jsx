import React, { useState, useContext } from 'react';
import { Form, Button, Card, Container, Badge } from 'react-bootstrap';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isAuthenticated, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(email, password);
  };

  const handleDemoAdmin = () => {
    setEmail('admin@crm.com');
    setPassword('admin123');
  };

  const handleDemoStaff = () => {
    setEmail('staff@crm.com');
    setPassword('staff123');
  };

  if (isAuthenticated) {
    if (user?.role === 'admin') navigate('/admin');
    else navigate('/staff');
    return null;
  }

  return (
    <div 
      className="d-flex align-items-center justify-content-center min-vh-100 position-relative overflow-hidden"
      style={{
        background: 'radial-gradient(circle at 10% 20%, rgba(67, 24, 255, 0.08) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(0, 198, 255, 0.08) 0%, transparent 40%)'
      }}
    >
      <Container style={{ maxWidth: '440px' }}>
        <Card className="p-4 p-md-5 border-0 shadow-lg floating-elem" style={{ borderRadius: '28px' }}>
          <div className="text-center mb-4">
            <div 
              className="d-inline-flex align-items-center justify-content-center mb-3 shadow"
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #4318ff 0%, #00c6ff 100%)',
                color: '#fff',
                fontSize: '28px'
              }}
            >
              ⚡
            </div>
            <h3 className="fw-bold mb-1" style={{ letterSpacing: '-0.5px' }}>Nexus CRM</h3>
            <p className="text-muted small">Central Staff Management & Real-time Sales</p>
          </div>

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="formEmail">
              <Form.Label className="small fw-semibold">Email address</Form.Label>
              <Form.Control
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ borderRadius: '12px', padding: '12px 16px' }}
              />
            </Form.Group>

            <Form.Group className="mb-4" controlId="formPassword">
              <Form.Label className="small fw-semibold">Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ borderRadius: '12px', padding: '12px 16px' }}
              />
            </Form.Group>

            <Button type="submit" className="btn-primary-gradient w-100 mb-3" style={{ padding: '12px' }}>
              Sign In to Portal →
            </Button>
          </Form>

          <div className="pt-3 border-top text-center">
            <span className="small text-muted d-block mb-2">⚡ 1-Click Quick Demo Login</span>
            <div className="d-flex justify-content-center gap-2">
              <Button size="sm" variant="outline-primary" onClick={handleDemoAdmin} style={{ borderRadius: '10px' }}>
                Fill Admin Credentials
              </Button>
              <Button size="sm" variant="outline-secondary" onClick={handleDemoStaff} style={{ borderRadius: '10px' }}>
                Fill Staff Credentials
              </Button>
            </div>
          </div>
        </Card>
      </Container>
    </div>
  );
};

export default LoginForm;
