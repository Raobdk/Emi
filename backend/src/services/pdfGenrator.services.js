const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const Payment = require('../models/Payment');
const logger = require('../utils/logger');

// Ensure receipts dir exists
const RECEIPTS_DIR = path.join(process.cwd(), 'receipts');
if (!fs.existsSync(RECEIPTS_DIR)) fs.mkdirSync(RECEIPTS_DIR, { recursive: true });

// Generate receipt and save to file, return URL
const generateReceipt = async (paymentId) => {
  const payment = await Payment.findById(paymentId)
    .populate('customerId', 'name cnic phone customerId')
    .populate('installmentPlanId', 'planId productName monthlyEmi totalAmount durationMonths')
    .populate('collectedBy', 'name');

  if (!payment) throw new Error('Payment not found');

  return new Promise((resolve, reject) => {
    const filename = `receipt-${payment.paymentId}-${Date.now()}.pdf`;
    const filepath = path.join(RECEIPTS_DIR, filename);
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filepath);

    doc.pipe(stream);
    buildReceiptPDF(doc, payment);
    doc.end();

    stream.on('finish', () => resolve(`/receipts/${filename}`));
    stream.on('error', reject);
  });
};

// Generate receipt as buffer (for download)
const generateReceiptBuffer = (payment) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    buildReceiptPDF(doc, payment);
    doc.end();
  });
};

const buildReceiptPDF = (doc, payment) => {
  const customer = payment.customerId || {};
  const plan = payment.installmentPlanId || {};

  // Header
  doc.rect(0, 0, doc.page.width, 120).fill('#1a1a2e');
  doc.fillColor('#ffffff')
    .fontSize(28)
    .font('Helvetica-Bold')
    .text('EMI SYSTEM', 50, 30);

  doc.fontSize(12)
    .font('Helvetica')
    .text('Payment Receipt', 50, 65);

  doc.fontSize(10)
    .text(`Receipt #: ${payment.paymentId}`, 350, 30, { align: 'right' })
    .text(`Date: ${new Date(payment.paidDate || Date.now()).toLocaleDateString('en-PK')}`, { align: 'right' });

  doc.moveDown(4);

  // Status badge
  const statusColor = payment.status === 'paid' ? '#16a34a' : '#dc2626';
  doc.roundedRect(50, 130, 120, 28, 5).fill(statusColor);
  doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold')
    .text(payment.status.toUpperCase(), 55, 138);

  doc.fillColor('#1a1a2e');

  // Customer Info Section
  doc.roundedRect(50, 175, doc.page.width - 100, 120, 8).stroke('#e5e7eb');

  doc.fontSize(11).font('Helvetica-Bold').fillColor('#374151')
    .text('CUSTOMER INFORMATION', 70, 190);

  doc.fontSize(10).font('Helvetica').fillColor('#6b7280');
  const cLeft = 70, cRight = 320;

  doc.fillColor('#374151').text('Name:', cLeft, 215).text('CNIC:', cLeft, 235).text('Phone:', cLeft, 255);
  doc.fillColor('#1a1a2e')
    .text(customer.name || 'N/A', cLeft + 80, 215)
    .text(customer.cnic || 'N/A', cLeft + 80, 235)
    .text(customer.phone || 'N/A', cLeft + 80, 255);

  doc.fillColor('#374151').text('Customer ID:', cRight, 215).text('Plan ID:', cRight, 235);
  doc.fillColor('#1a1a2e')
    .text(customer.customerId || 'N/A', cRight + 90, 215)
    .text(plan.planId || 'N/A', cRight + 90, 235);

  // Payment Details Section
  doc.roundedRect(50, 310, doc.page.width - 100, 160, 8).stroke('#e5e7eb');
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#374151')
    .text('PAYMENT DETAILS', 70, 325);

  const rows = [
    ['Product / Item', plan.productName || 'N/A'],
    ['Month Number', `Month ${payment.monthNumber} of ${plan.durationMonths || 'N/A'}`],
    ['Due Amount', `PKR ${payment.amount?.toLocaleString() || 0}`],
    ['Amount Paid', `PKR ${payment.amountPaid?.toLocaleString() || 0}`],
    ['Late Fee', `PKR ${payment.lateFee?.toLocaleString() || 0}`],
    ['Payment Method', (payment.paymentMethod || 'cash').replace('_', ' ').toUpperCase()]
  ];

  let y = 350;
  rows.forEach(([label, value], i) => {
    const bg = i % 2 === 0 ? '#f9fafb' : '#ffffff';
    doc.rect(55, y - 3, doc.page.width - 110, 20).fill(bg);
    doc.fillColor('#6b7280').fontSize(10).font('Helvetica').text(label, 70, y);
    doc.fillColor('#1a1a2e').font('Helvetica-Bold').text(value, 300, y);
    y += 22;
  });

  // Total
  doc.rect(50, 480, doc.page.width - 100, 40).fill('#1a1a2e');
  doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold')
    .text('TOTAL PAID', 70, 493)
    .text(`PKR ${payment.amountPaid?.toLocaleString() || 0}`, 300, 493);

  // Collected by
  if (payment.collectedBy) {
    doc.fillColor('#6b7280').fontSize(9).font('Helvetica')
      .text(`Collected by: ${payment.collectedBy.name}`, 50, 540);
  }

  // Footer
  doc.rect(0, doc.page.height - 60, doc.page.width, 60).fill('#f3f4f6');
  doc.fillColor('#9ca3af').fontSize(9).font('Helvetica')
    .text('This is a computer-generated receipt and does not require a signature.', 50, doc.page.height - 45, { align: 'center' })
    .text('EMI Management System | Your trusted financial partner', 50, doc.page.height - 30, { align: 'center' });
};

module.exports = { generateReceipt, generateReceiptBuffer };
