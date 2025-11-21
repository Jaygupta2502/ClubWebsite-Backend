// 📁 /routes/eventRoutes.js (LOCAL STORAGE VERSION)
const express = require('express');
const router = express.Router();
// ✅ Route to get all events
router.get('/', async (req, res) => {
  try {
    const events = await Event.find().sort({ date: -1 });
    res.json(events);
  } catch (err) {
    console.error('❌ Fetch all events failed:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
// ✅ Route to get one event by ID


const multer = require('multer');
const path = require('path');
const Event = require('../models/Event');
const User = require('../models/User');
const verifyToken = require('../middleware/verifyToken');
const fs = require('fs');
const sendMail = require('../utils/mailer');
const Notification = require('../models/Notification');




const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
   createEvent,
  getVenueStats,
  getEventsByHodDepartment,
  getPendingEventsForHOD,
  approveEventByHod,
  rejectEventByHOD
} = require('../controllers/eventController');

const {
  approveEventByFaculty,
  approveEventByVenue
} = require('../controllers/eventController');


router.get(
  "/hod/upcoming-events",
  protect,
  authorizeRoles("hod"),
  getEventsByHodDepartment
);


// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// ✅ 1. Setup multer to save files in /uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage });

// ✅ 2. Create Event route (prevent duplicates, save image & form to MongoDB)
router.post(
  '/create',
  verifyToken,
  upload.fields([
    { name: 'bannerImage', maxCount: 1 },
    { name: 'clubLogo', maxCount: 1 },
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
  attendees,
  schedule,
  targetAudience
} = req.body;


// Get the club from the logged-in user instead of trusting the frontend
const user = await User.findById(req.user.id);
await sendMail(
  user.email,
  'Event Submitted for Faculty Review',
  `<p>Hi ${user.name},</p><p>Your event <strong>${title}</strong> has been submitted and is awaiting faculty review.</p>`
);

const club = user.role === 'club_president' ? user.clubName : null;

if (!club) {
  return res.status(400).json({ message: 'Invalid user or club not assigned' });
}

      // 🛑 Check if an event already exists for the same venue and time
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
        return res.status(400).json({ message: 'An event is already scheduled at this venue during the selected time. Please choose a different time or venue.' });
      }

      const bannerImageUrl = req.files['bannerImage']
        ? `/uploads/${req.files['bannerImage'][0].filename}`
        : '';
      const clubLogoUrl = req.files['clubLogo']
        ? `/uploads/${req.files['clubLogo'][0].filename}`
        : '';

      const newEvent = new Event({
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
        club,
        additionalDetails,
        bannerImageUrl,
        clubLogoUrl,
        status: 'pending',
        registrationLink,
        attendees,
        targetAudience: JSON.parse(targetAudience || '[]'),
        schedule: JSON.parse(schedule) // frontend sends it as JSON string
      });


      await newEvent.save();

      await Notification.create({
  recipientRole: 'faculty',
  message: `New event "${newEvent.title}" pending your approval`,
  eventId: newEvent._id
});
      // 📩 Send email to club president and faculty
const clubPresident = await User.findById(req.user.id); // Already authenticated
const faculty = await User.findOne({ clubAssigned: clubPresident.clubName, role: 'faculty' });

const eventInfo = `
  <h3>New Event Submitted</h3>
  <p><strong>Title:</strong> ${newEvent.title}</p>
  <p><strong>Club:</strong> ${newEvent.club}</p>
  <p><strong>Date:</strong> ${newEvent.date}</p>
  <p><strong>Time:</strong> ${newEvent.startTime} - ${newEvent.endTime}</p>
  <p>Please review and approve the event in the system.</p>
`;

if (clubPresident?.email) {
  await sendMail(clubPresident.email, '✅ Event Submitted', 'Your event has been submitted and sent to faculty for review.');
}
if (faculty?.email) {
  await sendMail(faculty.email, '📥 New Event Pending Approval', eventInfo);
}
      res.status(201).json({ message: 'Event created successfully', event: newEvent });
    } catch (err) {
      console.error('❌ Event creation error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Get events pending for faculty approval
router.get('/faculty-pending', async (req, res) => {
  try {
    const pendingEvents = await Event.find({ approvedByFaculty: false });
    res.json(pendingEvents);
  } catch (err) {
    console.error('❌ Error fetching pending faculty events:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
// Faculty approves an event


router.get('/pending/hod', protect, authorizeRoles('hod'), getPendingEventsForHOD);
// Faculty rejects an event
// Faculty rejects an event
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


// 📝 Submit Event Report
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

router.get('/hod/pending-approvals', protect, authorizeRoles('hod'), getPendingEventsForHOD);
// ✅ Faculty Approval Route (sends email to HOD)
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
      await sendMail(
        hod.email,
        `📥 Event "${event.title}" Awaiting HOD Approval`,
        `<p>Dear HOD, the event <strong>${event.title}</strong> has been approved by faculty and awaits your review.</p>`
      );
      console.log(`📧 Email sent to HOD: ${hod.email}`);
    }

    await Notification.create({
      recipientRole: 'hod',
      message: `Event "${event.title}" is pending your approval.`,
      eventId: event._id
    });

    res.json({ message: 'Event approved by Faculty', event });
  } catch (err) {
    console.error('❌ Faculty approval failed:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// ✅ HOD Approval Route (sends email to Venue Coordinator)
router.patch('/approve/hod/:id', protect, authorizeRoles('hod'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    event.status = 'hod_approved';
    event.currentApprovalLevel = 'vc';
    await event.save();

    let venueCoordinators = await User.find({ role: 'venue_coordinator' });
    if (!venueCoordinators.length) {
      venueCoordinators = [
        { email: process.env.FIXED_VC_EMAIL || 'jayakhileshgupta1@gmail.com' }
      ];
    }

    for (const vc of venueCoordinators) {
      await sendMail(
        vc.email,
        `📥 Event "${event.title}" Awaiting Venue Approval`,
        `<p>Dear Venue Coordinator, the event <strong>${event.title}</strong> has been approved by HOD and is awaiting your scheduling confirmation.</p>`
      );
      console.log(`📧 Email sent to Venue Coordinator: ${vc.email}`);
    }

    await Notification.create({
      recipientRole: 'venue_coordinator',
      message: `Event "${event.title}" is awaiting your approval.`,
      eventId: event._id
    });

    res.json({ message: 'Event approved by HOD', event });
  } catch (err) {
    console.error('❌ HOD approval failed:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// ✅ Venue Coordinator Approval Route (final — sends to all)
router.patch('/approve/venue/:id', protect, authorizeRoles('venue_coordinator'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    event.status = 'final_approved';
    event.currentApprovalLevel = 'completed';
    event.approvedByVenue = true;
    if (!event.approvedByFaculty) event.approvedByFaculty = true;
    await event.save();

    const clubPresident = await User.findOne({ clubName: event.club, role: 'club_president' });
    const faculty = await User.findOne({ clubAssigned: event.club, role: 'faculty' });
    const hod = await User.findOne({ role: 'hod' });

    let venueCoordinators = await User.find({ role: 'venue_coordinator' });
    if (!venueCoordinators.length) {
      venueCoordinators = [
        { email: process.env.FIXED_VC_EMAIL || 'jayakhileshgupta1@gmail.com' }
      ];
    }

    const recipients = [
      clubPresident?.email,
      faculty?.email,
      hod?.email,
      ...venueCoordinators.map(v => v.email)
    ].filter(Boolean);

    for (const email of recipients) {
      await sendMail(
        email,
        `🎉 Event "${event.title}" Fully Approved`,
        `<p>The event <strong>${event.title}</strong> has been approved by all authorities and is now officially scheduled.</p>`
      );
    }

    await Notification.create({
      recipientRole: 'club_president',
      message: `Your event "${event.title}" has been fully approved and scheduled.`,
      eventId: event._id
    });

    res.json({ message: 'Event approved by Venue Coordinator', event });
  } catch (err) {
    console.error('❌ Venue approval failed:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


router.patch('/reject/hod/:id', protect, authorizeRoles('hod'), rejectEventByHOD);

// ✅ Route to get total approved events for the logged-in club
router.get('/club/total', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'club_president') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const count = await Event.countDocuments({
      club: user.clubName,
      status: 'final_approved'  // ✅ or 'approved' depending on your flow
    });

    res.json({ totalEvents: count });
  } catch (err) {
    console.error('❌ Count error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


router.get('/pending-reports', verifyToken, async (req, res) => {
  try {
    const user = req.user;
    const todayStr = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

    const events = await Event.find({
      status: 'final_approved',
      club: user.clubName,
      date: { $lt: todayStr },
      $or: [
        { 'report.submitted': { $ne: true } },
        { report: { $exists: false } }
      ]
    });

    console.log('✅ Pending report events returned:', events.map(e => e.title));

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

router.get('/with-reports', verifyToken, async (req, res) => {
  try {
    const eventsWithReports = await Event.find({ 'report.submitted': true }).sort({ date: -1 });
    res.json(eventsWithReports);
  } catch (err) {
    console.error("Error fetching events with reports:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});



// ✅ 3. Get all events (for EventHistory or admin dashboard)
router.get('/all', async (req, res) => {
  try {
    const events = await Event.find().sort({ date: -1 });
    res.json(events);
  } catch (err) {
    console.error('❌ Fetch events error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/events/hod/reject/:id
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


router.delete('/notifications/:id', verifyToken, async (req, res) => {
  await Notification.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// 🧩 Venue Coordinator Approval Route
// Replace the existing /approve/venue/:id handler with this
router.patch('/approve/venue/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      console.log('⚠️ [DEBUG] Event not found:', req.params.id);
      return res.status(404).json({ message: 'Event not found' });
    }

    // Business logic updates
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

    // Build recipients list (unique, filtered)
    const recipients = [
      clubPresident?.email,
      faculty?.email,
      hod?.email,
      ...venueCoordinators.map(vc => vc.email)
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
    await Notification.create({
      recipientRole: 'club_president',
      message: `Event "${event.title}" has been fully approved and scheduled.`,
      eventId: event._id
    });

    res.json({ message: 'Event approved by Venue Coordinator', event });
  } catch (err) {
    console.error('❌ Venue approval failed:', err);
    res.status(500).json({ message: 'Server error' });
  }
});




router.get('/pending/venue', protect, authorizeRoles('venue_coordinator'), async (req, res) => {
  try {
    console.log('👤 VC requesting pending events:', req.user);

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

// Get unread notifications for logged-in user
router.get('/notifications', verifyToken, async (req, res) => {
  try {
    // ✅ Handle both fixed and DB users
let role;

if (req.user.id && req.user.id.startsWith('fixed-')) {
  // Fixed user (e.g., fixed-venue_coordinator)
  role = req.user.role;
} else {
  // Normal DB user
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  role = user.role;
}


    const notifications = await Notification.find({
      recipientRole: role
    }).sort({ createdAt: -1 });

    res.json(notifications);

  } catch (err) {
    console.error('❌ Fetch notifications error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});




// Mark notification as read
router.patch('/notifications/:id/read', verifyToken, async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { read: true });
  res.json({ message: 'Notification marked as read' });
});


// ✅ Route to get all events with "pending" status
// 📍 Route to get events pending for the logged-in faculty's club
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



// 🧠 Get pending events for faculty based on assigned club
router.get('/pending/:facultyId', async (req, res) => {
  try {
    const faculty = await User.findById(req.params.facultyId);
    if (!faculty) return res.status(404).json({ message: 'Faculty not found' });

    const events = await Event.find({
      club: faculty.clubAssigned,
      status: 'pending',
      approvedByFaculty: false
    }).sort({ date: -1 });

    res.json(events);
  } catch (err) {
    console.error('Error fetching faculty events:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Route to fetch events approved by faculty and pending for venue coordinator
router.get('/faculty_approved', async (req, res) => {
  try {
    const events = await Event.find({ status: 'faculty_approved' }).sort({ date: -1 });
    res.json(events);
  } catch (err) {
    console.error('❌ Fetch faculty approved events error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// 📄 POST: Submit report (by club president)
router.post('/submit-report/:id', async (req, res) => {
  try {
    const { reportLink } = req.body;
    const event = await Event.findById(req.params.id);

    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Save report details
    event.reportLink = reportLink;
    event.reportSubmitted = true;
    await event.save();

    res.status(200).json({ message: 'Report submitted successfully', event });
  } catch (err) {
    console.error('❌ Report submission error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});



// 📄 GET: Pending events for a specific faculty (based on their assigned club)
router.get('/pending/faculty/:facultyId', async (req, res) => {
  try {
    const faculty = await User.findById(req.params.facultyId);
    if (!faculty || faculty.role !== 'faculty') {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    const events = await Event.find({
      club: faculty.clubAssigned,             // ✅ Only their club
      approvedByFaculty: false,
      status: 'pending'
    });

    res.json(events);
  } catch (err) {
    console.error('❌ Fetch pending events error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});




router.get('/venue/stats', getVenueStats); // 👈 Add this route
// 📅 Calendar events by month & year
router.get('/calendar', async (req, res) => {
  try {
    let { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ message: "Month and year are required" });
    }

    month = parseInt(month);
    year = parseInt(year);

    // Create date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const events = await Event.find({
      date: {
        $gte: startDate.toISOString().slice(0, 10), // YYYY-MM-DD
        $lt: endDate.toISOString().slice(0, 10)
      }
    }).sort({ date: 1 });

    return res.json(events);
  } catch (err) {
    console.error("❌ Calendar fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

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
