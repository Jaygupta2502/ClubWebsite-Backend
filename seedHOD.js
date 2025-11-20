
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const hashedPassword = await bcrypt.hash('hodpass123', 10);

  const existing = await User.findOne({ email: 'hod@campus.com' });
  if (existing) {
    console.log('❗ HOD already exists');
    return process.exit();
  }

  const hod = new User({
    name: 'Head of Department',
    email: 'hod@campus.com',
    password: hashedPassword,
    role: 'hod'
  });

  await hod.save();
  console.log('✅ HOD account created');
  process.exit();
});
