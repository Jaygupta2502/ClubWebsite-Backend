const express = require('express');
const router = express.Router();
const upload = require('../middleware/multer');
const verifyToken = require('../middleware/verifyToken');
const Report = require('../models/Report');
const Event = require('../models/Event'); 

router.post('/', verifyToken, upload.single('eventPoster'), async (req, res) => {
  try {
    const {
      club,
      eventTitle,
      building,
      venue,
      date,
      startTime,
      endTime,
      participants,
      guestName,
      staffCoordinator,
      staffInvited,
    } = req.body;

    // 1. Save the report in the reports collection
    const report = new Report({
      club,
      eventTitle,
      eventPoster: req.file.filename,
      building,
      venue,
      date,
      startTime,
      endTime,
      participants,
      guestName,
      staffCoordinator,
      staffInvited,
      submittedBy: req.user.id,
    });

    await report.save();

    // 2. Update the event with report status and metadata
    await Event.findOneAndUpdate(
      { title: eventTitle, club }, // Match by title and club
      {
        $set: {
          'report.submitted': true,
          'report.submittedAt': new Date(),
          'report.posterUrl': req.file.filename,
          'report.participants': participants,
          'report.guestName': guestName,
          'report.staffCoordinator': staffCoordinator,
          'report.staffInvited': staffInvited,
        }
      }
    );

    res.status(201).json({ message: 'Report submitted', report });
  } catch (err) {
    console.error('Report save error:', err);
    res.status(500).json({ error: 'Failed to save report' });
  }
});

router.get('/all', verifyToken, async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    console.error('Error fetching all reports:', err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});


router.get('/mine', verifyToken, async (req, res) => {
  try {
    const reports = await Report.find({ submittedBy: req.user.id }).sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Add this GET route at the bottom of reportRoutes.js



module.exports = router;
