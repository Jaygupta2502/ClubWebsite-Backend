const User = require('../models/User');
const bcrypt = require('bcryptjs');

exports.createClubUser = async (req, res) => {
  const { name, email, password, clubName, } = req.body;
  const department = req.user.department;
const hodName = req.user.name;

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashed,
      role: 'club_president',
      clubName,
      department,
      hodName // ✅ include here
    });

    await newUser.save();
    res.status(201).json({ message: 'Club user created', user: newUser });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};


exports.createFacultyUser = async (req, res) => {
  const { name, email, password, specialization, experience,clubAssigned } = req.body;
  const department = req.user.department;

  console.log("📥 Faculty creation request body:", req.body); // 🔍 Log received body

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      console.log("⚠️ Faculty email already exists:", email);
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashed,
      role: 'faculty',
      department,
      specialization,
      experience,
      clubAssigned,
    });

    await newUser.save();
    console.log("✅ Faculty user saved:", newUser.email); // 🔥 Log success

    res.status(201).json({ message: 'Faculty user created', user: newUser });
  } catch (err) {
    console.error("❌ Faculty creation error:", err);
    res.status(500).json({ message: 'Server error' });
  }
};
