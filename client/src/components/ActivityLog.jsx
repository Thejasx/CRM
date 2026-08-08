import React from 'react';
import { Card, Table, Badge } from 'react-bootstrap';

const dummyLogs = [
  { id: 1, time: new Date().toLocaleString(), user: 'Central Admin', action: 'System Initialized & Socket server started' },
  { id: 2, time: new Date().toLocaleString(), user: 'Central Admin', action: 'Security JWT Token refreshed' },
];

const ActivityLog = () => (
  <Card className="p-4 shadow-sm border-0">
    <h4 className="mb-3">System Activity & Audit Logs</h4>
    <Table striped bordered hover responsive>
      <thead>
        <tr>
          <th>#</th>
          <th>Timestamp</th>
          <th>User</th>
          <th>Action Executed</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {dummyLogs.map((log) => (
          <tr key={log.id}>
            <td>{log.id}</td>
            <td>{log.time}</td>
            <td><strong>{log.user}</strong></td>
            <td>{log.action}</td>
            <td><Badge bg="success">Logged</Badge></td>
          </tr>
        ))}
      </tbody>
    </Table>
  </Card>
);

export default ActivityLog;
