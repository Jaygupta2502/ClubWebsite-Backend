const mongoose = require("mongoose");

const venueSchema = new mongoose.Schema({
  building: { type: String, required: true },
  name: { type: String, required: true },
  capacity: Number
});

module.exports = mongoose.model("Venue", venueSchema);