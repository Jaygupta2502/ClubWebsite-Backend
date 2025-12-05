const mongoose = require('mongoose');

const hodProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    department: { type: String },
    designation: { type: String },
    specialization: { type: String },
    experience: { type: String },
    phone: { type: String },
    office: { type: String },
    qualification: { type: String },

    facultyCount: { type: Number },
    studentCount: { type: Number },
    clubsInDept: { type: Number },
    departmentBudget: { type: Number },
  },
  { timestamps: true }
);

module.exports = mongoose.model('HodProfile', hodProfileSchema);
