const Customer = require('../models/Customers');
const InstallmentPlan = require('../models/InstallmentPlan');
const Payment = require('../models/Payment');
const { getPagination, paginatedResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

// @desc    Create customer
// @route   POST /api/customers
const createCustomer = async (req, res) => {
  req.body.createdBy = req.user._id;
  const customer = await Customer.create(req.body);

  logger.info(`Customer created: ${customer.customerId} by ${req.user.email}`);

  const io = req.app.get('io');
  if (io) {
    io.emit('customer_added', customer);
    io.emit('notification', { message: `New customer registered: ${customer.name}`, icon: '👤' });
  }

  res.status(201).json({
    success: true,
    message: 'Customer created successfully',
    customer
  });
};

// @desc    Get all customers
// @route   GET /api/customers
const getCustomers = async (req, res) => {
  const { page = 1, limit = 10, search, status } = req.query;
  const { skip } = getPagination(page, limit);

  const query = {};
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { cnic: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { customerId: { $regex: search, $options: 'i' } }
    ];
  }

  const [customers, total] = await Promise.all([
    Customer.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Customer.countDocuments(query)
  ]);

  res.json({
    success: true,
    ...paginatedResponse(customers, total, page, limit)
  });
};

// @desc    Get single customer with full profile
// @route   GET /api/customers/:id
const getCustomer = async (req, res) => {
  const customer = await Customer.findById(req.params.id)
    .populate('createdBy', 'name email');

  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  // Get related installment plans and stats
  const plans = await InstallmentPlan.find({ customerId: customer._id })
    .sort({ createdAt: -1 });

  const stats = {
    totalPlans: plans.length,
    activePlans: plans.filter(p => p.status === 'active').length,
    completedPlans: plans.filter(p => p.status === 'completed').length,
    totalInvested: plans.reduce((sum, p) => sum + (p.basePrice || 0), 0),
    totalPaid: plans.reduce((sum, p) => sum + (p.totalPaid || 0), 0),
    totalRemaining: plans.reduce((sum, p) => sum + (p.totalRemaining || 0), 0)
  };

  res.json({ success: true, customer, installmentPlans: plans, stats });
};

// @desc    Update customer
// @route   PUT /api/customers/:id
const updateCustomer = async (req, res) => {
  const customer = await Customer.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  res.json({ success: true, message: 'Customer updated successfully', customer });
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
const deleteCustomer = async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  const activePlans = await InstallmentPlan.countDocuments({
    customerId: customer._id, status: 'active'
  });

  if (activePlans > 0) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete customer with active installment plans'
    });
  }

  await customer.deleteOne();
  res.json({ success: true, message: 'Customer deleted successfully' });
};

// @desc    Add note to customer
// @route   POST /api/customers/:id/notes
const addNote = async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  customer.notes.push({
    content: req.body.content,
    addedBy: req.user._id
  });

  await customer.save();
  await customer.populate('notes.addedBy', 'name');

  res.json({ success: true, message: 'Note added', notes: customer.notes });
};

// @desc    Get customer stats summary
// @route   GET /api/customers/stats
const getCustomerStats = async (req, res) => {
  const [total, active, inactive, blacklisted] = await Promise.all([
    Customer.countDocuments(),
    Customer.countDocuments({ status: 'active' }),
    Customer.countDocuments({ status: 'inactive' }),
    Customer.countDocuments({ status: 'blacklisted' })
  ]);

  res.json({ success: true, stats: { total, active, inactive, blacklisted } });
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  addNote,
  getCustomerStats
};
