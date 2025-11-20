const express = require('express');
const router = express.Router();
const { createClubUser, createFacultyUser } = require('../controllers/hodController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const User = require('../models/User'); // Add at top if not already
const Event = require('../models/Event'); // If you store events in separate model

router.post('/create-club-user', protect, authorizeRoles('hod'), createClubUser);
router.post('/create-faculty-user', protect, authorizeRoles('hod'), createFacultyUser);


// Fetch all clubs
router.get('/clubs', protect, authorizeRoles('hod'), async (req, res) => {
  try {
    const clubs = await User.find({
  role: 'club_president',
  department: req.user.department, // ✅ filter by department
  $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
});
    res.json(clubs);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching clubs' });
  }
});

// Fetch all faculty
router.get('/faculty', protect, authorizeRoles('hod'), async (req, res) => {
  try {
    const faculty = await User.find({
  role: 'faculty',
  department: req.user.department, // ✅ filter by department
  $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
});
    res.json(faculty);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching faculty' });
  }
});



router.get('/stats', protect, authorizeRoles('hod'), async (req, res) => {
  try {
    const activeClubs = await User.find({
  role: 'club_president',
  department: req.user.department,
  $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
});
const activeFaculty = await User.find({
  role: 'faculty',
  department: req.user.department,
  $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
});

    const totalEvents = await Event.countDocuments();

    res.json({
      activeClubs: activeClubs.length,
      activeFaculty: activeFaculty.length,
      totalEvents,
    });
  } catch (err) {
    console.error('❌ /api/hod/stats error:', err); // ✅ add this for console
    res.status(500).json({ message: 'Server error fetching stats' });
  }
});


router.get('/inactive-users', protect, authorizeRoles('hod'), async (req, res) => {
  try {
    const inactiveClubs = await User.find({ role: 'club_president', department: req.user.department, isDeleted: true });
const inactiveFaculty = await User.find({ role: 'faculty', department: req.user.department, isDeleted: true });
    res.json({ inactiveClubs, inactiveFaculty });
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching inactive users' });
  }
});


// Delete user by ID
router.delete('/user/:id', protect, authorizeRoles('hod'), async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isDeleted: true });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error deleting user' });
  }
});

// Update user by ID
router.put('/user/:id', protect, authorizeRoles('hod'), async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: 'Server error updating user' });
  }
});


module.exports = router;
