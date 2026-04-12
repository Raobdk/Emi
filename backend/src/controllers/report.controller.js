const InstallmentPlan = require('../models/InstallmentPlan');
const Payment = require('../models/Payment');
const Customer = require('../models/Customers');
const excelService = require('../services/excleGenrator.services');
const { getDateRange } = require('../utils/helpers');
const logger = require('../utils/logger');

// @desc    Get financial overview report
// @route   GET /api/reports/overview
const getOverviewReport = async (req, res) => {
  const { period = 'month' } = req.query;
  const { startDate, endDate } = getDateRange(period);

  const [
    totalInvestment,
    totalProfit,
    monthlyIncome,
    installmentStats,
    paymentStats
  ] = await Promise.all([
    InstallmentPlan.aggregate([
      { $group: { _id: null, total: { $sum: '$basePrice' } } }
    ]),
    InstallmentPlan.aggregate([
      { $group: { _id: null, total: { $sum: '$profit' } } }
    ]),
    Payment.aggregate([
      {
        $match: {
          status: 'paid',
          paidDate: { $gte: startDate, $lte: endDate }
        }
      },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } }
    ]),
    InstallmentPlan.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]),
    Payment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ])
  ]);

  res.json({
    success: true,
    report: {
      period,
      totalInvestment: totalInvestment[0]?.total || 0,
      totalProfit: totalProfit[0]?.total || 0,
      monthlyIncome: monthlyIncome[0]?.total || 0,
      installmentStats,
      paymentStats
    }
  });
};

// @desc    Get monthly chart data
// @route   GET /api/reports/monthly-chart
const getMonthlyChart = async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;

  const chartData = await Payment.aggregate([
    {
      $match: {
        status: 'paid',
        paidDate: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$paidDate' },
        totalCollected: { $sum: '$amountPaid' },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id': 1 } }
  ]);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const formattedData = months.map((month, idx) => {
    const found = chartData.find(d => d._id === idx + 1);
    return {
      month,
      collected: found?.totalCollected || 0,
      count: found?.count || 0
    };
  });

  res.json({ success: true, chartData: formattedData });
};

// @desc    Get payment status distribution
// @route   GET /api/reports/payment-distribution
const getPaymentDistribution = async (req, res) => {
  const data = await Payment.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);

  res.json({ success: true, distribution: data });
};

// @desc    Get top customers by investment
// @route   GET /api/reports/top-customers
const getTopCustomers = async (req, res) => {
  const customers = await InstallmentPlan.aggregate([
    { $match: { status: { $in: ['active', 'completed'] } } },
    {
      $group: {
        _id: '$customerId',
        totalInvested: { $sum: '$basePrice' },
        totalPaid: { $sum: '$totalPaid' },
        plans: { $sum: 1 }
      }
    },
    { $sort: { totalInvested: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'customers',
        localField: '_id',
        foreignField: '_id',
        as: 'customer'
      }
    },
    { $unwind: '$customer' },
    {
      $project: {
        name: '$customer.name',
        customerId: '$customer.customerId',
        phone: '$customer.phone',
        totalInvested: 1,
        totalPaid: 1,
        plans: 1
      }
    }
  ]);

  res.json({ success: true, customers });
};

// @desc    Export to Excel
// @route   GET /api/reports/export/excel
const exportToExcel = async (req, res) => {
  const { type = 'installments', period = 'month' } = req.query;
  const { startDate, endDate } = getDateRange(period);

  try {
    let data, filename;

    if (type === 'installments') {
      data = await InstallmentPlan.find({
        createdAt: { $gte: startDate, $lte: endDate }
      }).populate('customerId', 'name customerId phone cnic');
      filename = `installments_report_${Date.now()}.xlsx`;
    } else if (type === 'payments') {
      data = await Payment.find({
        createdAt: { $gte: startDate, $lte: endDate }
      }).populate('customerId', 'name customerId')
        .populate('installmentPlanId', 'planId productName');
      filename = `payments_report_${Date.now()}.xlsx`;
    } else {
      data = await Customer.find().populate('createdBy', 'name');
      filename = `customers_report_${Date.now()}.xlsx`;
    }

    const buffer = await excelService.generateExcelReport(type, data);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(buffer);
  } catch (err) {
    logger.error(`Excel export failed: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to generate Excel report' });
  }
};

module.exports = {
  getOverviewReport,
  getMonthlyChart,
  getPaymentDistribution,
  getTopCustomers,
  exportToExcel
};
