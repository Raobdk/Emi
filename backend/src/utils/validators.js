const Joi = require('joi');

// Auth validators
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'any.required': 'Password is required'
  })
});

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('admin', 'staff').default('staff'),
  phone: Joi.string().optional()
});

// Customer validators
const customerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  cnic: Joi.string().pattern(/^\d{5}-\d{7}-\d{1}$/).required().messages({
    'string.pattern.base': 'CNIC must be in format XXXXX-XXXXXXX-X'
  }),
  phone: Joi.string().required(),
  email: Joi.string().email().optional().allow(''),
  address: Joi.object({
    street: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    postalCode: Joi.string().optional(),
    country: Joi.string().default('Pakistan')
  }).optional(),
  occupation: Joi.string().optional(),
  monthlyIncome: Joi.number().min(0).optional(),
  reference: Joi.object({
    name: Joi.string().optional(),
    phone: Joi.string().optional(),
    relation: Joi.string().optional()
  }).optional()
});

// Installment plan validators
const installmentPlanSchema = Joi.object({
  customerId: Joi.string().required(),
  productName: Joi.string().required(),
  productDescription: Joi.string().optional().allow(''),
  basePrice: Joi.number().positive().required().messages({
    'number.positive': 'Base price must be a positive number'
  }),
  advancePayment: Joi.number().min(0).required(),
  durationMonths: Joi.number().integer().min(1).max(60).required(),
  startDate: Joi.date().optional(),
  notes: Joi.string().optional().allow('')
});

// Payment validators
const paymentSchema = Joi.object({
  amountPaid: Joi.number().positive().required(),
  paymentMethod: Joi.string().valid('cash', 'bank_transfer', 'cheque', 'online', 'other').default('cash'),
  paidDate: Joi.date().optional(),
  notes: Joi.string().optional().allow(''),
  lateFee: Joi.number().min(0).default(0)
});

// Validate middleware factory
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    const errors = error.details.map(d => d.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  req.body = value;
  next();
};

module.exports = {
  validate,
  loginSchema,
  registerSchema,
  customerSchema,
  installmentPlanSchema,
  paymentSchema
};
