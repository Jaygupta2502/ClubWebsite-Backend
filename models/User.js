const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Basic Information
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },

  // Role Based Access
  role: {
    type: String,
    enum: ['club_president', 'faculty', 'venue_coordinator', 'hod', 'dean', 'director'],
    required: true
  },

  // Shared Between Faculty, HOD & Dean
  department: String,
  designation: String,
  phone: String,
  office: String,
  theme: { type: String, default: 'light' },

  // Faculty Academic Fields
  specialization: String,
  experience: Number,
  qualification: String,
  researchPapers: Number,

  // Dean / HOD Department Stats (Editable by Dean, Auto Read by HOD)
  facultyCount: Number,
  studentCount: Number,
  clubsInDept: Number,
  departmentBudget: String,

  // Club President Data
  clubName: String,
  clubLogo: String,
  clubPhoto: String,
  establishedYear: Number,
  memberCount: Number,
  achievements: [String],
  description: String,
  hodName: String,

  // Signature
  signatureUrl: String,
  signatureName: String,

  // Soft Delete
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
