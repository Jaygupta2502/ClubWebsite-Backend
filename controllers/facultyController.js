const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Event = require("../models/Event");

/**
 * GET Faculty Profile
 */
exports.getFacultyProfile = async (req, res) => {
  try {
    const faculty = await User.findById(req.user.id).select("-password");

    if (!faculty || faculty.role !== "faculty") {
      return res.status(404).json({ message: "Faculty not found" });
    }

    // Count events approved by this faculty
    const eventsApproved = await Event.countDocuments({
      approvedByFaculty: true
    });

    // Count clubs supervised: all clubs in faculty's department
    const clubsSupervised = await User.countDocuments({
      role: "club_president",
      department: faculty.department
    });

    return res.json({
      ...faculty.toObject(),
      eventsApproved,
      clubsSupervised
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * UPDATE Faculty Profile (only allowed fields)
 */
exports.updateFacultyProfile = async (req, res) => {
  try {
    const allowedFields = [
      "designation",
      "specialization",
      "experience",
      "qualification",
      "researchPapers",
      "phone",
      "office",
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

    return res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * CHANGE PASSWORD
 */
exports.changeFacultyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const faculty = await User.findById(req.user.id);

    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    const valid = await bcrypt.compare(currentPassword, faculty.password);
    if (!valid) {
      return res.status(400).json({ message: "Incorrect current password" });
    }

    faculty.password = await bcrypt.hash(newPassword, 10);
    await faculty.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
