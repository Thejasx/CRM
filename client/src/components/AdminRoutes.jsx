import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminOverview from './AdminOverview';
import StaffList from './StaffList';
import AdminMeetingScheduler from './AdminMeetingScheduler';
import SalesAndLeadManager from './SalesAndLeadManager';
import Analytics from './Analytics';
import Settings from './Settings';

const AdminRoutes = () => (
  <Routes>
    <Route path="dashboard" element={<AdminOverview />} />
    <Route path="staff" element={<StaffList />} />
    <Route path="meetings" element={<AdminMeetingScheduler />} />
    <Route path="leads" element={<SalesAndLeadManager />} />
    <Route path="analytics" element={<Analytics />} />
    <Route path="settings" element={<Settings />} />
    <Route path="*" element={<Navigate to="dashboard" replace />} />
  </Routes>
);

export default AdminRoutes;
