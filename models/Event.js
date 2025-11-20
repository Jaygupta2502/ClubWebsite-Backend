// 📁 models/Event.js
const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: String,
  description: String,
  category: String,
  date: String,
  startTime: String,
  endTime: String,
  building: String,
  venue: String,
  capacity: String,
  isTicketed: String,
  ticketPrice: String,
  ticketQuantity: String,
  club: String,
  additionalDetails: String,
  bannerImageUrl: String,
  clubLogoUrl: String,
  status: {
  type: String,
  enum: ['pending', 'faculty_approved', 'hod_approved', 'final_approved', 'rejected'],
  default: 'pending'
},
currentApprovalLevel: {
  type: String,
  enum: ['faculty', 'hod', 'vc','completed'],
  default: 'faculty'
},
  approvedByFaculty: {
    type: Boolean,
    default: false
  },
  rejectionReason: {
  type: String,
  default: ''
},
  approvedByVenue: {
    type: Boolean,
    default: false
  },
  report: {
    submitted: { type: Boolean, default: false },
    submittedAt: { type: Date, default: null },
    posterUrl: { type: String },
    participants: Number,
    guestName: String,
    staffCoordinator: String,
    staffInvited: String
  },
  registrationLink: String,
  attendees: {
    type: Number,
    default: 0
  },
  targetAudience: [String],
  rejectionReason: {
    type: String,
    default: ''
  },
  schedule: [
    {
      time: String,
      title: String,
      description: String
    }
  ]

}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);