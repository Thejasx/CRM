const Meeting = require('../models/Meeting');

// Create meeting & assign to staff (Admin action)
exports.createMeeting = async (req, res) => {
  const { title, details, date, time, timeSlot, assignedTo } = req.body;
  try {
    const meeting = new Meeting({
      title,
      details: details || '',
      date,
      time,
      timeSlot: timeSlot || `${time} - Next Slot`,
      assignedTo,
      assignedBy: req.user._id,
      status: 'scheduled',
      acknowledged: false
    });
    await meeting.save();
    await meeting.populate('assignedTo', 'name email');
    await meeting.populate('assignedBy', 'name email');

    const io = req.app.locals.io;
    if (io) {
      io.emit('meetingAssigned', meeting);
    }

    res.status(201).json(meeting);
  } catch (err) {
    console.error('Error creating meeting:', err);
    res.status(500).json({ message: err.message || 'Server error creating meeting' });
  }
};

// Get all meetings (Admin)
exports.getAllMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find()
      .sort({ createdAt: -1 })
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email');
    res.json(meetings);
  } catch (err) {
    console.error('Error fetching meetings:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get staff's assigned meetings (Staff view)
exports.getMyMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find({ assignedTo: req.user._id })
      .sort({ date: 1, time: 1 })
      .populate('assignedBy', 'name email');
    res.json(meetings);
  } catch (err) {
    console.error('Error fetching staff meetings:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update meeting status
exports.updateMeetingStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const meeting = await Meeting.findByIdAndUpdate(id, { status }, { new: true })
      .populate('assignedTo', 'name email');
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    res.json(meeting);
  } catch (err) {
    console.error('Error updating meeting:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Staff Acknowledge Meeting Notification
exports.acknowledgeMeeting = async (req, res) => {
  const { id } = req.params;
  try {
    const meeting = await Meeting.findByIdAndUpdate(
      id,
      { acknowledged: true, acknowledgedAt: new Date() },
      { new: true }
    ).populate('assignedTo', 'name email');

    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    const io = req.app.locals.io;
    if (io) {
      io.emit('meetingAcknowledged', meeting);
    }

    res.json(meeting);
  } catch (err) {
    console.error('Error acknowledging meeting:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
