const express = require('express');
const router = express.Router();
const {
  getOverviewReport, getMonthlyChart, getPaymentDistribution,
  getTopCustomers, exportToExcel
} = require('../controllers/report.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/overview', getOverviewReport);
router.get('/monthly-chart', getMonthlyChart);
router.get('/payment-distribution', getPaymentDistribution);
router.get('/top-customers', getTopCustomers);
router.get('/export/excel', exportToExcel);

module.exports = router;
