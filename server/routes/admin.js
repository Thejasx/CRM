const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Inventory = require('../models/Inventory');
const { permit } = require('../middleware/authMiddleware');
const Sale = require('../models/Sale');
const Lead = require('../models/Lead');
const { GoogleGenAI } = require('@google/genai');

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

// ── Gemini AI Sales Summary (Admin only) ──
router.post('/ai-sales-summary', permit('admin'), async (req, res) => {
  try {
    const { period = 'week' } = req.body; // 'day' | 'week' | 'month'

    const now = new Date();
    let startDate;
    if (period === 'day') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      // week — last 7 days
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Fetch sales and leads data for the period
    const [sales, leads, allStaff] = await Promise.all([
      Sale.find({ createdAt: { $gte: startDate } }).populate('createdBy', 'name email').sort({ createdAt: -1 }),
      Lead.find({ createdAt: { $gte: startDate } }).populate('assignedTo', 'name email').populate('createdBy', 'name email').sort({ createdAt: -1 }),
      User.find({ role: 'staff' }).select('name email'),
    ]);

    // Build per-staff aggregation
    const staffMap = {};
    allStaff.forEach(s => {
      staffMap[String(s._id)] = { name: s.name, email: s.email, salesCount: 0, salesValue: 0, wonLeads: 0, lostLeads: 0, activeLeads: 0, leadValue: 0 };
    });

    sales.forEach(s => {
      const id = String(s.createdBy?._id || s.createdBy);
      if (staffMap[id]) {
        staffMap[id].salesCount++;
        staffMap[id].salesValue += s.amountINR || s.amount || 0;
      }
    });

    leads.forEach(l => {
      const id = String(l.assignedTo?._id || l.createdBy?._id || l.assignedTo || l.createdBy);
      if (staffMap[id]) {
        const status = (l.status || '').toLowerCase();
        if (status === 'won') { staffMap[id].wonLeads++; staffMap[id].leadValue += l.amountINR || 0; }
        else if (status === 'lost') staffMap[id].lostLeads++;
        else staffMap[id].activeLeads++;
      }
    });

    const staffSummary = Object.values(staffMap)
      .map(s => `- ${s.name}: ${s.salesCount} sales (₹${s.salesValue.toLocaleString('en-IN')}), ${s.wonLeads} leads won (₹${s.leadValue.toLocaleString('en-IN')}), ${s.lostLeads} lost, ${s.activeLeads} active`)
      .join('\n');

    const totalSalesValue = sales.reduce((a, b) => a + (b.amountINR || b.amount || 0), 0);
    const wonLeadsAll = leads.filter(l => (l.status || '').toLowerCase() === 'won');
    const totalLeadsValue = wonLeadsAll.reduce((a, b) => a + (b.amountINR || 0), 0);

    const prompt = `You are a CRM business intelligence analyst for "dipch CRM". Analyze the following staff sales performance for the time period: "${period === 'day' ? 'Today' : period === 'week' ? 'Last 7 Days' : 'This Month'}".

OVERALL STATS:
- Total Sales Entries: ${sales.length} worth ₹${totalSalesValue.toLocaleString('en-IN')}
- Won Leads: ${wonLeadsAll.length} worth ₹${totalLeadsValue.toLocaleString('en-IN')}
- Combined Revenue: ₹${(totalSalesValue + totalLeadsValue).toLocaleString('en-IN')}
- Total Staff: ${allStaff.length}

STAFF PERFORMANCE BREAKDOWN:
${staffSummary || 'No staff data available for this period.'}

Please provide:
1. A SHORT EXECUTIVE SUMMARY (2-3 sentences) of overall team performance
2. TOP PERFORMER highlight (name and why)
3. PROS (3-4 bullet points of what's going well)
4. CONS / AREAS FOR IMPROVEMENT (3-4 bullet points of concerns or weak areas)
5. ONE ACTIONABLE RECOMMENDATION for the admin to act on this week

Keep the tone professional, data-driven, and concise. Format clearly with section headings. Use ₹ for currency. Do not use markdown code blocks.`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ message: 'Gemini API key not configured' });

    // Use the official @google/genai SDK — same as BlogAPP
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',  // confirmed working model for this API key
      contents: prompt,
    });

    const text = response.text;
    if (!text) {
      return res.status(502).json({ message: 'No response from Gemini' });
    }

    return res.json({
      period,
      startDate,
      summary: text,
      stats: {
        salesCount: sales.length,
        totalSalesValue,
        wonLeadsCount: wonLeadsAll.length,
        totalLeadsValue,
        combinedRevenue: totalSalesValue + totalLeadsValue,
        staffCount: allStaff.length,
      }
    });
  } catch (err) {
    console.error('Gemini AI summary error:', err);
    return res.status(500).json({ message: err.message || 'Server error generating AI summary' });
  }
});

module.exports = router;
