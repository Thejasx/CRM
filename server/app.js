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

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Make io accessible to routes/controllers via app locals
app.locals.io = io;

// CORS — allow requests from the frontend (env var) or any origin in development
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, 'http://localhost:3000']
  : true; // true = allow all origins (safe for open APIs; lock down in production)

const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Pre-flight for all routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure DB connection & seed admin middleware for serverless & local
app.use(async (req, res, next) => {
  try {
    await connectDB();
    if (!global._adminSeeded) {
      global._adminSeeded = true;
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
          console.log('DEFAULT ADMIN CREATED: admin@crm.com / admin123');
        }
      } catch (e) {
        console.error('Error seeding admin user:', e);
      }
    }
    next();
  } catch (err) {
    console.error('Database connection error:', err);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', verifyToken, adminRoutes);
app.use('/api/sales', verifyToken, salesRoutes);
app.use('/api/meetings', verifyToken, meetingRoutes);
app.use('/api/leads', verifyToken, leadRoutes);

// Simple health check
app.get('/', (req, res) => res.send('CRM API is running'));

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
}

module.exports = app;
