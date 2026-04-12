/**
 * Frontend EMI calculation utility (mirrors backend logic)
 * Used for instant offline calculations without API calls
 */

export const getInterestRate = (months) => {
  if (months >= 12) return 40;
  if (months >= 9)  return 30;
  if (months >= 6)  return 20;
  if (months >= 3)  return 10;
  return 5;
};

export const calculateEMI = (basePrice, advancePayment = 0, durationMonths) => {
  if (!basePrice || !durationMonths) return null;

  const interestRate    = getInterestRate(Number(durationMonths));
  const remainingAmount = Number(basePrice) - Number(advancePayment);
  const interestAmount  = (remainingAmount * interestRate) / 100;
  const totalAmount     = remainingAmount + interestAmount;
  const monthlyEmi      = Math.ceil(totalAmount / Number(durationMonths));

  return {
    basePrice:       Number(basePrice),
    advancePayment:  Number(advancePayment),
    remainingAmount,
    interestRate,
    interestAmount:  Math.round(interestAmount),
    totalAmount:     Math.round(totalAmount),
    monthlyEmi,
    durationMonths:  Number(durationMonths),
  };
};

export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return 'PKR 0';
  return `PKR ${Number(amount).toLocaleString('en-PK')}`;
};

export const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-PK', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
};

export const timeAgo = (date) => {
  const diff = Date.now() - new Date(date);
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export const getStatusBadge = (status) => ({
  active:     'badge-success',
  completed:  'badge-info',
  defaulted:  'badge-danger',
  cancelled:  'badge-default',
  paid:       'badge-success',
  pending:    'badge-warning',
  overdue:    'badge-danger',
  partial:    'badge-info',
  waived:     'badge-default',
}[status] || 'badge-default');

export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};
