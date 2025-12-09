const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Create HOD
exports.createHod = async (req, res) => {
  try {
    const { name, email, password, department } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const hod = new User({
      name,
      email,
      password: hashedPassword,
      role: 'hod',
      department
    });

    await hod.save();
    res.status(201).json(hod);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get All HODs
exports.getAllHods = async (req, res) => {
  try {
    const hods = await User.find({ role: 'hod', isDeleted: false });
    res.json(hods);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update HOD
exports.updateHod = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, department } = req.body;

    const updated = await User.findByIdAndUpdate(
      id,
      { name, email, department },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete HOD (soft delete)
exports.deleteHod = async (req, res) => {
  try {
    const { id } = req.params;

    await User.findByIdAndUpdate(id, { isDeleted: true });
    res.json({ message: 'HOD deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


/**
 * GET Dean Profile
 */
exports.getDeanProfile = async (req, res) => {
  try {
    const dean = await User.findById(req.user.id).select("-password");

    if (!dean || dean.role !== "dean") {
      return res.status(404).json({ message: "Dean not found" });
    }

    return res.json(dean.toObject());
  } catch (error) {
    console.error("Dean GET error:", error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * UPDATE Dean Profile
 */
exports.updateDeanProfile = async (req, res) => {
  try {
    const allowed = [
      "phone",
      "office",
      "designation",
      "specialization",
      "experience",
      "qualification",
      "departmentCount",
      "facultyCount",
      "studentCount",
      "collegeBudget",
      "theme"
    ];

    const updates = {};
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true }
    ).select("-password");

    return res.json(updated);
  } catch (error) {
    console.error("Dean UPDATE error:", error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * CHANGE PASSWORD
 */
exports.changeDeanPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const dean = await User.findById(req.user.id);

    if (!dean) {
      return res.status(404).json({ message: "Dean not found" });
    }

    const valid = await bcrypt.compare(currentPassword, dean.password);
    if (!valid) {
      return res.status(400).json({ message: "Incorrect current password" });
    }

    dean.password = await bcrypt.hash(newPassword, 10);
    await dean.save();

    return res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error(" Dean PASSWORD error:", error);
    return res.status(500).json({ error: error.message });
  }
};
