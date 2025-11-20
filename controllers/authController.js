const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ✅ Fixed credentials
const FIXED_USERS = [
  { email: 'jayakhileshgupta1@gmail.com', password: 'venuepass123', role: 'venue_coordinator' },
  { email: 'dean@campus.com', password: 'deanpass123', role: 'dean' },
  { email: 'director@campus.com', password: 'directorpass123', role: 'director' }
];

exports.login = async (req, res) => {
  console.log("💥 Login hit with body:", req.body);

  const { email, password } = req.body;

  try {
    // ✅ First check fixed users
    const fixedUser = FIXED_USERS.find(user => user.email === email && user.password === password);
    if (fixedUser) {
      console.log(`✅ Fixed login success: ${fixedUser.email}`);
      
      // 🔑 Use a dummy ID for token compatibility
      const token = jwt.sign(
        { id: `fixed-${fixedUser.role}`, email: fixedUser.email, role: fixedUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      return res.json({
        token,
        user: {
          id: `fixed-${fixedUser.role}`,
          name: fixedUser.role.charAt(0).toUpperCase() + fixedUser.role.slice(1),
          email: fixedUser.email,
          role: fixedUser.role
        }
      });
    }

    // 🔍 Otherwise, look in MongoDB
    const user = await User.findOne({ email });
    if (!user) {
      console.log("❌ No user found for email:", email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("❌ Password mismatch for user:", email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        email: user.email,
        clubName: user.clubName || null,
        department: user.department 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    console.log("✅ Login success:", user.email);
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
        clubName: user.clubName || null,
        department: user.department
      }
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ message: 'Server error' });
  }
};
