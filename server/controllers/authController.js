// server/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper to generate tokens
function generateAccessToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
}
function generateRefreshToken(user) {
  const token = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  user.refreshTokens.push(token);
  user.save();
  return token;
}

// Register admin (first time setup)
exports.registerAdmin = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'User already exists' });
    const hashed = await bcrypt.hash(password, 10);
    const admin = new User({ name, email, password: hashed, role: 'admin', refreshTokens: [] });
    await admin.save();
    const access = generateAccessToken(admin);
    const refresh = generateRefreshToken(admin);
    res.status(201).json({ accessToken: access, refreshToken: refresh });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login for admin or staff
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });
    const access = generateAccessToken(user);
    const refresh = generateRefreshToken(user);
    res.json({ accessToken: access, refreshToken: refresh });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Refresh token endpoint
exports.refreshToken = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.sendStatus(401);
  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(payload.id);
    if (!user || !user.refreshTokens.includes(token)) return res.sendStatus(403);
    const access = generateAccessToken(user);
    res.json({ accessToken: access });
  } catch (err) {
    console.error(err);
    res.sendStatus(403);
  }
};

// Logout (invalidate refresh token)
exports.logout = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.sendStatus(400);
  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(payload.id);
    if (user) {
      user.refreshTokens = user.refreshTokens.filter(t => t !== token);
      await user.save();
    }
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
};
