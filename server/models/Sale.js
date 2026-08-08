const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  name: { type: String, default: 'General Sales Deal' },
  details: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['won', 'lost', 'pending', 'Won', 'Lost', 'Pending', 'new', 'New', 'qualified', 'Qualified'], 
    default: 'pending' 
  },
  amountINR: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});

saleSchema.pre('save', function(next) {
  if (this.status) {
    this.status = this.status.toLowerCase();
  }
  if (!this.amountINR && this.amount) {
    this.amountINR = this.amount;
  }
  if (!this.amount && this.amountINR) {
    this.amount = this.amountINR;
  }
  next();
});

module.exports = mongoose.model('Sale', saleSchema);
