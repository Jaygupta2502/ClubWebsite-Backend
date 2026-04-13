const mongoose = require('mongoose');

const eventRegistrationSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  responses: {
    type: Object,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('EventRegistration', eventRegistrationSchema);