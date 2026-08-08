const express = require('express');
const router = express.Router();
const { permit } = require('../middleware/authMiddleware');
const meetingController = require('../controllers/meetingController');

// Create meeting (admin only)
router.post('/', permit('admin'), meetingController.createMeeting);

// Get all meetings (admin view)
router.get('/', permit('admin'), meetingController.getAllMeetings);

// Get my assigned meetings (staff view)
router.get('/my', meetingController.getMyMeetings);

// Acknowledge meeting (staff)
router.put('/:id/acknowledge', meetingController.acknowledgeMeeting);

// Update meeting status
router.put('/:id', meetingController.updateMeetingStatus);

module.exports = router;
