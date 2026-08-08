import React, { useState } from 'react';
import { Card, Button, Form, Row, Col, Badge, Switch } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { FaGoogle, FaWhatsapp, FaFacebook, FaPlug, FaCheckCircle, FaExchangeAlt, FaCog } from 'react-icons/fa';

const Settings = () => {
  const [theme, setTheme] = useState(
    document.documentElement.getAttribute('data-theme') || 'light'
  );

  // Integration States
  const [googleConnected, setGoogleConnected] = useState(true);
  const [whatsappConnected, setWhatsappConnected] = useState(true);
  const [metaConnected, setMetaConnected] = useState(false);
  const [webhookConnected, setWebhookConnected] = useState(true);

  const [whatsappKey, setWhatsappKey] = useState('WA_TOKEN_live_9823498172938');
  const [metaAppId, setMetaAppId] = useState('1092837491823');
  const [webhookUrl, setWebhookUrl] = useState('https://api.mycrm.com/webhooks/v1');

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    setTheme(nextTheme);
  };

  const handleSaveIntegration = (name) => {
    toast.success(`🎉 ${name} integration settings saved & synced successfully!`);
  };

  return (
    <div>
      <div className="mb-4">
        <h3 className="fw-bold mb-1">Integrations & System Settings</h3>
        <p className="text-muted small mb-0">Connect Google Calendar, WhatsApp API, Meta Lead Ads, custom Webhooks, and appearance settings.</p>
      </div>

      <Row className="g-4">
        {/* Google Calendar Integration */}
        <Col lg={6}>
          <Card className="crm-card p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex align-items-center gap-3">
                <div className="d-flex align-items-center justify-content-center bg-danger-subtle text-danger rounded-circle" style={{ width: '48px', height: '48px', fontSize: '22px' }}>
                  <FaGoogle />
                </div>
                <div>
                  <h6 className="fw-bold mb-0">Google Calendar Sync</h6>
                  <span className="text-muted small">Auto-sync assigned meeting time-slots</span>
                </div>
              </div>
              <Badge bg={googleConnected ? 'success' : 'secondary'} className="px-3 py-2 rounded-pill">
                {googleConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>

            <p className="small text-muted mb-3">
              Automatically sync staff meeting time-slots with Google Calendar for instant mobile & desktop calendar alerts.
            </p>

            <div className="d-flex justify-content-between align-items-center pt-2">
              <Button 
                variant={googleConnected ? 'outline-danger' : 'outline-success'} 
                size="sm"
                onClick={() => {
                  setGoogleConnected(!googleConnected);
                  toast.info(`Google Calendar ${googleConnected ? 'Disconnected' : 'Connected'}`);
                }}
              >
                {googleConnected ? 'Disconnect Google Account' : 'Connect Google Account'}
              </Button>
              <Button className="btn-violet" size="sm" onClick={() => handleSaveIntegration('Google Calendar')}>
                Save Sync Rules
              </Button>
            </div>
          </Card>
        </Col>

        {/* WhatsApp Business API Integration */}
        <Col lg={6}>
          <Card className="crm-card p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex align-items-center gap-3">
                <div className="d-flex align-items-center justify-content-center bg-success-subtle text-success rounded-circle" style={{ width: '48px', height: '48px', fontSize: '22px' }}>
                  <FaWhatsapp />
                </div>
                <div>
                  <h6 className="fw-bold mb-0">WhatsApp Business API</h6>
                  <span className="text-muted small">Automated lead notifications via WhatsApp</span>
                </div>
              </div>
              <Badge bg={whatsappConnected ? 'success' : 'secondary'} className="px-3 py-2 rounded-pill">
                {whatsappConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">WhatsApp Permanent Access Token</Form.Label>
              <Form.Control 
                type="password"
                value={whatsappKey} 
                onChange={e => setWhatsappKey(e.target.value)} 
                style={{ borderRadius: '10px' }}
              />
            </Form.Group>

            <div className="d-flex justify-content-between align-items-center pt-2">
              <Button 
                variant={whatsappConnected ? 'outline-danger' : 'outline-success'} 
                size="sm"
                onClick={() => {
                  setWhatsappConnected(!whatsappConnected);
                  toast.info(`WhatsApp API ${whatsappConnected ? 'Disconnected' : 'Connected'}`);
                }}
              >
                {whatsappConnected ? 'Disconnect API' : 'Connect WhatsApp API'}
              </Button>
              <Button className="btn-violet" size="sm" onClick={() => handleSaveIntegration('WhatsApp API')}>
                Save WhatsApp Settings
              </Button>
            </div>
          </Card>
        </Col>

        {/* Meta (Facebook & Instagram) Integration */}
        <Col lg={6}>
          <Card className="crm-card p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex align-items-center gap-3">
                <div className="d-flex align-items-center justify-content-center bg-primary-subtle text-primary rounded-circle" style={{ width: '48px', height: '48px', fontSize: '22px' }}>
                  <FaFacebook />
                </div>
                <div>
                  <h6 className="fw-bold mb-0">Meta Ads Lead Integration</h6>
                  <span className="text-muted small">Auto-import Facebook & Instagram leads</span>
                </div>
              </div>
              <Badge bg={metaConnected ? 'success' : 'secondary'} className="px-3 py-2 rounded-pill">
                {metaConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">Meta App ID / Page Token</Form.Label>
              <Form.Control 
                type="text"
                value={metaAppId} 
                onChange={e => setMetaAppId(e.target.value)} 
                style={{ borderRadius: '10px' }}
              />
            </Form.Group>

            <div className="d-flex justify-content-between align-items-center pt-2">
              <Button 
                variant={metaConnected ? 'outline-danger' : 'outline-primary'} 
                size="sm"
                onClick={() => {
                  setMetaConnected(!metaConnected);
                  toast.info(`Meta Lead Ads ${metaConnected ? 'Disconnected' : 'Connected'}`);
                }}
              >
                {metaConnected ? 'Disconnect Meta' : 'Connect Meta Page'}
              </Button>
              <Button className="btn-violet" size="sm" onClick={() => handleSaveIntegration('Meta Lead Ads')}>
                Save Meta Config
              </Button>
            </div>
          </Card>
        </Col>

        {/* Custom API Webhook Integration */}
        <Col lg={6}>
          <Card className="crm-card p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex align-items-center gap-3">
                <div className="d-flex align-items-center justify-content-center bg-info-subtle text-info rounded-circle" style={{ width: '48px', height: '48px', fontSize: '22px' }}>
                  <FaPlug />
                </div>
                <div>
                  <h6 className="fw-bold mb-0">Custom API & Webhooks</h6>
                  <span className="text-muted small">Receive real-time lead & sale webhooks</span>
                </div>
              </div>
              <Badge bg={webhookConnected ? 'success' : 'secondary'} className="px-3 py-2 rounded-pill">
                {webhookConnected ? 'Active' : 'Disabled'}
              </Badge>
            </div>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">Target Webhook Endpoint URL</Form.Label>
              <Form.Control 
                type="url"
                value={webhookUrl} 
                onChange={e => setWebhookUrl(e.target.value)} 
                style={{ borderRadius: '10px' }}
              />
            </Form.Group>

            <div className="d-flex justify-content-between align-items-center pt-2">
              <Button 
                variant="outline-info" 
                size="sm"
                onClick={() => toast.success('📡 Test Webhook Ping Sent (HTTP 200 OK)')}
              >
                Send Test Webhook
              </Button>
              <Button className="btn-violet" size="sm" onClick={() => handleSaveIntegration('Webhooks API')}>
                Save Webhook Config
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* System Theme & Connection Settings */}
      <Row className="g-4 mt-1">
        <Col md={12}>
          <Card className="crm-card p-4 border-0">
            <h5 className="fw-bold mb-2">Theme & Server Connection</h5>
            <p className="text-muted small mb-4">Toggle system light/dark theme and view active WebSocket ports.</p>
            <div className="d-flex align-items-center justify-content-between p-3 rounded-3" style={{ background: 'var(--bg-subtle)' }}>
              <div>
                <div className="fw-bold">Current Active Theme</div>
                <div className="small text-capitalize text-muted">{theme} Mode Active</div>
              </div>
              <Button variant={theme === 'dark' ? 'light' : 'dark'} onClick={toggleTheme} style={{ borderRadius: '10px' }}>
                Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Settings;
