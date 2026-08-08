const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Inventory = require('../models/Inventory');
const { permit } = require('../middleware/authMiddleware');

// List staff members (accessible by all authenticated admin/staff for dropdowns)
router.get('/staff', async (req, res) => {
  try {
    const staff = await User.find({ role: 'staff' }).select('-passwordHash -refreshTokens').sort({ createdAt: -1 });
    res.json(staff);
  } catch (err) {
    console.error('Error fetching staff list:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// All other admin management routes require admin role
router.use(permit('admin'));

// Create new staff user
router.post('/staff', async (req, res) => {
  const { name, email, temporaryPassword } = req.body;
  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'Email already exists' });

    const staff = new User({ 
      name, 
      email: email.toLowerCase(), 
      role: 'staff' 
    });
    await staff.setPassword(temporaryPassword || 'staff123');
    await staff.save();

    const staffData = {
      _id: staff._id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      createdAt: staff.createdAt
    };

    // Emit real-time socket event so all connected UI screens update immediately
    const io = req.app.locals.io;
    if (io) {
      io.emit('staffAdded', staffData);
    }

    res.status(201).json({ message: 'Staff created successfully', staff: staffData, temporaryPassword });
  } catch (err) {
    console.error('Error creating staff member:', err);
    res.status(500).json({ message: 'Server error creating staff' });
  }
});

// Update staff
router.put('/staff/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    const staff = await User.findByIdAndUpdate(id, updates, { new: true }).select('-passwordHash -refreshTokens');
    if (!staff) return res.status(404).json({ message: 'Staff member not found' });
    
    const io = req.app.locals.io;
    if (io) io.emit('staffUpdated', staff);

    res.json(staff);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete staff
router.delete('/staff/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await User.findByIdAndDelete(id);

    const io = req.app.locals.io;
    if (io) io.emit('staffDeleted', id);

    res.json({ message: 'Staff member deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
