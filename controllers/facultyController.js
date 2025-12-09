const bcrypt = require("bcryptjs");
const User = require("../models/User");

// GET Profile
exports.getFacultyProfile = async (req, res) => {
  try {
    const faculty = await User.findById(req.user.id).select("-password");
    return res.json(faculty);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE Profile
exports.updateFacultyProfile = async (req, res) => {
  try {
    const updates = req.body;
    const faculty = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
    }).select("-password");

    return res.json(faculty);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// CHANGE Password
exports.changeFacultyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const faculty = await User.findById(req.user.id);
    if (!faculty) return res.status(404).json({ msg: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, faculty.password);
    if (!isMatch) return res.status(400).json({ msg: "Wrong password" });

    faculty.password = await bcrypt.hash(newPassword, 10);
    await faculty.save();

    return res.json({ msg: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
