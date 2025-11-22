const mongoose = require("mongoose");

const recruitmentSchema = new mongoose.Schema({
  club: {
    type: String,
    required: true
  },

  // Club Logo
  clubLogoUrl: {
    type: String,
    default: ""
  },

  // Basic Details
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  googleFormUrl: {
    type: String,
    required: true
  },

  // Registration Period
  startDate: {
    type: String,
    required: true
  },
  endDate: {
    type: String,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },

  // Recruitment Flow
  status: {
    type: String,
    enum: ["Active", "Closed", "Draft", "Expired"],
    default: "Draft"
  },

  // Additional Fields
  applicants: {
    type: Number,
    default: 0
  },

  maxApplicants: {
    type: Number,
    default: 100
  },

  requirements: [
    {
      type: String
    }
  ],

  // Interview Phase
  interviewDate: {
    type: String,
    default: null
  },
  interviewTime: {
    type: String,
    default: null
  },

  // Attachments (PDF, guidelines, documents)
  attachments: [
    {
      fileName: String,
      fileUrl: String
    }
  ],

  // Created By (Club President ID)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  createdDate: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Recruitment", recruitmentSchema);
