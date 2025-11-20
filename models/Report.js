const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  club: String,
  eventTitle: String,
  eventPoster: String, // file path
  building: String,
  venue: String,
  date: String,
  startTime: String,
  endTime: String,
  participants: String,
  guestName: String,
  staffCoordinator: String,
  staffInvited: String,
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Report', reportSchema);
