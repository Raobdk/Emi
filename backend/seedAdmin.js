const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emi_system');
        console.log('DB Connected');

        const existing = await User.findOne({ email: 'admin@emi.com' });
        if (existing) {
            console.log('Admin already exists! email: admin@emi.com, password: admin123 (or whatever you set)');
            process.exit(0);
        }

        const admin = new User({
            name: 'Admin User',
            email: 'admin@emi.com',
            password: 'admin123',
            role: 'admin',
            phone: '1234567890'
        });

        await admin.save();
        console.log('Admin seeded successfully! Login with admin@emi.com / admin123');
        process.exit(0);

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

seed();
