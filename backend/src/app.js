const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
require('express-async-errors');

// Safe logger (fallback)
let logger;
try {
  logger = require('./utils/logger');
} catch (err) {
  console.log("Logger load failed, using console");
  logger = console;
}

// Safe error middleware
let errorMiddleware;
try {
  errorMiddleware = require('./middleware/error.middleware');
} catch (err) {
  errorMiddleware = (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: err.message });
  };
}

// Routes (safe load)
const safeRequire = (path) => {
  try {
    return require(path);
  } catch (err) {
    console.log(`Route load failed: ${path}`);
    return express.Router();
  }
};

const authRoutes = safeRequire('./routes/auth.routes');
const customerRoutes = safeRequire('./routes/customer.routes');
const installmentRoutes = safeRequire('./routes/installment.routes');
const paymentRoutes = safeRequire('./routes/payment.routes');
const reportRoutes = safeRequire('./routes/report.routes');
const notificationRoutes = safeRequire('./routes/notification.routes');
const aiRoutes = safeRequire('./routes/ai.routes');

const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ['GET', 'POST']
  }
});

app.set('io', io);

io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('join_room', (userId) => {
    socket.join(userId);
    logger.info(`User ${userId} joined`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Security
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));

// Rate limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 10000 : 100
});
app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health route (IMPORTANT)
app.get('/', (req, res) => {
  res.send('Server running 🚀');
});

app.get('/api/health', (req, res) => {
  res.json({ success: true });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/installments', installmentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);

// 404
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use(errorMiddleware);

// DB connect (SAFE)
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info("MongoDB Connected ✅");

    // Auto-seed admin user if none exists
    const User = require('./models/Users');
    const count = await User.countDocuments();
    if (count === 0) {
      await User.create({
        name: 'Super Admin',
        email: 'admin@emisystem.com',
        password: 'admin123',
        role: 'admin',
        phone: '0000000000'
      });
      logger.info('✅ Auto-seeded default admin (admin@emisystem.com / admin123)');
    }

  } catch (err) {
    logger.error("DB Error:", err.message);

    // retry instead of crash
    setTimeout(connectDB, 5000);
  }
};

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  // Safe cron
  try {
    require('./services/cronJobs');
  } catch (err) {
    console.log("Cron failed:", err.message);
  }

  httpServer.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
  });
};

startServer();

module.exports = { app, io };