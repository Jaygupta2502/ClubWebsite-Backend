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
    console.log("🔍 DEAN PROFILE REQUEST RECEIVED");
    console.log("🔐 req.user = ", req.user);

    if (!req.user || !req.user.id) {
      console.log("❌ req.user or req.user.id is missing");
      return res.status(401).json({ message: "Unauthorized" });
    }

    const dean = await User.findById(req.user.id || req.user._id).select("-password");
    console.log("📄 dean document => ", dean);

    if (!dean) {
      console.log("❌ No dean found for id:", req.user.id);
      return res.status(404).json({ message: "Dean not found" });
    }

    if (dean.role !== "dean") {
      console.log("❌ User is not dean. Role:", dean.role);
      return res.status(403).json({ message: "Forbidden" });
    }

    console.log("✅ DEAN PROFILE SUCCESS");
    return res.json(dean);

  } catch (error) {
    console.log("💥 Dean GET error:", error);
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
  req.user.id || req.user._id,
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
    const dean = await User.findById(req.user.id || req.user._id);

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
