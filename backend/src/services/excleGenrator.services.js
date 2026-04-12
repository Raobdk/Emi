const ExcelJS = require('exceljs');

const generateExcelReport = async (type, data) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'EMI Management System';
  workbook.created = new Date();

  if (type === 'installments') {
    await buildInstallmentSheet(workbook, data);
  } else if (type === 'payments') {
    await buildPaymentsSheet(workbook, data);
  } else {
    await buildCustomersSheet(workbook, data);
  }

  return await workbook.xlsx.writeBuffer();
};

const styleHeader = (row) => {
  row.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a1a2e' } };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' }
    };
  });
  row.height = 25;
};

const styleDataRow = (row, isEven) => {
  const bg = isEven ? 'FFF0F4FF' : 'FFFFFFFF';
  row.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = {
      top: { style: 'hair' }, left: { style: 'hair' },
      bottom: { style: 'hair' }, right: { style: 'hair' }
    };
  });
  row.height = 20;
};

const buildInstallmentSheet = async (workbook, plans) => {
  const sheet = workbook.addWorksheet('Installment Plans');

  // Title
  sheet.mergeCells('A1:L1');
  const titleRow = sheet.getRow(1);
  titleRow.getCell(1).value = 'EMI MANAGEMENT SYSTEM - INSTALLMENT PLANS REPORT';
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1a1a2e' } };
  titleRow.getCell(1).alignment = { horizontal: 'center' };
  titleRow.height = 35;

  sheet.mergeCells('A2:L2');
  sheet.getRow(2).getCell(1).value = `Generated on: ${new Date().toLocaleString('en-PK')}`;
  sheet.getRow(2).getCell(1).alignment = { horizontal: 'center' };
  sheet.getRow(2).height = 20;

  // Headers
  const headers = [
    'Plan ID', 'Customer Name', 'Customer ID', 'Product', 'Base Price (PKR)',
    'Advance (PKR)', 'Remaining (PKR)', 'Interest Rate %', 'Interest (PKR)',
    'Total Amount (PKR)', 'Monthly EMI (PKR)', 'Duration (Months)',
    'Paid (PKR)', 'Remaining Balance (PKR)', 'Start Date', 'End Date', 'Status'
  ];

  sheet.columns = headers.map((header, i) => ({
    key: `col${i}`,
    width: [12, 20, 14, 20, 16, 14, 14, 14, 14, 16, 16, 16, 14, 18, 14, 14, 12][i] || 15
  }));

  const headerRow = sheet.addRow(headers);
  styleHeader(headerRow);

  // Data rows
  plans.forEach((plan, i) => {
    const row = sheet.addRow([
      plan.planId,
      plan.customerId?.name || 'N/A',
      plan.customerId?.customerId || 'N/A',
      plan.productName,
      plan.basePrice,
      plan.advancePayment,
      plan.remainingAmount,
      `${plan.interestRate}%`,
      plan.interestAmount,
      plan.totalAmount,
      plan.monthlyEmi,
      plan.durationMonths,
      plan.totalPaid,
      plan.totalRemaining,
      plan.startDate ? new Date(plan.startDate).toLocaleDateString('en-PK') : '',
      plan.endDate ? new Date(plan.endDate).toLocaleDateString('en-PK') : '',
      plan.status?.toUpperCase()
    ]);
    styleDataRow(row, i % 2 === 0);
  });

  // Totals row
  if (plans.length > 0) {
    const totalRow = sheet.addRow([
      'TOTALS', '', '', '',
      { formula: `SUM(E4:E${plans.length + 3})` },
      { formula: `SUM(F4:F${plans.length + 3})` },
      '', '', '',
      { formula: `SUM(J4:J${plans.length + 3})` },
      '', '',
      { formula: `SUM(M4:M${plans.length + 3})` },
      { formula: `SUM(N4:N${plans.length + 3})` }
    ]);
    totalRow.font = { bold: true };
    totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
  }
};

const buildPaymentsSheet = async (workbook, payments) => {
  const sheet = workbook.addWorksheet('Payment History');

  const headers = [
    'Payment ID', 'Customer Name', 'Customer ID', 'Plan ID', 'Product',
    'Month #', 'Due Date', 'Paid Date', 'Due Amount (PKR)', 'Amount Paid (PKR)',
    'Late Fee (PKR)', 'Payment Method', 'Status', 'Collected By'
  ];

  sheet.columns = headers.map(() => ({ width: 18 }));
  const headerRow = sheet.addRow(headers);
  styleHeader(headerRow);

  payments.forEach((p, i) => {
    const row = sheet.addRow([
      p.paymentId, p.customerId?.name, p.customerId?.customerId,
      p.installmentPlanId?.planId, p.installmentPlanId?.productName,
      p.monthNumber,
      p.dueDate ? new Date(p.dueDate).toLocaleDateString('en-PK') : '',
      p.paidDate ? new Date(p.paidDate).toLocaleDateString('en-PK') : '',
      p.amount, p.amountPaid, p.lateFee || 0,
      p.paymentMethod, p.status?.toUpperCase(),
      p.collectedBy?.name || ''
    ]);
    styleDataRow(row, i % 2 === 0);
  });
};

const buildCustomersSheet = async (workbook, customers) => {
  const sheet = workbook.addWorksheet('Customers');

  const headers = [
    'Customer ID', 'Name', 'CNIC', 'Phone', 'Email',
    'City', 'Occupation', 'Status', 'Joined Date'
  ];

  sheet.columns = headers.map(() => ({ width: 20 }));
  const headerRow = sheet.addRow(headers);
  styleHeader(headerRow);

  customers.forEach((c, i) => {
    const row = sheet.addRow([
      c.customerId, c.name, c.cnic, c.phone, c.email || '',
      c.address?.city || '', c.occupation || '', c.status,
      new Date(c.createdAt).toLocaleDateString('en-PK')
    ]);
    styleDataRow(row, i % 2 === 0);
  });
};

module.exports = { generateExcelReport };
