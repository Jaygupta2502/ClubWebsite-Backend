const express = require("express");
const router = express.Router();
const Venue = require("../models/Venue");

// ➕ Add Venue
router.post("/", async (req, res) => {
  const venue = new Venue(req.body);
  await venue.save();
  res.json(venue);
});

// 📥 Get all venues
router.get("/", async (req, res) => {
  const venues = await Venue.find();
  res.json(venues);
});

// ❌ Delete venue
router.delete("/:id", async (req, res) => {
  await Venue.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

module.exports = router;