const Lead = require('../models/Lead');

// Create a new lead/deal and assign to staff (Admin or Staff)
exports.createLead = async (req, res) => {
  const { title, name, email, phone, amountINR, status, assignedTo } = req.body;
  try {
    const lead = new Lead({
      title: title || 'New Sales Lead',
      name,
      email: email || '',
      phone: phone || '',
      amountINR: Number(amountINR || 0),
      status: status || 'New',
      assignedTo: assignedTo || null,
      createdBy: req.user._id
    });
    await lead.save();
    await lead.populate('assignedTo', 'name email');
    await lead.populate('createdBy', 'name email');

    // Emit real-time event to socket
    const io = req.app.locals.io;
    if (io) {
      io.emit('leadAssigned', lead);
    }

    res.status(201).json(lead);
  } catch (err) {
    console.error('Error creating lead:', err);
    res.status(500).json({ message: 'Server error creating lead' });
  }
};

// Get all leads (Admin view)
exports.getAllLeads = async (req, res) => {
  try {
    const leads = await Lead.find()
      .sort({ createdAt: -1 })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');
    res.json(leads);
  } catch (err) {
    console.error('Error fetching all leads:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get staff's assigned leads
exports.getMyLeads = async (req, res) => {
  try {
    const leads = await Lead.find({
      $or: [{ assignedTo: req.user._id }, { createdBy: req.user._id }]
    })
      .sort({ createdAt: -1 })
      .populate('assignedTo', 'name email');
    res.json(leads);
  } catch (err) {
    console.error('Error fetching staff leads:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Assign/Reassign lead to staff
exports.assignLead = async (req, res) => {
  const { id } = req.params;
  const { assignedTo, status } = req.body;
  try {
    const updates = {};
    if (assignedTo !== undefined) updates.assignedTo = assignedTo || null;
    if (status) updates.status = status;
    // Track when a lead is won
    if (status === 'Won' || status === 'won') {
      updates.wonAt = new Date();
    }

    const lead = await Lead.findByIdAndUpdate(id, updates, { new: true })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const io = req.app.locals.io;
    if (io) {
      io.emit('leadAssigned', lead);
      // Emit dedicated event when status becomes Won
      if (status === 'Won' || status === 'won') {
        io.emit('leadWon', lead);
      }
    }

    res.json(lead);
  } catch (err) {
    console.error('Error assigning lead:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
