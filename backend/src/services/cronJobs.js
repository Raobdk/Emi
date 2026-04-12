const cron = require('node-cron');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

// Run every day at 9 AM
cron.schedule('0 9 * * *', async () => {
  logger.info('🕐 Running daily payment check cron job...');
  await markOverduePayments();
  await sendPaymentReminders();
}, { timezone: 'Asia/Karachi' });

// Mark overdue payments
const markOverduePayments = async () => {
  try {
    const result = await Payment.updateMany(
      {
        status: 'pending',
        dueDate: { $lt: new Date() }
      },
      { status: 'overdue' }
    );

    if (result.modifiedCount > 0) {
      logger.info(`Marked ${result.modifiedCount} payments as overdue`);

      await Notification.create({
        type: 'payment_overdue',
        title: 'Overdue Payments Alert',
        message: `${result.modifiedCount} payments are now overdue and require immediate attention.`,
        priority: 'high'
      });
    }
  } catch (err) {
    logger.error(`Failed to mark overdue payments: ${err.message}`);
  }
};

// Send reminders for payments due in 3 days
const sendPaymentReminders = async () => {
  try {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const today = new Date();

    const upcomingPayments = await Payment.find({
      status: 'pending',
      dueDate: { $gte: today, $lte: threeDaysFromNow }
    }).populate('customerId', 'name phone');

    for (const payment of upcomingPayments) {
      const daysLeft = Math.ceil((payment.dueDate - today) / (1000 * 60 * 60 * 24));
      await Notification.create({
        type: 'payment_due',
        title: `Payment Due in ${daysLeft} Day(s)`,
        message: `${payment.customerId?.name || 'Customer'}'s payment of PKR ${payment.amount.toLocaleString()} is due on ${payment.dueDate.toLocaleDateString('en-PK')}`,
        paymentId: payment._id,
        customerId: payment.customerId?._id,
        priority: daysLeft <= 1 ? 'high' : 'medium'
      });
    }

    logger.info(`Sent ${upcomingPayments.length} payment reminders`);
  } catch (err) {
    logger.error(`Failed to send reminders: ${err.message}`);
  }
};

logger.info('✅ Cron jobs initialized');
module.exports = {};
