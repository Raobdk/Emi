const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const customerRoutes = require('./customer.routes');
const installmentRoutes = require('./installment.routes');
const paymentRoutes = require('./payment.routes');
const reportRoutes = require('./report.routes');
const aiRoutes = require('./ai.routes');
const notificationRoutes = require('./notification.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/customers', customerRoutes);
router.use('/installments', installmentRoutes);
router.use('/payments', paymentRoutes);
router.use('/reports', reportRoutes);
router.use('/ai', aiRoutes);
router.use('/notifications', notificationRoutes);

// API documentation route
router.get('/docs', (req, res) => {
  res.json({
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      customers: '/api/v1/customers',
      installments: '/api/v1/installments',
      payments: '/api/v1/payments',
      reports: '/api/v1/reports',
      ai: '/api/v1/ai',
      notifications: '/api/v1/notifications'
    }
  });
});

module.exports = router;