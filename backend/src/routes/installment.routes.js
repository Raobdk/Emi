const express = require('express');
const router = express.Router();
const {
  createInstallmentPlan, getInstallmentPlans, getInstallmentPlan,
  updateInstallmentPlan, deleteInstallmentPlan, cancelInstallmentPlan,
  calculateEmi, getDashboardStats
} = require('../controllers/installment.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/dashboard', getDashboardStats);
router.post('/calculate', calculateEmi);

router.route('/')
  .get(getInstallmentPlans)
  .post(createInstallmentPlan);

router.patch('/:id/cancel', cancelInstallmentPlan);

router.route('/:id')
  .get(getInstallmentPlan)
  .put(updateInstallmentPlan)
  .delete(authorize('admin'), deleteInstallmentPlan);

module.exports = router;
