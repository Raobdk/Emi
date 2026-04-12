const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    unique: true
  },
  installmentPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InstallmentPlan',
    required: [true, 'Installment plan is required']
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  monthNumber: {
    type: Number,
    required: [true, 'Month number is required'],
    min: 1
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  paidDate: Date,
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: 0
  },
  amountPaid: {
    type: Number,
    default: 0
  },
  lateFee: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'partial', 'overdue', 'waived'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'cheque', 'online', 'other'],
    default: 'cash'
  },
  notes: String,
  receiptUrl: String,
  collectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Generate payment ID
paymentSchema.pre('save', async function (next) {
  if (!this.paymentId) {
    const lastPayment = await mongoose.model('Payment').findOne({}, {}, { sort: { 'paymentId': -1 } });
    let nextIdNumber = 1;
    if (lastPayment && lastPayment.paymentId && lastPayment.paymentId.startsWith('PAY')) {
      const lastNum = parseInt(lastPayment.paymentId.replace('PAY', ''), 10);
      if (!isNaN(lastNum)) {
        nextIdNumber = lastNum + 1;
      }
    }
    this.paymentId = `PAY${String(nextIdNumber).padStart(8, '0')}`;
  }

  // Auto mark overdue
  if (this.status === 'pending' && new Date() > this.dueDate) {
    this.status = 'overdue';
  }
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
