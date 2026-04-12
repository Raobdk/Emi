const InstallmentPlan = require('../models/InstallmentPlan');
const Payment = require('../models/Payment');
const Customer = require('../models/Customers');
const Notification = require('../models/Notification');
const { getPagination, paginatedResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

// @desc    Create installment plan
// @route   POST /api/installments
const createInstallmentPlan = async (req, res) => {
  req.body.createdBy = req.user._id;
  const plan = await InstallmentPlan.create(req.body);

  // Auto-generate payment schedule
  await generatePaymentSchedule(plan);

  // Update customer stats
  await Customer.findByIdAndUpdate(plan.customerId, {
    $inc: { totalInvested: plan.basePrice }
  });

  // Create notification
  await Notification.create({
    type: 'plan_created',
    title: 'New Installment Plan Created',
    message: `Plan ${plan.planId} created. Monthly EMI: PKR ${plan.monthlyEmi.toLocaleString()}`,
    installmentPlanId: plan._id,
    customerId: plan.customerId
  });

  const populatedPlan = await InstallmentPlan.findById(plan._id)
    .populate('customerId', 'name customerId phone cnic')
    .populate('createdBy', 'name email');

  logger.info(`Installment plan created: ${plan.planId}`);

  const io = req.app.get('io');
  if (io) {
    io.emit('plan_created', populatedPlan);
    io.emit('notification', { message: `New plan created for ${populatedPlan.customerId?.name}`, icon: '📝' });
  }

  res.status(201).json({
    success: true,
    message: 'Installment plan created successfully',
    plan: populatedPlan
  });
};

// Generate payment schedule (one record per month)
const generatePaymentSchedule = async (plan) => {
  const payments = [];
  const startDate = new Date(plan.startDate);
  
  const lastPayment = await Payment.findOne({}, {}, { sort: { 'paymentId': -1 } });
  let nextIdNumber = 1;
  if (lastPayment && lastPayment.paymentId && lastPayment.paymentId.startsWith('PAY')) {
    const lastNum = parseInt(lastPayment.paymentId.replace('PAY', ''), 10);
    if (!isNaN(lastNum)) {
      nextIdNumber = lastNum + 1;
    }
  }

  let initialPaidAmount = 0;

  for (let i = 1; i <= plan.durationMonths; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    let status = 'pending';
    let paidDate = undefined;

    // Logic for old entries: Mark as paid if within paidMonths
    if (plan.paidMonths && i <= plan.paidMonths) {
      status = 'paid';
      paidDate = dueDate; // Assuming it was paid on its due date
      initialPaidAmount += plan.monthlyEmi;
    }

    payments.push({
      paymentId: `PAY${String(nextIdNumber++).padStart(8, '0')}`,
      installmentPlanId: plan._id,
      customerId: plan.customerId,
      monthNumber: i,
      dueDate,
      amount: plan.monthlyEmi,
      status,
      paidDate
    });
  }

  await Payment.insertMany(payments);

  // If old data was entered, update the plan with the pre-paid amounts
  if (initialPaidAmount > 0) {
    plan.totalPaid = initialPaidAmount;
    plan.totalRemaining = plan.totalAmount - initialPaidAmount;
    if (plan.totalRemaining <= 0) plan.status = 'completed';
    await plan.save();
  }
};

// @desc    Get all installment plans
// @route   GET /api/installments
const getInstallmentPlans = async (req, res) => {
  const { page = 1, limit = 10, status, customerId, search } = req.query;
  const { skip } = getPagination(page, limit);

  const query = {};
  if (status) query.status = status;
  if (customerId) query.customerId = customerId;

  const [plans, total] = await Promise.all([
    InstallmentPlan.find(query)
      .populate('customerId', 'name customerId phone cnic')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    InstallmentPlan.countDocuments(query)
  ]);

  res.json({ success: true, ...paginatedResponse(plans, total, page, limit) });
};

// @desc    Get single installment plan with payments
// @route   GET /api/installments/:id
const getInstallmentPlan = async (req, res) => {
  const plan = await InstallmentPlan.findById(req.params.id)
    .populate('customerId', 'name customerId phone cnic address')
    .populate('createdBy', 'name email');

  if (!plan) {
    return res.status(404).json({ success: false, message: 'Installment plan not found' });
  }

  const payments = await Payment.find({ installmentPlanId: plan._id })
    .populate('collectedBy', 'name')
    .sort({ monthNumber: 1 });

  res.json({ success: true, plan, payments });
};

// @desc    Update installment plan
// @route   PUT /api/installments/:id
const updateInstallmentPlan = async (req, res) => {
  const plan = await InstallmentPlan.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('customerId', 'name customerId phone');

  if (!plan) {
    return res.status(404).json({ success: false, message: 'Plan not found' });
  }

  res.json({ success: true, message: 'Plan updated successfully', plan });
};

// @desc    Delete installment plan
// @route   DELETE /api/installments/:id
const deleteInstallmentPlan = async (req, res) => {
  const plan = await InstallmentPlan.findById(req.params.id);
  if (!plan) {
    return res.status(404).json({ success: false, message: 'Plan not found' });
  }

  await Payment.deleteMany({ installmentPlanId: plan._id });
  await plan.deleteOne();

  res.json({ success: true, message: 'Plan deleted successfully' });
};

// @desc    Cancel an active installment plan
// @route   PATCH /api/installments/:id/cancel
const cancelInstallmentPlan = async (req, res) => {
  const plan = await InstallmentPlan.findById(req.params.id);
  
  if (!plan) {
    return res.status(404).json({ success: false, message: 'Plan not found' });
  }

  if (plan.status !== 'active') {
    return res.status(400).json({ success: false, message: 'Only active plans can be cancelled' });
  }

  // Update plan status
  plan.status = 'cancelled';
  await plan.save();

  // Update all pending and overdue payments to 'waived'
  await Payment.updateMany(
    {
      installmentPlanId: plan._id,
      status: { $in: ['pending', 'overdue'] }
    },
    {
      $set: { status: 'waived', notes: 'Waived due to plan cancellation' }
    }
  );

  const io = req.app.get('io');
  if (io) {
    io.emit('plan_cancelled', plan);
    io.emit('notification', { message: `Plan cancelled: ${plan.planId}`, icon: '🚫' });
  }

  res.json({ success: true, message: 'Plan cancelled and remaining payments waived' });
};

// @desc    Calculate EMI preview (no DB save)
// @route   POST /api/installments/calculate
const calculateEmi = async (req, res) => {
  const { basePrice, advancePayment, durationMonths } = req.body;

  if (!basePrice || !durationMonths) {
    return res.status(400).json({ success: false, message: 'basePrice and durationMonths required' });
  }

  const advance = advancePayment || 0;
  let interestRate;

  if (durationMonths >= 12) interestRate = 40;
  else if (durationMonths >= 10) interestRate = 35;
  else if (durationMonths >= 9) interestRate = 30;
  else if (durationMonths >= 6) interestRate = 20;
  else if (durationMonths >= 3) interestRate = 10;
  else interestRate = 5;

  const remainingAmount = basePrice - advance;
  const interestAmount = (remainingAmount * interestRate) / 100;
  const totalAmount = remainingAmount + interestAmount;
  const monthlyEmi = Math.ceil(totalAmount / durationMonths);

  res.json({
    success: true,
    calculation: {
      basePrice,
      advancePayment: advance,
      remainingAmount,
      interestRate,
      interestAmount,
      totalAmount,
      monthlyEmi,
      durationMonths
    }
  });
};

// @desc    Get dashboard stats
// @route   GET /api/installments/dashboard
const getDashboardStats = async (req, res) => {
  const [
    totalPlans,
    activePlans,
    completedPlans,
    totalCustomers,
    overduePayments,
    todayPayments,
    monthlyStats
  ] = await Promise.all([
    InstallmentPlan.countDocuments(),
    InstallmentPlan.countDocuments({ status: 'active' }),
    InstallmentPlan.countDocuments({ status: 'completed' }),
    Customer.countDocuments({ status: 'active' }),
    Payment.countDocuments({ status: 'overdue' }),
    Payment.find({
      dueDate: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lte: new Date(new Date().setHours(23, 59, 59, 999))
      }
    }),
    InstallmentPlan.aggregate([
      { $match: { status: { $in: ['active', 'completed'] } } },
      {
        $group: {
          _id: null,
          totalInvested: { $sum: '$basePrice' },
          totalProfit: { $sum: '$profit' },
          totalPaid: { $sum: { $add: ['$totalPaid', { $ifNull: ['$advancePayment', 0] }] } },
          totalRemaining: { $sum: '$totalRemaining' }
        }
      }
    ])
  ]);

  const stats = monthlyStats[0] || {
    totalInvested: 0, totalProfit: 0, totalPaid: 0, totalRemaining: 0
  };

  res.json({
    success: true,
    stats: {
      totalPlans,
      activePlans,
      completedPlans,
      totalCustomers,
      overduePayments,
      todayDue: todayPayments.length,
      ...stats
    }
  });
};

module.exports = {
  createInstallmentPlan,
  getInstallmentPlans,
  getInstallmentPlan,
  updateInstallmentPlan,
  deleteInstallmentPlan,
  cancelInstallmentPlan,
  calculateEmi,
  getDashboardStats
};
