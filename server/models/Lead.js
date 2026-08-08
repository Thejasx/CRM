const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  title: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  amountINR: { type: Number, required: true },
  status: { type: String, enum: ['New', 'Contacted', 'Qualified', 'Won', 'Lost'], default: 'New' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);
