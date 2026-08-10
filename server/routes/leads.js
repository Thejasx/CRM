const express = require('express');
const router = express.Router();
const { verifyToken, permit } = require('../middleware/authMiddleware');
const leadController = require('../controllers/leadController');

// Create lead (admin or staff)
router.post('/', verifyToken, leadController.createLead);

// Get all leads (admin view)
router.get('/', verifyToken, permit('admin'), leadController.getAllLeads);

// Get staff assigned leads
router.get('/my', verifyToken, leadController.getMyLeads);

// Get aggregated stats for current user (day/week/month pipeline, top customers, satisfaction)
router.get('/stats', verifyToken, leadController.getLeadStats);

// Assign or update lead
router.put('/:id', verifyToken, leadController.assignLead);

module.exports = router;
