const mongoose = require('mongoose');

const installmentPlanSchema = new mongoose.Schema({
  planId: {
    type: String,
    unique: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer is required']
  },
  productName: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  productDescription: {
    type: String,
    trim: true
  },
  basePrice: {
    type: Number,
    required: [true, 'Base price is required'],
    min: [0, 'Base price cannot be negative']
  },
  advancePayment: {
    type: Number,
    required: [true, 'Advance payment is required'],
    default: 0,
    min: [0, 'Advance cannot be negative']
  },
  durationMonths: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be at least 1 month'],
    max: [60, 'Duration cannot exceed 60 months']
  },
  remainingAmount: {
    type: Number  // basePrice - advancePayment
  },
  interestRate: {
    type: Number  // calculated based on duration
  },
  interestAmount: {
    type: Number  // remainingAmount * interestRate / 100
  },
  totalAmount: {
    type: Number  // remainingAmount + interestAmount
  },
  monthlyEmi: {
    type: Number  // totalAmount / durationMonths
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    default: Date.now
  },
  endDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'defaulted', 'cancelled'],
    default: 'active'
  },
  paidMonths: {
    type: Number,
    default: 0
  },
  totalPaid: {
    type: Number,
    default: 0
  },
  totalRemaining: {
    type: Number
  },
  profit: {
    type: Number
  },
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for payments
installmentPlanSchema.virtual('payments', {
  ref: 'Payment',
  localField: '_id',
  foreignField: 'installmentPlanId'
});

// Calculate EMI and related fields before saving
installmentPlanSchema.pre('save', function (next) {
  // Calculate interest rate based on duration
  if (this.durationMonths >= 12) {
    this.interestRate = 40;
  } else if (this.durationMonths >= 10) {
    this.interestRate = 35;
  } else if (this.durationMonths >= 9) {
    this.interestRate = 30;
  } else if (this.durationMonths >= 6) {
    this.interestRate = 20;
  } else if (this.durationMonths >= 3) {
    this.interestRate = 10;
  } else {
    this.interestRate = 5;
  }

  // Calculate amounts
  this.remainingAmount = Math.round(this.basePrice - this.advancePayment);
  this.interestAmount = Math.round((this.remainingAmount * this.interestRate) / 100);
  this.totalAmount = Math.round(this.remainingAmount + this.interestAmount);
  this.monthlyEmi = Math.ceil(this.totalAmount / this.durationMonths);
  this.totalRemaining = Math.max(0, Math.round(this.totalAmount - this.totalPaid));
  this.profit = this.interestAmount;

  // Calculate end date
  if (this.startDate) {
    const end = new Date(this.startDate);
    end.setMonth(end.getMonth() + this.durationMonths);
    this.endDate = end;
  }

  next();
});

// Generate plan ID before saving new doc
installmentPlanSchema.pre('save', async function (next) {
  if (!this.planId) {
    const lastPlan = await mongoose.model('InstallmentPlan').findOne({}, {}, { sort: { 'planId': -1 } });
    let nextIdNumber = 1;
    if (lastPlan && lastPlan.planId && lastPlan.planId.startsWith('PLAN')) {
      const lastNum = parseInt(lastPlan.planId.replace('PLAN', ''), 10);
      if (!isNaN(lastNum)) {
        nextIdNumber = lastNum + 1;
      }
    }
    this.planId = `PLAN${String(nextIdNumber).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('InstallmentPlan', installmentPlanSchema);
