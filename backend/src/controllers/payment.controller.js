const Payment = require('../models/Payment');
const InstallmentPlan = require('../models/InstallmentPlan');
const Customer = require('../models/Customers');
const Notification = require('../models/Notification');
const pdfService = require('../services/pdfGenrator.services');
const logger = require('../utils/logger');

// @desc    Record a payment
// @route   POST /api/payments/:paymentId/record
const recordPayment = async (req, res) => {
  const payment = await Payment.findById(req.params.paymentId);
  if (!payment) {
    return res.status(404).json({ success: false, message: 'Payment not found' });
  }

  if (payment.status === 'paid') {
    return res.status(400).json({ success: false, message: 'Payment already recorded' });
  }

  const { amountPaid, paymentMethod, notes, lateFee, paidDate } = req.body;

  payment.amountPaid = amountPaid;
  payment.paymentMethod = paymentMethod || 'cash';
  payment.notes = notes;
  payment.lateFee = lateFee || 0;
  payment.paidDate = paidDate || new Date();
  payment.collectedBy = req.user._id;

  if (amountPaid >= payment.amount) {
    payment.status = 'paid';
  } else if (amountPaid > 0) {
    payment.status = 'partial';
  }

  await payment.save();

  // Update plan totals
  const plan = await InstallmentPlan.findById(payment.installmentPlanId);
  if (plan) {
    plan.totalPaid += amountPaid;
    plan.paidMonths = await Payment.countDocuments({
      installmentPlanId: plan._id, status: 'paid'
    });
    plan.totalRemaining = plan.totalAmount - plan.totalPaid;

    // Check if plan is complete
    if (plan.paidMonths >= plan.durationMonths) {
      plan.status = 'completed';
    }

    await plan.save();
  }

  // Generate receipt PDF
  let receiptUrl = null;
  try {
    receiptUrl = await pdfService.generateReceipt(payment._id);
    payment.receiptUrl = receiptUrl;
    await payment.save();
  } catch (err) {
    logger.warn(`Receipt generation failed: ${err.message}`);
  }

  // Create notification
  await Notification.create({
    type: 'payment_received',
    title: 'Payment Recorded',
    message: `Payment of PKR ${amountPaid.toLocaleString()} recorded for month ${payment.monthNumber}`,
    paymentId: payment._id,
    installmentPlanId: payment.installmentPlanId,
    customerId: payment.customerId
  });

  // Emit real-time notification
  const io = req.app.get('io');
  if (io) {
    io.emit('payment_received', { payment, plan });
  }

  logger.info(`Payment recorded: ${payment.paymentId}`);

  res.json({
    success: true,
    message: 'Payment recorded successfully',
    payment,
    receiptUrl
  });
};

// @desc    Get payments for a plan
// @route   GET /api/payments/plan/:planId
const getPlanPayments = async (req, res) => {
  const payments = await Payment.find({ installmentPlanId: req.params.planId })
    .populate('collectedBy', 'name email')
    .sort({ monthNumber: 1 });

  const summary = {
    total: payments.length,
    paid: payments.filter(p => p.status === 'paid').length,
    partial: payments.filter(p => p.status === 'partial').length,
    overdue: payments.filter(p => p.status === 'overdue').length,
    pending: payments.filter(p => p.status === 'pending').length,
    totalPaid: payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0),
    totalPending: payments.filter(p => p.status !== 'paid').reduce((sum, p) => sum + (p.amount || 0), 0)
  };

  res.json({ success: true, payments, summary });
};

// @desc    Get all overdue payments
// @route   GET /api/payments/overdue
const getOverduePayments = async (req, res) => {
  const payments = await Payment.find({ status: 'overdue' })
    .populate('customerId', 'name phone customerId')
    .populate('installmentPlanId', 'planId productName monthlyEmi')
    .sort({ dueDate: 1 });

  res.json({ success: true, count: payments.length, payments });
};

// @desc    Get payment history for customer
// @route   GET /api/payments/customer/:customerId
const getCustomerPayments = async (req, res) => {
  const payments = await Payment.find({ customerId: req.params.customerId })
    .populate('installmentPlanId', 'planId productName')
    .populate('collectedBy', 'name')
    .sort({ dueDate: -1 });

  res.json({ success: true, count: payments.length, payments });
};

// @desc    Download receipt PDF
// @route   GET /api/payments/:paymentId/receipt
const downloadReceipt = async (req, res) => {
  const payment = await Payment.findById(req.params.paymentId)
    .populate('customerId', 'name cnic phone customerId')
    .populate('installmentPlanId', 'planId productName monthlyEmi totalAmount')
    .populate('collectedBy', 'name');

  if (!payment) {
    return res.status(404).json({ success: false, message: 'Payment not found' });
  }

  try {
    const pdfBuffer = await pdfService.generateReceiptBuffer(payment);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${payment.paymentId}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    logger.error(`Receipt download failed: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to generate receipt' });
  }
};

// @desc    Waive a payment (admin only)
// @route   PATCH /api/payments/:paymentId/waive
const waivePayment = async (req, res) => {
  const payment = await Payment.findByIdAndUpdate(
    req.params.paymentId,
    { status: 'waived', notes: req.body.reason || 'Waived by admin' },
    { new: true }
  );

  if (!payment) {
    return res.status(404).json({ success: false, message: 'Payment not found' });
  }

  res.json({ success: true, message: 'Payment waived', payment });
};

module.exports = {
  recordPayment,
  getPlanPayments,
  getOverduePayments,
  getCustomerPayments,
  downloadReceipt,
  waivePayment
};
