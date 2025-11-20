const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['club_president', 'faculty', 'venue_coordinator', 'hod', 'dean', 'director'] },
  clubName: String,       // for club_president
  department: String,     // for faculty
  clubLogo: String,
  clubPhoto: String,
establishedYear: Number,
memberCount: Number,
totalEvents: Number,
achievements: [String],
description: String,
hodName: String, // Add this line
  specialization: String, // for faculty
  experience: String,      // for faculty
  isDeleted: {
  type: Boolean,
  default: false
},
  clubAssigned: {
    type: String,
    required: false  // or true if every faculty must be assigned
  },
  // models/User.js (add these fields)
signatureUrl: { type: String },    // path to stored image e.g. /uploads/signatures/<id>.png
signatureName: { type: String },   // optional
});

module.exports = mongoose.model('User', userSchema);