const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Event = require("../models/Event");
const Club = require("../models/Club");

/**
 * GET Faculty Profile
 * Includes auto stats for approved events + clubs supervised
 */
exports.getFacultyProfile = async (req, res) => {
  try {
    // Get faculty data
    const faculty = await User.findById(req.user.id).select("-password");

    if (!faculty || faculty.role !== "faculty") {
      return res.status(404).json({ message: "Faculty not found" });
    }

    // Count approved events
    const eventsApproved = await Event.countDocuments({
      facultyId: req.user.id,
      status: "fully_approved",
    });

    // Count clubs supervised
    const clubsSupervised = await Club.countDocuments({
      facultyCoordinator: req.user.id,
    });

    return res.json({
      ...faculty.toObject(),
      eventsApproved,
      clubsSupervised,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
      "theme",
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const updatedFaculty = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true }
    ).select("-password");

    return res.json(updatedFaculty);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * CHANGE Password
 */
exports.changeFacultyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const faculty = await User.findById(req.user.id);

    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    const validPassword = await bcrypt.compare(currentPassword, faculty.password);
    if (!validPassword) {
      return res.status(400).json({ message: "Incorrect current password" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    faculty.password = hashed;
    await faculty.save();

    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
