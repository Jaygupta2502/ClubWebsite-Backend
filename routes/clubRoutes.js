const Event = require('../models/Event'); // 👈 Make sure this path is correct
const express = require('express');
const router = express.Router();
const multer = require('multer');

const User = require('../models/User');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Ensure this folder exists
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const extension = file.originalname.split('.').pop();
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + extension);
  }
});

const upload = multer({ storage });

// ================================
// @route   GET /api/club/profile
// @desc    Get club's own profile
// @access  Private (club_president)
// ================================
router.get('/profile', protect, authorizeRoles('club_president'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Club not found' });
    res.json(user);
  } catch (err) {
    console.error('❌ Error in GET /api/club/profile:', err);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});


// ================================
// @route   PUT /api/club/profile
// @desc    Update club's own profile
// @access  Private (club_president)
// ================================
router.put(
  '/profile',
  protect,
  authorizeRoles('club_president'),
  upload.fields([
    { name: 'clubLogo', maxCount: 1 },
    { name: 'clubPhoto', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const updates = { ...req.body };

      if (req.files['clubLogo']) {
        updates.clubLogo = `/uploads/${req.files['clubLogo'][0].filename}`;
      }

      if (req.files['clubPhoto']) {
        updates.clubPhoto = `/uploads/${req.files['clubPhoto'][0].filename}`;
      }

      if (updates.achievements && typeof updates.achievements === 'string') {
        updates.achievements = JSON.parse(updates.achievements);
      }

      const updatedUser = await User.findByIdAndUpdate(req.user.id, updates, { new: true });
      res.json(updatedUser);
    } catch (err) {
      console.error('❌ Update error:', err);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  }
);
// ================================
// @route   GET /api/club/all
// @desc    Public - Get all club profiles
// @access  Public
// ================================
router.get('/all', async (req, res) => {
  try {
    const clubs = await User.find({ role: 'club_president', isDeleted: false });
    res.json(clubs);
  } catch (err) {
    console.error('❌ Failed to fetch clubs:', err);
    res.status(500).json({ message: 'Failed to fetch clubs' });
  }
});

// backend/routes/clubRoutes.js
router.get('/:id', async (req, res) => {
  try {
    const club = await User.findById(req.params.id).select('-password');
    if (!club) return res.status(404).json({ message: 'Club not found' });

    const totalEvents = await Event.countDocuments({
      club: club.clubName,
      status: 'final_approved' // or 'approved' depending on your workflow
    });

    res.json({
      ...club.toObject(),
      totalEvents
    });
  } catch (err) {
    console.error('❌ Error in GET /api/club/:id:', err);
    res.status(500).json({ message: 'Server error' });
  }
});




module.exports = router;
