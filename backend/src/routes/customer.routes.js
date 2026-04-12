const express = require('express');
const router = express.Router();
const {
  createCustomer, getCustomers, getCustomer,
  updateCustomer, deleteCustomer, addNote, getCustomerStats
} = require('../controllers/customer.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/stats', getCustomerStats);
router.route('/')
  .get(getCustomers)
  .post(createCustomer);

router.route('/:id')
  .get(getCustomer)
  .put(updateCustomer)
  .delete(authorize('admin'), deleteCustomer);

router.post('/:id/notes', addNote);

module.exports = router;
