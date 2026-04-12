/**
 * Database Seeder
 * Creates initial admin user and sample data
 * Run: node src/seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/Users');
const Customer = require('./models/Customers');
const InstallmentPlan = require('./models/InstallmentPlan');
const logger = require('./utils/logger');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/emi_system';

const seed = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('✅ Connected to MongoDB');

    // ─── Create Admin User ───────────────────────────────────────
    const existingAdmin = await User.findOne({ email: 'admin@emisystem.com' });
    if (!existingAdmin) {
      await User.create({
        name: 'System Admin',
        email: 'admin@emisystem.com',
        password: 'admin123',
        role: 'admin',
        phone: '+92 300 0000000',
        isActive: true,
      });
      logger.info('✅ Admin user created: admin@emisystem.com / admin123');
    } else {
      logger.info('ℹ️ Admin user already exists');
    }

    // ─── Create Staff User ───────────────────────────────────────
    const existingStaff = await User.findOne({ email: 'staff@emisystem.com' });
    if (!existingStaff) {
      await User.create({
        name: 'John Staff',
        email: 'staff@emisystem.com',
        password: 'staff123',
        role: 'staff',
        phone: '+92 311 1111111',
        isActive: true,
      });
      logger.info('✅ Staff user created: staff@emisystem.com / staff123');
    }

    // ─── Create Sample Customers ─────────────────────────────────
    const admin = await User.findOne({ email: 'admin@emisystem.com' });
    const existingCustomers = await Customer.countDocuments();

    if (existingCustomers === 0) {
      const customers = await Customer.insertMany([
        {
          name: 'Ahmad Raza',
          cnic: '35202-1234567-1',
          phone: '0300-1234567',
          email: 'ahmad.raza@example.com',
          address: { city: 'Lahore', country: 'Pakistan' },
          occupation: 'Teacher',
          monthlyIncome: 45000,
          status: 'active',
          createdBy: admin._id,
          reference: { name: 'Ali Khan', phone: '0301-9876543', relation: 'Brother' },
        },
        {
          name: 'Sara Malik',
          cnic: '35202-7654321-2',
          phone: '0321-7654321',
          email: 'sara.malik@example.com',
          address: { city: 'Karachi', country: 'Pakistan' },
          occupation: 'Nurse',
          monthlyIncome: 55000,
          status: 'active',
          createdBy: admin._id,
        },
        {
          name: 'Hassan Ali',
          cnic: '35202-1111111-3',
          phone: '0333-1111111',
          address: { city: 'Islamabad', country: 'Pakistan' },
          occupation: 'Engineer',
          monthlyIncome: 80000,
          status: 'active',
          createdBy: admin._id,
        },
      ]);

      logger.info(`✅ Created ${customers.length} sample customers`);

      // ─── Create Sample Installment Plans ────────────────────────
      await InstallmentPlan.create({
        customerId: customers[0]._id,
        productName: 'Samsung Galaxy S24',
        productDescription: 'Samsung Flagship Phone',
        basePrice: 120000,
        advancePayment: 20000,
        durationMonths: 12,
        startDate: new Date(Date.now() - 2 * 30 * 24 * 60 * 60 * 1000), // 2 months ago
        createdBy: admin._id,
        status: 'active',
        paidMonths: 2,
        totalPaid: 2 * Math.ceil(((120000 - 20000) * 1.4) / 12),
      });

      await InstallmentPlan.create({
        customerId: customers[1]._id,
        productName: 'Dell Laptop - Core i7',
        basePrice: 85000,
        advancePayment: 15000,
        durationMonths: 6,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 1 month ago
        createdBy: admin._id,
        status: 'active',
        paidMonths: 1,
      });

      logger.info('✅ Sample installment plans created');
    } else {
      logger.info(`ℹ️ ${existingCustomers} customers already exist`);
    }

    logger.info('\n🎉 ═══════════════════════════════════════');
    logger.info('   EMI System seeded successfully!');
    logger.info('═══════════════════════════════════════');
    logger.info('   Admin   → admin@emisystem.com / admin123');
    logger.info('   Staff   → staff@emisystem.com / staff123');
    logger.info('   Backend → http://localhost:5000/api');
    logger.info('═══════════════════════════════════════\n');

  } catch (error) {
    logger.error(`Seed failed: ${error.message}`);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seed();
