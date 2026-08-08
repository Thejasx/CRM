// CRM Server - nodemon restart trigger
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { Server: SocketIOServer } = require('socket.io');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const salesRoutes = require('./routes/sales');
const meetingRoutes = require('./routes/meetings');
const leadRoutes = require('./routes/leads');
const { verifyToken } = require('./middleware/authMiddleware');

const User = require('./models/User');

// Load env vars
dotenv.config();

// Connect to MongoDB & Seed Admin
connectDB().then(async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const defaultAdmin = new User({
        name: 'Central Admin',
        email: 'admin@crm.com',
        role: 'admin',
      });
      await defaultAdmin.setPassword('admin123');
      await defaultAdmin.save();
      console.log('----------------------------------------------------');
      console.log('DEFAULT ADMIN CREATED:');
      console.log('Email: admin@crm.com');
      console.log('Password: admin123');
      console.log('----------------------------------------------------');
    }
  } catch (e) {
    console.error('Error seeding admin user:', e);
  }
});

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Make io accessible to routes/controllers via app locals
app.locals.io = io;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', verifyToken, adminRoutes);
app.use('/api/sales', verifyToken, salesRoutes);
app.use('/api/meetings', verifyToken, meetingRoutes);
app.use('/api/leads', verifyToken, leadRoutes);

// Simple health check
app.get('/', (req, res) => res.send('CRM API is running'));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
