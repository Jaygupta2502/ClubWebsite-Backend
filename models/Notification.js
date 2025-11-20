const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientRole: { type: String, required: true }, // e.g., 'faculty', 'venue_coordinator', 'club_president'
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  message: String,
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
