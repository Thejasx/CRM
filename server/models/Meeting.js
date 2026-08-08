const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  details: { type: String, default: '' },
  date: { type: String, required: true }, // Format YYYY-MM-DD
  time: { type: String, required: true }, // e.g. "10:30 AM"
  timeSlot: { type: String, default: '10:00 AM - 11:00 AM' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
  acknowledged: { type: Boolean, default: false },
  acknowledgedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Meeting', meetingSchema);
