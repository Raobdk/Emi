const InstallmentPlan = require('../models/InstallmentPlan');
const Payment = require('../models/Payment');
const Customer = require('../models/Customers');
const { generateAIResponse, getBusinessContext } = require('../services/ai.services');

// @desc    AI chatbot endpoint
// @route   POST /api/ai/chat
const chat = async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, message: 'Message is required' });
  }
  const response = await generateAIResponse(message);
  res.json({ success: true, response, timestamp: new Date() });
};

// @desc    Get AI-powered revenue predictions
// @route   GET /api/ai/predictions
const getPredictions = async (req, res) => {
  const [overduePayments, pendingPayments, activePlans] = await Promise.all([
    Payment.find({ status: 'overdue' })
      .populate('customerId', 'name phone paymentScore')
      .limit(10),
    Payment.find({
      status: 'pending',
      dueDate: {
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
      }
    }).populate('customerId', 'name phone').limit(20),
    InstallmentPlan.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: null,
          expectedMonthly: { $sum: '$monthlyEmi' },
          totalPlans: { $sum: 1 }
        }
      }
    ])
  ]);

  const expectedRevenue = activePlans[0]?.expectedMonthly || 0;
  const atRiskAmount = overduePayments.reduce((sum, p) => sum + p.amount, 0);

  const predictions = {
    expectedMonthlyRevenue: expectedRevenue,
    atRiskAmount,
    recoveryProbability: Math.max(0, 100 - (overduePayments.length * 5)),
    upcomingDue: pendingPayments.length,
    insights: []
  };

  if (overduePayments.length > 10) {
    predictions.insights.push({
      type: 'warning',
      message: `High overdue count (${overduePayments.length}). Immediate collection action needed.`,
      priority: 'high'
    });
  }

  if (pendingPayments.length > 0) {
    predictions.insights.push({
      type: 'info',
      message: `${pendingPayments.length} payments due in next 7 days. Send reminders.`,
      priority: 'medium'
    });
  }

  predictions.insights.push({
    type: 'success',
    message: `Expected monthly collection: PKR ${expectedRevenue.toLocaleString()}`,
    priority: 'low'
  });

  res.json({ success: true, predictions });
};

// @desc    Get AI business insights
// @route   GET /api/ai/insights
const getInsights = async (req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [recentPayments, plansByDuration, customerGrowth] = await Promise.all([
    Payment.find({
      status: 'paid',
      paidDate: { $gte: thirtyDaysAgo }
    }).countDocuments(),
    InstallmentPlan.aggregate([
      {
        $group: {
          _id: {
            $cond: [
              { $gte: ['$durationMonths', 12] }, '12+ months',
              { $cond: [{ $gte: ['$durationMonths', 6] }, '6-11 months', '1-5 months'] }
            ]
          },
          count: { $sum: 1 },
          totalProfit: { $sum: '$profit' }
        }
      }
    ]),
    Customer.countDocuments({ createdAt: { $gte: thirtyDaysAgo } })
  ]);

  const insights = [
    {
      category: 'Collections',
      value: recentPayments,
      label: 'Payments collected this month',
      trend: 'up',
      icon: '💳'
    },
    {
      category: 'Growth',
      value: customerGrowth,
      label: 'New customers this month',
      trend: customerGrowth > 5 ? 'up' : 'down',
      icon: '👥'
    }
  ];

  res.json({ success: true, insights, plansByDuration });
};

module.exports = { chat, getPredictions, getInsights };
