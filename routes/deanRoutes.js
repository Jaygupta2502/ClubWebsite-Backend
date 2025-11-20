const express = require('express');
const router = express.Router();
const {
  createHod,
  getAllHods,
  updateHod,
  deleteHod
} = require('../controllers/deanController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Dean routes
router.post('/hod', protect, authorizeRoles('dean'), createHod);
router.get('/hods', protect, authorizeRoles('dean'), getAllHods);
router.put('/hod/:id', protect, authorizeRoles('dean'), updateHod);
router.delete('/hod/:id', protect, authorizeRoles('dean'), deleteHod);

module.exports = router;
