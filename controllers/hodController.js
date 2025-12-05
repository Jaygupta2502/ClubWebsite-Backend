const User = require('../models/User');
const bcrypt = require('bcryptjs');
const HodProfile = require('../models/HodProfile');

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



// GET /api/hod/profile
exports.getHodProfile = async (req, res) => {
  try {
    // Only HOD should hit this
    if (req.user.role !== 'hod') {
      return res.status(403).json({ message: 'Access denied: not HOD' });
    }

    const user = await User.findById(req.user.id).select('name email role');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let hodProfile = await HodProfile.findOne({ userId: req.user.id });

    // If first time, create empty profile
    if (!hodProfile) {
      hodProfile = await HodProfile.create({ userId: req.user.id });
    }

    res.json({
      name: user.name,
      email: user.email,
      department: hodProfile.department || '',
      designation: hodProfile.designation || '',
      specialization: hodProfile.specialization || '',
      experience: hodProfile.experience || '',
      phone: hodProfile.phone || '',
      office: hodProfile.office || '',
      qualification: hodProfile.qualification || '',
      facultyCount: hodProfile.facultyCount || '',
      studentCount: hodProfile.studentCount || '',
      clubsInDept: hodProfile.clubsInDept || '',
      departmentBudget: hodProfile.departmentBudget || '',
    });
  } catch (err) {
    console.error('getHodProfile error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/hod/profile
exports.updateHodProfile = async (req, res) => {
  try {
    if (req.user.role !== 'hod') {
      return res.status(403).json({ message: 'Access denied: not HOD' });
    }

    const {
      name,
      email,
      department,
      designation,
      specialization,
      experience,
      phone,
      office,
      qualification,
      facultyCount,
      studentCount,
      clubsInDept,
      departmentBudget,
    } = req.body;

    // Update identity fields in User (name, email)
    await User.updateOne(
      { _id: req.user.id },
      {
        $set: {
          name,
          email,
        },
      }
    );

    // Update HOD-specific fields in HodProfile
    await HodProfile.updateOne(
      { userId: req.user.id },
      {
        $set: {
          department,
          designation,
          specialization,
          experience,
          phone,
          office,
          qualification,
          facultyCount: facultyCount || null,
          studentCount: studentCount || null,
          clubsInDept: clubsInDept || null,
          departmentBudget: departmentBudget || null,
        },
      },
      { upsert: true }
    );

    res.json({ message: 'HOD profile updated successfully' });
  } catch (err) {
    console.error('updateHodProfile error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/hod/password
exports.updateHodPassword = async (req, res) => {
  try {
    if (req.user.role !== 'hod') {
      return res.status(403).json({ message: 'Access denied: not HOD' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both current and new password are required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('updateHodPassword error', err);
    res.status(500).json({ message: 'Server error' });
  }
};
