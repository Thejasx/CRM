const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Inventory', inventorySchema);
