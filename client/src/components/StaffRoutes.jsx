import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import StaffOverview from './StaffOverview';
import SalesForm from './SalesForm';
import AdminMeetingScheduler from './AdminMeetingScheduler';
import SalesAndLeadManager from './SalesAndLeadManager';
import Settings from './Settings';

const StaffRoutes = () => (
  <Routes>
    <Route path="overview" element={<StaffOverview />} />
    <Route path="sales" element={<SalesForm />} />
    <Route path="meetings" element={<AdminMeetingScheduler />} />
    <Route path="leads" element={<SalesAndLeadManager />} />
    <Route path="settings" element={<Settings />} />
    <Route path="*" element={<Navigate to="overview" replace />} />
  </Routes>
);

export default StaffRoutes;
