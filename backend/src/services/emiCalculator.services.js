/**
 * EMI Calculator Service
 * Core business logic for interest and EMI calculations
 */

// Interest rate table based on duration
const INTEREST_TABLE = [
  { minMonths: 12, rate: 40 },
  { minMonths: 9,  rate: 30 },
  { minMonths: 6,  rate: 20 },
  { minMonths: 3,  rate: 10 },
  { minMonths: 1,  rate: 5  },
];

/**
 * Get interest rate based on duration
 * @param {number} months
 * @returns {number} interest rate percentage
 */
const getInterestRate = (months) => {
  for (const entry of INTEREST_TABLE) {
    if (months >= entry.minMonths) return entry.rate;
  }
  return 5;
};

/**
 * Full EMI calculation
 * @param {number} basePrice
 * @param {number} advancePayment
 * @param {number} durationMonths
 * @returns {Object} complete calculation breakdown
 */
const calculateEMI = (basePrice, advancePayment = 0, durationMonths) => {
  if (!basePrice || !durationMonths) {
    throw new Error('basePrice and durationMonths are required');
  }

  const interestRate = getInterestRate(durationMonths);
  const remainingAmount = basePrice - advancePayment;
  const interestAmount = (remainingAmount * interestRate) / 100;
  const totalAmount = remainingAmount + interestAmount;
  const monthlyEmi = Math.ceil(totalAmount / durationMonths);

  return {
    basePrice,
    advancePayment,
    remainingAmount,
    interestRate,
    interestAmount: Math.round(interestAmount),
    totalAmount: Math.round(totalAmount),
    monthlyEmi,
    durationMonths,
    totalProfitIfFullyPaid: Math.round(interestAmount),
  };
};

/**
 * Generate payment schedule array
 * @param {Object} plan - the installment plan
 * @returns {Array} array of payment objects
 */
const generatePaymentSchedule = (plan) => {
  const schedule = [];
  const startDate = new Date(plan.startDate || Date.now());

  for (let i = 1; i <= plan.durationMonths; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    schedule.push({
      monthNumber: i,
      dueDate,
      amount: plan.monthlyEmi,
      status: 'pending',
      installmentPlanId: plan._id,
      customerId: plan.customerId,
    });
  }

  return schedule;
};

/**
 * Calculate profit/loss summary for a plan
 */
const getPlanProfitSummary = (plan) => {
  const collected = plan.totalPaid || 0;
  const interest = plan.interestAmount || 0;
  const advance = plan.advancePayment || 0;
  const total = plan.totalAmount || 0;

  return {
    totalCollected: collected + advance,
    netProfit: collected > plan.remainingAmount
      ? collected - plan.remainingAmount
      : 0,
    profitMargin: total > 0 ? ((interest / total) * 100).toFixed(1) : 0,
    collectionRate: total > 0 ? ((collected / total) * 100).toFixed(1) : 0,
  };
};

/**
 * Compare two EMI scenarios
 */
const compareScenarios = (basePrice, advance, months1, months2) => {
  const s1 = calculateEMI(basePrice, advance, months1);
  const s2 = calculateEMI(basePrice, advance, months2);

  return {
    scenario1: { ...s1, label: `${months1} Months` },
    scenario2: { ...s2, label: `${months2} Months` },
    profitDifference: s2.interestAmount - s1.interestAmount,
    emiDifference: s1.monthlyEmi - s2.monthlyEmi,
  };
};

module.exports = {
  calculateEMI,
  getInterestRate,
  generatePaymentSchedule,
  getPlanProfitSummary,
  compareScenarios,
  INTEREST_TABLE,
};
