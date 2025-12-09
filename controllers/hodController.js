const User = require('../models/User');
const bcrypt = require('bcryptjs');
const Club = require("../models/Club");
const Event = require("../models/Event");

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

// =============================
// HOD Profile Functions
// =============================


/**
 * GET HOD Profile + Dynamic Department Stats
 */
exports.getHodProfile = async (req, res) => {
  try {
    const hod = await User.findById(req.user.id).select("-password");

    if (!hod || hod.role !== "hod") {
      return res.status(404).json({ message: "HOD not found" });
    }

    // Count faculty in department
    const facultyCount = await User.countDocuments({
      department: hod.department,
      role: "faculty",
    });

    // Count clubs in department
    const clubsInDept = await Club.countDocuments({
      department: hod.department,
    });

    // Count approved events in department
    const approvedEvents = await Event.countDocuments({
      department: hod.department,
      status: "fully_approved",
    });

    // Count pending events for HOD review
    const pendingEvents = await Event.countDocuments({
      department: hod.department,
      status: "hod_pending",
    });

    return res.json({
      ...hod.toObject(),
      facultyCount,
      clubsInDept,
      approvedEvents,
      pendingEvents,
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


/**
 * UPDATE HOD Profile (Allowed fields only)
 */
exports.updateHodProfile = async (req, res) => {
  try {
    const allowedFields = [
      "designation",
      "phone",
      "office",
      "facultyCount",
      "studentCount",
      "clubsInDept",
      "departmentBudget",
      "theme"
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const updatedHod = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true }
    ).select("-password");

    return res.json(updatedHod);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


/**
 * CHANGE Password (same as faculty logic)
 */
exports.changeHodPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const hod = await User.findById(req.user.id);
    if (!hod) {
      return res.status(404).json({ message: "HOD not found" });
    }

    const validPassword = await bcrypt.compare(currentPassword, hod.password);
    if (!validPassword) {
      return res.status(400).json({ message: "Incorrect current password" });
    }

    hod.password = await bcrypt.hash(newPassword, 10);
    await hod.save();

    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
