const Lead = require('../models/Lead');
const mongoose = require('mongoose');

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

// GET /leads/stats — aggregated stats for the authenticated staff member
exports.getLeadStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch all leads for this staff member
    const myLeads = await Lead.find({
      $or: [{ assignedTo: userId }, { createdBy: userId }]
    }).sort({ createdAt: 1 });

    const now = new Date();

    const wonLeads  = myLeads.filter(l => ['Won','won'].includes(l.status));
    const lostLeads = myLeads.filter(l => ['Lost','lost'].includes(l.status));

    // --- Satisfaction Rate ---
    const totalDecided = wonLeads.length + lostLeads.length;
    const satisfactionRate = totalDecided > 0
      ? Math.round((wonLeads.length / totalDecided) * 100)
      : 0;

    // --- Top Customers (by won deal value) ---
    const customerMap = {};
    wonLeads.forEach(l => {
      const key = l.name || 'Unknown';
      if (!customerMap[key]) customerMap[key] = { name: key, value: 0, deals: 0 };
      customerMap[key].value += (l.amountINR || 0);
      customerMap[key].deals += 1;
    });
    const topCustomers = Object.values(customerMap)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // --- Customer Visits (unique won clients per month last 6 months) ---
    const customerVisits = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const monthWon = wonLeads.filter(l => {
        const ld = new Date(l.createdAt);
        return ld.getFullYear() === d.getFullYear() && ld.getMonth() === d.getMonth();
      });
      const uniqueClients = new Set(monthWon.map(l => l.name)).size;
      return {
        label: d.toLocaleString('default', { month: 'short' }),
        visits: uniqueClients,
        wonValue: monthWon.reduce((a, b) => a + (b.amountINR || 0), 0)
      };
    });

    // --- Daily pipeline (last 7 days, won only) ---
    const daily = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(d.getDate() + 1);
      const dayWon = wonLeads.filter(l => {
        const ld = new Date(l.createdAt);
        return ld >= d && ld < next;
      });
      return {
        label: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()],
        won: dayWon.reduce((a, b) => a + (b.amountINR || 0), 0),
        count: dayWon.length
      };
    });

    // --- Weekly pipeline (last 4 weeks, won only) ---
    const weekly = Array.from({ length: 4 }, (_, i) => {
      const end = new Date(now);
      end.setDate(now.getDate() - i * 7);
      end.setHours(23, 59, 59, 999);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      const weekWon = wonLeads.filter(l => {
        const ld = new Date(l.createdAt);
        return ld >= start && ld <= end;
      });
      return {
        label: `W${4 - i}`,
        won: weekWon.reduce((a, b) => a + (b.amountINR || 0), 0),
        count: weekWon.length
      };
    }).reverse();

    // --- Monthly pipeline (last 6 months, won only) ---
    const monthly = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const monthWon = wonLeads.filter(l => {
        const ld = new Date(l.createdAt);
        return ld.getFullYear() === d.getFullYear() && ld.getMonth() === d.getMonth();
      });
      return {
        label: d.toLocaleString('default', { month: 'short' }),
        won: monthWon.reduce((a, b) => a + (b.amountINR || 0), 0),
        count: monthWon.length
      };
    });

    res.json({
      satisfactionRate,
      totalWon: wonLeads.length,
      totalLost: lostLeads.length,
      wonValue: wonLeads.reduce((a, b) => a + (b.amountINR || 0), 0),
      topCustomers,
      customerVisits,
      daily,
      weekly,
      monthly
    });
  } catch (err) {
    console.error('Error fetching lead stats:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
