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
