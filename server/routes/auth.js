const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken } = require('../middleware/authMiddleware');

// Helper to generate tokens
const generateTokens = async (user) => {
  const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  // Save refresh token
  user.refreshTokens.push({ token: refreshToken, expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
  await user.save();
  return { accessToken, refreshToken };
};

// Login route (admin and staff share same login endpoint)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const valid = await user.validatePassword(password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
    const tokens = await generateTokens(user);
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role }, ...tokens });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: 'User not found' });
    // Verify token exists in user's list
    const stored = user.refreshTokens.find(rt => rt.token === refreshToken);
    if (!stored) return res.status(401).json({ message: 'Refresh token invalid' });
    // Issue new access token (optionally rotate refresh token)
    const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
    res.json({ accessToken });
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

// Logout – invalidate a refresh token
router.post('/logout', verifyToken, async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });
  try {
    const user = await User.findById(req.user._id);
    user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== refreshToken);
    await user.save();
    res.json({ message: 'Logged out' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
