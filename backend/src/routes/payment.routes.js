const express = require('express');
const router = express.Router();
const {
  recordPayment, getPlanPayments, getOverduePayments,
  getCustomerPayments, downloadReceipt, waivePayment
} = require('../controllers/payment.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/overdue', getOverduePayments);
router.get('/plan/:planId', getPlanPayments);
router.get('/customer/:customerId', getCustomerPayments);
router.get('/:paymentId/receipt', downloadReceipt);
router.post('/:paymentId/record', recordPayment);
router.patch('/:paymentId/waive', authorize('admin'), waivePayment);

module.exports = router;
