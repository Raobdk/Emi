const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  customerId: {
    type: String,
    unique: true,
    required: true
  },
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  cnic: {
    type: String,
    required: [true, 'CNIC is required'],
    unique: true,
    match: [/^\d{5}-\d{7}-\d{1}$/, 'Invalid CNIC format (XXXXX-XXXXXXX-X)']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[0-9+\-\s()]+$/, 'Invalid phone number']
  },
  email: {
    type: String,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email']
  },
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: { type: String, default: 'Pakistan' }
  },
  occupation: String,
  monthlyIncome: Number,
  reference: {
    name: String,
    phone: String,
    relation: String
  },
  documents: [{
    type: { type: String, enum: ['cnic_front', 'cnic_back', 'photo', 'other'] },
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'blacklisted'],
    default: 'active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: [{
    content: String,
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now }
  }],
  totalInvested: { type: Number, default: 0 },
  totalProfit: { type: Number, default: 0 },
  paymentScore: { type: Number, min: 0, max: 100, default: 100 }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for installment plans
customerSchema.virtual('installmentPlans', {
  ref: 'InstallmentPlan',
  localField: '_id',
  foreignField: 'customerId'
});

// Generate unique customer ID before validation
customerSchema.pre('validate', async function (next) {
  if (!this.customerId) {
    const count = await mongoose.model('Customer').countDocuments();
    this.customerId = `CUST${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Customer', customerSchema);