const User = require('../models/User');
const bcrypt = require('bcryptjs');
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
  const { name, email, password, specialization, experience } = req.body;
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


/**
 * GET HOD Profile + Dynamic Stats
 */
exports.getHodProfile = async (req, res) => {
  try {
    // Get HOD user (minus password)
    const hod = await User.findById(req.user.id).select("-password");

    if (!hod || hod.role !== "hod") {
      return res.status(404).json({ message: "HOD not found" });
    }

    // SAFETY: if department is missing, send basic profile
    if (!hod.department) {
      return res.json({
        ...hod.toObject(),
        facultyCount: 0,
        clubsInDept: 0,
        approvedEvents: 0,
        pendingEvents: 0
      });
    }

    // Count faculty in same department
    const facultyCount = await User.countDocuments({
      department: hod.department,
      role: "faculty",
    });

    // Count clubs = count of club presidents (because no Club model)
    const clubsInDept = await User.countDocuments({
      department: hod.department,
      role: "club_president",
    });

    // Count approved events for department
    const approvedEvents = await Event.countDocuments({
      department: hod.department,
      status: "final_approved" // correct status from your model
    });

    // Count pending events waiting for HOD approval
    const pendingEvents = await Event.countDocuments({
      department: hod.department,
      status: "faculty_approved"
    });

    return res.json({
      ...hod.toObject(),
      facultyCount,
      clubsInDept,
      approvedEvents,
      pendingEvents
    });

  } catch (error) {
    console.error("HOD PROFILE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};


/**
 * UPDATE HOD Profile
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

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true }
    ).select("-password");

    res.json(updated);

  } catch (error) {
    console.error("HOD UPDATE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};


/**
 * CHANGE PASSWORD
 */
exports.changeHodPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const hod = await User.findById(req.user.id);

    if (!hod) {
      return res.status(404).json({ message: "HOD not found" });
    }

    const valid = await bcrypt.compare(currentPassword, hod.password);
    if (!valid) {
      return res.status(400).json({ message: "Incorrect current password" });
    }

    hod.password = await bcrypt.hash(newPassword, 10);
    await hod.save();

    res.json({ message: "Password updated successfully" });

  } catch (error) {
    console.error("HOD PASSWORD ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getHodAnalytics = async (req, res) => {
  try {
    const department = req.user.department;

    // 1️⃣ Get clubs under this HOD
    const clubs = await User.find({
      role: "club_president",
      department
    }).select("clubName");

    const clubNames = clubs.map(c => c.clubName);

    // 2️⃣ Events by Club (Bar chart)
    const eventsByClub = await Event.aggregate([
      { $match: { club: { $in: clubNames } } },
      {
        $group: {
          _id: "$club",
          count: { $sum: 1 }
        }
      }
    ]);

    // 3️⃣ Participation Trend (Line chart – month wise)
    const participationTrend = await Event.aggregate([
      { $match: { club: { $in: clubNames } } },
      {
        $group: {
          _id: { $substr: ["$date", 0, 7] }, // YYYY-MM
          participants: { $sum: "$report.participants" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // 4️⃣ Venue Utilization (Doughnut chart)
    const venueUtilization = await Event.aggregate([
      { $match: { club: { $in: clubNames } } },
      {
        $group: {
          _id: "$venue",
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      eventsByClub,
      participationTrend,
      venueUtilization
    });

  } catch (err) {
    console.error("❌ HOD analytics error:", err);
    res.status(500).json({ message: "Failed to load HOD analytics" });
  }
};
