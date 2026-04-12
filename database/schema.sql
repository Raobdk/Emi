// Collections Structure

// 1. users
{
  _id: ObjectId,
  name: String,
  email: String,
  password: String (hashed),
  googleId: String,
  role: String (admin/staff),
  avatar: String,
  phone: String,
  isActive: Boolean,
  lastLogin: Date,
  refreshToken: String,
  notificationPreferences: {
    emailNotifications: Boolean,
    pushNotifications: Boolean,
    paymentReminders: Boolean
  },
  createdAt: Date,
  updatedAt: Date
}

// 2. customers
{
  _id: ObjectId,
  customerId: String (unique),
  name: String,
  cnic: String (unique),
  phone: String,
  email: String,
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  occupation: String,
  monthlyIncome: Number,
  reference: {
    name: String,
    phone: String,
    relation: String
  },
  documents: [{
    type: String,
    url: String,
    uploadedAt: Date
  }],
  status: String (active/inactive/blacklisted),
  createdBy: ObjectId (ref: users),
  notes: [{
    content: String,
    addedBy: ObjectId,
    addedAt: Date
  }],
  totalInvested: Number,
  totalProfit: Number,
  paymentScore: Number,
  createdAt: Date,
  updatedAt: Date
}

// 3. installment_plans
{
  _id: ObjectId,
  planId: String (unique),
  customerId: ObjectId (ref: customers),
  productDetails: {
    name: String,
    description: String,
    category: String,
    brand: String,
    model: String
  },
  financialDetails: {
    basePrice: Number,
    advancePayment: Number,
    remainingAmount: Number,
    interestRate: Number,
    interestAmount: Number,
    totalAmount: Number,
    monthlyEMI: Number,
    duration: Number
  },
  paymentSchedule: [{
    installmentNumber: Number,
    dueDate: Date,
    amount: Number,
    status: String (pending/paid/overdue/partial),
    paidAmount: Number,
    paidDate: Date,
    lateFee: Number,
    paymentMethod: String,
    transactionId: String,
    receiptUrl: String
  }],
  status: String (active/completed/defaulted/cancelled),
  startDate: Date,
  endDate: Date,
  completedDate: Date,
  createdBy: ObjectId (ref: users),
  approvedBy: ObjectId (ref: users),
  terms: {
    lateFeePercentage: Number,
    gracePeriodDays: Number,
    earlySettlementDiscount: Number
  },
  notes: String,
  createdAt: Date,
  updatedAt: Date
}

// 4. payments
{
  _id: ObjectId,
  paymentId: String (unique),
  planId: ObjectId (ref: installment_plans),
  customerId: ObjectId (ref: customers),
  installmentNumber: Number,
  amount: Number,
  lateFee: Number,
  totalAmount: Number,
  paymentMethod: String (cash/bank_transfer/online),
  transactionId: String,
  paymentDate: Date,
  receivedBy: ObjectId (ref: users),
  receiptNumber: String,
  receiptUrl: String,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}

// 5. notifications
{
  _id: ObjectId,
  userId: ObjectId (ref: users),
  type: String (payment_due/payment_received/payment_overdue/plan_created),
  title: String,
  message: String,
  data: Object,
  read: Boolean,
  readAt: Date,
  createdAt: Date
}

// 6. reports
{
  _id: ObjectId,
  reportId: String (unique),
  type: String (daily/weekly/monthly/yearly/custom),
  startDate: Date,
  endDate: Date,
  data: {
    totalIncome: Number,
    totalProfit: Number,
    totalLoss: Number,
    newCustomers: Number,
    activePlans: Number,
    completedPlans: Number,
    defaultedPlans: Number,
    collectionEfficiency: Number
  },
  generatedBy: ObjectId (ref: users),
  format: String (pdf/excel),
  fileUrl: String,
  createdAt: Date
}

// 7. ai_insights
{
  _id: ObjectId,
  type: String (prediction/recommendation/alert),
  category: String (payment/customer/revenue/risk),
  title: String,
  description: String,
  confidence: Number,
  data: Object,
  actionable: Boolean,
  actionTaken: Boolean,
  createdAt: Date,
  expiresAt: Date
}

// 8. audit_logs
{
  _id: ObjectId,
  userId: ObjectId (ref: users),
  action: String,
  entityType: String,
  entityId: ObjectId,
  changes: Object,
  ipAddress: String,
  userAgent: String,
  createdAt: Date
}