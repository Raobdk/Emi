const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send generic email
const sendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    logger.warn('Email credentials not configured. Skipping email.');
    return false;
  }

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"EMI System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text
    });
    logger.info(`Email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error(`Email failed: ${error.message}`);
    return false;
  }
};

// Send payment reminder email
const sendPaymentReminder = async (customer, payment, plan) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 30px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #6366f1, #4f46e5); padding: 32px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 24px; }
        .body { padding: 32px; }
        .amount-box { background: #f0f4ff; border: 2px solid #6366f1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
        .amount-box h2 { color: #6366f1; font-size: 36px; margin: 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #888; font-size: 12px; }
        .btn { display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px; }
      </style>
    </head>
    <body>
    <div class="container">
      <div class="header">
        <h1>💳 Payment Reminder</h1>
        <p>EMI Management System</p>
      </div>
      <div class="body">
        <p>Dear <strong>${customer.name}</strong>,</p>
        <p>This is a friendly reminder that your installment payment is due soon.</p>
        <div class="amount-box">
          <p style="margin:0;color:#666">Amount Due</p>
          <h2>PKR ${payment.amount?.toLocaleString()}</h2>
          <p style="margin:0;color:#ef4444">Due: ${new Date(payment.dueDate).toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div class="detail-row">
          <span>Customer ID</span><strong>${customer.customerId}</strong>
        </div>
        <div class="detail-row">
          <span>Product</span><strong>${plan.productName}</strong>
        </div>
        <div class="detail-row">
          <span>Plan ID</span><strong>${plan.planId}</strong>
        </div>
        <div class="detail-row">
          <span>Month</span><strong>${payment.monthNumber} of ${plan.durationMonths}</strong>
        </div>
        <br/>
        <p style="color:#888;font-size:13px">Please ensure payment is made before the due date to avoid late fees.</p>
        <p style="color:#888;font-size:13px">For any queries, contact us immediately.</p>
      </div>
      <div class="footer">
        <p>EMI Management System &bull; Your trusted financial partner</p>
        <p>This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: customer.email,
    subject: `⏰ Payment Reminder - PKR ${payment.amount?.toLocaleString()} due on ${new Date(payment.dueDate).toLocaleDateString('en-PK')}`,
    html
  });
};

// Send payment receipt email
const sendPaymentConfirmation = async (customer, payment, plan) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 30px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #22c55e, #16a34a); padding: 32px; text-align: center; color: white; }
        .body { padding: 32px; }
        .success-box { background: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #888; font-size: 12px; }
      </style>
    </head>
    <body>
    <div class="container">
      <div class="header">
        <h1>✅ Payment Confirmed!</h1>
        <p>EMI Management System</p>
      </div>
      <div class="body">
        <p>Dear <strong>${customer.name}</strong>,</p>
        <p>Your payment has been successfully received. Thank you!</p>
        <div class="success-box">
          <p style="margin:0;color:#16a34a;font-size:14px">Amount Paid</p>
          <h2 style="color:#16a34a;font-size:36px;margin:8px 0">PKR ${payment.amountPaid?.toLocaleString()}</h2>
          <p style="margin:0;color:#666">${new Date(payment.paidDate || Date.now()).toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div class="detail-row"><span>Receipt ID</span><strong>${payment.paymentId}</strong></div>
        <div class="detail-row"><span>Plan</span><strong>${plan.planId}</strong></div>
        <div class="detail-row"><span>Month</span><strong>${payment.monthNumber}</strong></div>
        <div class="detail-row"><span>Method</span><strong>${payment.paymentMethod?.replace('_', ' ').toUpperCase()}</strong></div>
        <br/>
        <p style="color:#888;font-size:13px">A PDF receipt has been generated in our system. Contact us to get a copy.</p>
      </div>
      <div class="footer">
        <p>EMI Management System &bull; Your trusted financial partner</p>
      </div>
    </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: customer.email,
    subject: `✅ Payment Confirmed - PKR ${payment.amountPaid?.toLocaleString()} - Receipt #${payment.paymentId}`,
    html
  });
};

module.exports = { sendEmail, sendPaymentReminder, sendPaymentConfirmation };
