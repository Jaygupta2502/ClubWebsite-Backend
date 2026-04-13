// routes/eventRoutes.js
const express = require('express');
const router = express.Router();

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const Event = require('../models/Event');
const User = require('../models/User');
const Notification = require('../models/Notification');

const verifyToken = require('../middleware/verifyToken');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const {
  createEvent,
  getVenueStats,
  getEventsByHodDepartment,
  getPendingEventsForHOD,
  approveEventByHod,
  rejectEventByHOD,
  approveEventByFaculty,
  getFinalApprovedEventsForHOD,
  approveEventByVenue
} = require('../controllers/eventController');

const sendMail = require('../utils/mailer');

// -------------------- Helpers --------------------
/**
 * Safe JSON parse - returns fallback if parse fails
 */
function safeJSON(value, fallback = []) {
  try {
    if (typeof value === 'string') return JSON.parse(value);
    // if already an object/array, return as-is
    return value ?? fallback;
  } catch (err) {
    return fallback;
  }
}

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// -------------------- Multer --------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '-');
    cb(null, `${Date.now()}-${safeName}`);
  }
});
const upload = multer({ storage });

// -------------------- Routes --------------------

// root get - get all events (keeps semantics from original file)
router.get('/', async (req, res) => {
  try {
    const events = await Event.find().sort({ date: -1 });
    res.json(events);
  } catch (err) {
    console.error('❌ Fetch all events failed:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// create event route (original logic retained; safer)
router.post(
  '/create',
  verifyToken,
  upload.fields([
    { name: 'bannerImage', maxCount: 1 },
    { name: 'clubLogo', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const {
        title,
        description,
        category,
        date,
        startTime,
        endTime,
        building,
        venue,
        capacity,
        isTicketed,
        ticketPrice,
        ticketQuantity,
        additionalDetails,
        registrationLink,
        registrationForm,
        attendees,
        schedule,
        feedbackLink,
        targetAudience
      } = req.body;

      // user from token
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(400).json({ message: 'Invalid user' });
      }

      // send mail to user (wrapped)
      try {
        if (user?.email) {
          await sendMail(
            user.email,
            'Event Submitted for Faculty Review',
            `<p>Hi ${user.name},</p><p>Your event <strong>${title}</strong> has been submitted and is awaiting faculty review.</p>`
          );
        }
      } catch (mailErr) {
        console.warn('Email to user failed (non-fatal):', mailErr?.message || mailErr);
      }

      // ensure club assigned
      const club = user.role === 'club_president' ? user.clubName : null;
      if (!club) {
        return res.status(400).json({ message: 'Invalid user or club not assigned' });
      }

      // check conflicts: same date & overlapping time in same venue
      const conflictingEvent = await Event.findOne({
        date,
        venue,
        $or: [
          {
            startTime: { $lt: endTime },
            endTime: { $gt: startTime }
          }
        ]
      });

      if (conflictingEvent) {
        return res.status(400).json({
          message:
            'An event is already scheduled at this venue during the selected time. Please choose a different time or venue.'
        });
      }

      const bannerImageUrl = req.files?.bannerImage ? `/uploads/${req.files.bannerImage[0].filename}` : '';
      const clubLogoUrl = req.files?.clubLogo ? `/uploads/${req.files.clubLogo[0].filename}` : '';

      // parse schedule and targetAudience safely (frontend should send JSON strings)
      const parsedSchedule = safeJSON(schedule, []);
      const parsedTargetAudience = safeJSON(targetAudience, []);
      const parsedRegistrationForm = safeJSON(registrationForm, []);

      // Normalize numeric values
      const normalizedAttendees = attendees ? Number(attendees) : 0;
      const normalizedCapacity = capacity ? Number(capacity) : (req.body.capacity || '');
      const normalizedTicketPrice = ticketPrice ? Number(ticketPrice) : 0;
      const normalizedTicketQuantity = ticketQuantity ? Number(ticketQuantity) : 0;

      const newEvent = new Event({
        title,
        description,
        category,
        date,
        startTime,
        endTime,
        building,
        venue,
        capacity: normalizedCapacity,
        isTicketed,
        ticketPrice: normalizedTicketPrice,
        ticketQuantity: normalizedTicketQuantity,
        club,
        additionalDetails,
        bannerImageUrl,
        clubLogoUrl,
        status: 'pending',
        registrationLink,
        registrationForm: parsedRegistrationForm,
        feedbackLink,
        attendees: normalizedAttendees,
        targetAudience: parsedTargetAudience,
        schedule: parsedSchedule
      });

      await newEvent.save();

      // create notification for faculty (kept)
      try {
        await Notification.create({
          recipientRole: 'faculty',
          message: `New event "${newEvent.title}" pending your approval`,
          eventId: newEvent._id
        });
      } catch (notifErr) {
        console.warn('Notification create failed (non-fatal):', notifErr?.message || notifErr);
      }

      // notify club president and faculty (wrapped)
      try {
        const clubPresident = await User.findById(req.user.id);
        const faculty = await User.findOne({ clubAssigned: clubPresident?.clubName, role: 'faculty' });

        const eventInfo = `
          <h3>New Event Submitted</h3>
          <p><strong>Title:</strong> ${newEvent.title}</p>
          <p><strong>Club:</strong> ${newEvent.club}</p>
          <p><strong>Date:</strong> ${newEvent.date}</p>
          <p><strong>Time:</strong> ${newEvent.startTime} - ${newEvent.endTime}</p>
          <p>Please review and approve the event in the system.</p>
        `;

        if (clubPresident?.email) {
          try {
            await sendMail(clubPresident.email, '✅ Event Submitted', 'Your event has been submitted and sent to faculty for review.');
          } catch (errMail) {
            console.warn('Mail to club president failed (non-fatal):', errMail?.message || errMail);
          }
        }
        if (faculty?.email) {
          try {
            await sendMail(faculty.email, '📥 New Event Pending Approval', eventInfo);
          } catch (errMail) {
            console.warn('Mail to faculty failed (non-fatal):', errMail?.message || errMail);
          }
        }
      } catch (innerErr) {
        console.warn('Notification email flow failed (non-fatal):', innerErr?.message || innerErr);
      }

      res.status(201).json({ message: 'Event created successfully', event: newEvent });
    } catch (err) {
      console.error('❌ Event creation error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// GET events pending for faculty approval (no auth originally) - keep as-is
router.get('/faculty-pending', async (req, res) => {
  try {
    const pendingEvents = await Event.find({ approvedByFaculty: false });
    res.json(pendingEvents);
  } catch (err) {
    console.error('❌ Error fetching pending faculty events:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// HOD upcoming events route (kept)
router.get(
  '/hod/upcoming-events',
  protect,
  authorizeRoles('hod'),
  getEventsByHodDepartment
);

// route: pending/hod (kept)
router.get('/pending/hod', protect, authorizeRoles('hod'), getPendingEventsForHOD);

router.get(
  '/hod/upcoming-events',
  protect,
  authorizeRoles('hod'),
  getFinalApprovedEventsForHOD
);

router.delete(
  '/hod/delete/:id',
  protect,
  authorizeRoles('hod'),
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }

      await Event.findByIdAndDelete(req.params.id);

      res.json({ message: 'Event permanently deleted' });
    } catch (err) {
      console.error('❌ Delete event error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// reject route (kept)
router.patch('/reject/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    event.status = 'rejected';
    event.rejectionReason = req.body.rejectionReason || '';
    await event.save();

    res.json({ message: 'Event marked as rejected', event });
  } catch (err) {
    console.error('❌ Reject error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit Event Report (kept)
router.post('/report/:id', upload.single('eventPoster'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    event.report = {
      submitted: true,
      submittedAt: new Date(),
      posterUrl: req.file ? `/uploads/${req.file.filename}` : '',
      participants: req.body.participants,
      guestName: req.body.guestName,
      staffCoordinator: req.body.staffCoordinator,
      staffInvited: req.body.staffInvited
    };
    event.reportSubmitted = true;
    await event.save();
    res.json({ message: 'Report submitted successfully', event });
  } catch (err) {
    console.error('❌ Report submission error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// hod pending approvals (kept)
router.get('/hod/pending-approvals', protect, authorizeRoles('hod'), getPendingEventsForHOD);

// Faculty approval route (kept + safe)
router.patch('/approve/faculty/:id', protect, authorizeRoles('faculty'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    event.status = 'faculty_approved';
    event.currentApprovalLevel = 'hod';
    event.approvedByFaculty = true;
    await event.save();

    const faculty = await User.findById(req.user.id);
    const hod = await User.findOne({ role: 'hod' });

    if (hod?.email) {
      try {
        await sendMail(
          hod.email,
          `📥 Event "${event.title}" Awaiting HOD Approval`,
          `<p>Dear HOD, the event <strong>${event.title}</strong> has been approved by faculty and awaits your review.</p>`
        );
        console.log(`📧 Email sent to HOD: ${hod.email}`);
      } catch (mailErr) {
        console.warn('Mail to HOD failed (non-fatal):', mailErr?.message || mailErr);
      }
    }

    try {
      await Notification.create({
        recipientRole: 'hod',
        message: `Event "${event.title}" is pending your approval.`,
        eventId: event._id
      });
    } catch (notifErr) {
      console.warn('Notification creation failed (non-fatal):', notifErr?.message || notifErr);
    }

    res.json({ message: 'Event approved by Faculty', event });
  } catch (err) {
    console.error('❌ Faculty approval failed:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// HOD approval route (kept)
router.patch('/approve/hod/:id', protect, authorizeRoles('hod'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    event.status = 'hod_approved';
    event.currentApprovalLevel = 'vc';
    await event.save();

    let venueCoordinators = await User.find({ role: 'venue_coordinator' });
    if (!venueCoordinators.length) {
      venueCoordinators = [{ email: process.env.FIXED_VC_EMAIL || 'jayakhileshgupta1@gmail.com' }];
    }

    for (const vc of venueCoordinators) {
      try {
        await sendMail(
          vc.email,
          `📥 Event "${event.title}" Awaiting Venue Approval`,
          `<p>Dear Venue Coordinator, the event <strong>${event.title}</strong> has been approved by HOD and is awaiting your scheduling confirmation.</p>`
        );
        console.log(`📧 Email sent to Venue Coordinator: ${vc.email}`);
      } catch (mailErr) {
        console.warn('Mail to VC failed (non-fatal):', mailErr?.message || mailErr);
      }
    }

    try {
      await Notification.create({
        recipientRole: 'venue_coordinator',
        message: `Event "${event.title}" is awaiting your approval.`,
        eventId: event._id
      });
    } catch (notifErr) {
      console.warn('Notification creation failed (non-fatal):', notifErr?.message || notifErr);
    }

    res.json({ message: 'Event approved by HOD', event });
  } catch (err) {
    console.error('❌ HOD approval failed:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// -------------------- MERGED Venue Coordinator Approval (Option C) --------------------
router.patch('/approve/venue/:id', protect, authorizeRoles('venue_coordinator'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      console.log('⚠️ [DEBUG] Event not found:', req.params.id);
      return res.status(404).json({ message: 'Event not found' });
    }

    // Business logic updates (preserve original behaviour)
    event.approvedByVenue = true;
    event.status = 'final_approved';
    event.currentApprovalLevel = 'completed';
    if (!event.approvedByFaculty) event.approvedByFaculty = true;
    await event.save();

    // Compose recipients
    const clubPresident = await User.findOne({ clubName: event.club, role: 'club_president' });
    const faculty = await User.findOne({ clubAssigned: event.club, role: 'faculty' });
    const hod = await User.findOne({ role: 'hod' });

    // Fetch venue coordinators from DB
    let venueCoordinators = await User.find({ role: 'venue_coordinator' });
    console.log('📩 [DEBUG] venueCoordinators (from DB):', venueCoordinators.map(vc => vc.email));

    // FALLBACK: if none found in DB, use fixed email (from authController or hardcoded)
    if (!venueCoordinators || venueCoordinators.length === 0) {
      const fixedVcEmail = process.env.FIXED_VC_EMAIL || 'jayakhileshgupta1@gmail.com';
      console.log('📩 [DEBUG] No DB VC found — using FIXED VC email:', fixedVcEmail);
      venueCoordinators = [{ email: fixedVcEmail, name: 'Venue Coordinator (Fixed)' }];
    }

    const recipients = [
      clubPresident?.email,
      faculty?.email,
      hod?.email,
      ...venueCoordinators.map(v => v.email)
    ].filter(Boolean);

    // Deduplicate
    const uniqRecipients = [...new Set(recipients)];
    console.log('📩 [DEBUG] Final recipient list:', uniqRecipients);

    // Send individually so we can log per-email success/failure
    const subject = `🎉 Event Fully Approved: ${event.title}`;
    const body = `<p>The event <strong>${event.title}</strong> has been fully approved and scheduled.</p>`;

    for (const email of uniqRecipients) {
      try {
        console.log(`📩 [DEBUG] Attempting sendMail to: ${email}`);
        await sendMail(email, subject, body); // send one-by-one
        console.log(`📧 Email sent successfully to: ${email}`);
      } catch (mailErr) {
        console.error(`❌ Email failed for ${email}:`, mailErr);
      }
    }

    // Create notifications (optional)
    try {
      await Notification.create({
        recipientRole: 'club_president',
        message: `Your event "${event.title}" has been fully approved and scheduled.`,
        eventId: event._id
      });
    } catch (notifErr) {
      console.warn('Notification creation failed (non-fatal):', notifErr?.message || notifErr);
    }

    res.json({ message: 'Event approved by Venue Coordinator', event });
  } catch (err) {
    console.error('❌ Venue approval failed:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// hod reject (kept)
router.patch('/reject/hod/:id', protect, authorizeRoles('hod'), rejectEventByHOD);

// get total approved events for logged-in club (kept)
router.get('/club/total', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'club_president') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const count = await Event.countDocuments({
      club: user.clubName,
      status: 'final_approved'
    });

    res.json({ totalEvents: count });
  } catch (err) {
    console.error('❌ Count error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// pending reports (kept)
router.get('/pending-reports', verifyToken, async (req, res) => {
  try {
    const user = req.user;
    const todayStr = new Date().toISOString().split('T')[0];

    const events = await Event.find({
      status: 'final_approved',
      club: user.clubName,
      date: { $lt: todayStr },
      $or: [
        { 'report.submitted': { $ne: true } },
        { report: { $exists: false } }
      ]
    });

    const enriched = events.map(event => {
      const eventDate = new Date(event.date);
      const daysOverdue = Math.floor((Date.now() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...event._doc,
        reportSubmitted: false,
        daysOverdue
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error('❌ Error fetching pending reports:', err);
    res.status(500).json({ error: 'Failed to fetch pending reports' });
  }
});

// events with reports
router.get('/with-reports', verifyToken, async (req, res) => {
  try {
    const eventsWithReports = await Event.find({ 'report.submitted': true }).sort({ date: -1 });
    res.json(eventsWithReports);
  } catch (err) {
    console.error('Error fetching events with reports:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// get all events for admin panel (kept)
router.get('/all', async (req, res) => {
  try {
    const events = await Event.find().sort({ date: -1 });
    res.json(events);
  } catch (err) {
    console.error('❌ Fetch events error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// hod reject final event route (kept)
router.patch('/hod/reject/:id', verifyToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (event.status !== 'final_approved') {
      return res.status(400).json({ message: 'Only final approved events can be rejected by HOD' });
    }

    event.status = 'rejected';
    event.rejectionReason = req.body.rejectionReason || 'Rejected by HOD';
    await event.save();

    res.json({ message: 'Event rejected successfully', event });
  } catch (err) {
    console.error('❌ HOD reject final event error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// delete notification (kept)
router.delete('/notifications/:id', verifyToken, async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('❌ Delete notification error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// pending for venue coordinator
router.get('/pending/venue', protect, authorizeRoles('venue_coordinator'), async (req, res) => {
  try {
    const events = await Event.find({
      status: 'hod_approved',
      currentApprovalLevel: 'vc',
      approvedByVenue: false
    });

    res.json(events);
  } catch (err) {
    console.error('❌ Venue pending fetch error:', err.message, err.stack);
    res.status(500).json({ message: 'Server error' });
  }
});

// notifications for logged-in user (kept)
router.get('/notifications', verifyToken, async (req, res) => {
  try {
    let role;
    if (req.user.id && String(req.user.id).startsWith('fixed-')) {
      role = req.user.role;
    } else {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      role = user.role;
    }

    const notifications = await Notification.find({ recipientRole: role }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    console.error('❌ Fetch notifications error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// mark notification as read (kept)
router.patch('/notifications/:id/read', verifyToken, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('❌ Mark notification read error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// pending for faculty's club (kept)
router.get('/pending', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'faculty') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const facultyClub = user.clubName;

    const events = await Event.find({
      club: facultyClub,
      approvedByFaculty: false,
      status: 'pending'
    });

    res.json(events);
  } catch (err) {
    console.error('❌ Pending fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// get pending events for a faculty id (kept)
// GET pending events for a specific faculty based on their assigned club name
router.get('/pending/:facultyId', async (req, res) => {
  try {
    const faculty = await User.findById(req.params.facultyId);
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    // IMPORTANT: We filter events where the 'club' string matches faculty's 'clubAssigned' string
    const events = await Event.find({
      club: faculty.clubAssigned, 
      status: 'pending',
      approvedByFaculty: false
    }).sort({ date: -1 });

    res.json(events);
  } catch (err) {
    console.error('❌ Error fetching faculty events:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// faculty approved events for VC (kept)
router.get('/faculty_approved', async (req, res) => {
  try {
    const events = await Event.find({ status: 'faculty_approved' }).sort({ date: -1 });
    res.json(events);
  } catch (err) {
    console.error('❌ Fetch faculty approved events error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// submit report (kept)
router.post('/submit-report/:id', async (req, res) => {
  try {
    const { reportLink } = req.body;
    const event = await Event.findById(req.params.id);

    if (!event) return res.status(404).json({ message: 'Event not found' });

    event.reportLink = reportLink;
    event.reportSubmitted = true;
    await event.save();

    res.status(200).json({ message: 'Report submitted successfully', event });
  } catch (err) {
    console.error('❌ Report submission error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// pending events for specific faculty (kept)
router.get('/pending/faculty/:facultyId', async (req, res) => {
  try {
    const faculty = await User.findById(req.params.facultyId);
    if (!faculty || faculty.role !== 'faculty') {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    const events = await Event.find({
      club: faculty.clubAssigned,
      approvedByFaculty: false,
      status: 'pending'
    });

    res.json(events);
  } catch (err) {
    console.error('❌ Fetch pending events error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// venue stats (kept; controller)
router.get('/venue/stats', getVenueStats);

// calendar events by month/year (kept, safer parsing)
router.get('/calendar', async (req, res) => {
  try {
    let { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ message: 'Month and year are required' });
    }

    month = parseInt(month);
    year = parseInt(year);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const events = await Event.find({
      date: {
        $gte: startDate.toISOString().slice(0, 10),
        $lt: endDate.toISOString().slice(0, 10)
      }
    }).sort({ date: 1 });

    return res.json(events);
  } catch (err) {
    console.error('❌ Calendar fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// get single event by id (kept)
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    res.json(event);
  } catch (err) {
    console.error('❌ Fetch single event error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
