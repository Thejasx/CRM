const Sale = require('../models/Sale');

// Create a new sale (staff or admin)
exports.createSale = async (req, res) => {
  try {
    const { name, details, status, amountINR, amount } = req.body;
    const numericAmount = Number(amountINR || amount || 0);

    const sale = new Sale({
      name: name || 'General Sales Deal',
      details: details || '',
      status: (status || 'pending').toLowerCase(),
      amountINR: numericAmount,
      amount: numericAmount,
      createdBy: req.user._id
    });

    await sale.save();
    await sale.populate('createdBy', 'name email role');

    // Emit real-time event to all connected clients
    const io = req.app.locals.io;
    if (io) {
      io.emit('saleAdded', sale);
    }

    return res.status(201).json(sale);
  } catch (err) {
    console.error('Error creating sale:', err);
    return res.status(500).json({ message: err.message || 'Server error creating sale' });
  }
};

// Get all sales (admin view)
exports.getAllSales = async (req, res) => {
  try {
    const sales = await Sale.find().sort({ createdAt: -1 }).populate('createdBy', 'name email role');
    return res.json(sales);
  } catch (err) {
    console.error('Error fetching all sales:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get sales for current authenticated staff member
exports.getMySales = async (req, res) => {
  try {
    const sales = await Sale.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    return res.json(sales);
  } catch (err) {
    console.error('Error fetching my sales:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
