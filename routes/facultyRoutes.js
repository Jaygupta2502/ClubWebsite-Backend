const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  getFacultyProfile,
  updateFacultyProfile,
  changeFacultyPassword
} = require("../controllers/facultyController");

// Profile
router.get("/profile", protect, authorizeRoles("faculty"), getFacultyProfile);
router.put("/profile", protect, authorizeRoles("faculty"), updateFacultyProfile);

// Change password
router.put("/password", protect, authorizeRoles("faculty"), changeFacultyPassword);

module.exports = router;
