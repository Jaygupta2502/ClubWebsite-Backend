const Event = require('../models/Event');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');

// ✅ 1. Create Event
const createEvent = async (req, res) => {
  try {
    const files = req.files;
    const body = req.body;

    const uploadFile = async (file) => {
      const blob = bucket.file(`events/${uuidv4()}_${file.originalname}`);
      const blobStream = blob.createWriteStream({ metadata: { contentType: file.mimetype } });
      return new Promise((resolve, reject) => {
        blobStream.on('finish', async () => {
          const [url] = await blob.getSignedUrl({ action: 'read', expires: '03-09-2500' });
          resolve(url);
        });
        blobStream.end(file.buffer);
      });
    };

    const bannerImageUrl = files.bannerImage ? await uploadFile(files.bannerImage[0]) : '';
    const clubLogoUrl = files.clubLogo ? await uploadFile(files.clubLogo[0]) : '';

    const event = new Event({
      ...body,
      submittedBy: req.user.id,
      bannerImageUrl,
      clubLogoUrl
    });

    await event.save();
    res.status(201).json({ message: 'Event created', event });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ 2. Venue Stats
const getVenueStats = async (req, res) => {
  try {
    const allEvents = await Event.find();
    const now = new Date();

    const totalEvents = allEvents.length;
    const eventsThisMonth = allEvents.filter(ev => {
      const eventDate = new Date(ev.date);
      return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear();
    }).length;

    const pendingVenueRequests = allEvents.filter(ev => ev.approvedByFaculty && !ev.approvedByVenue && ev.status === 'faculty_approved').length;
    const rejectedEvents = allEvents.filter(ev => ev.status === 'rejected').length;

    res.json({ totalEvents, eventsThisMonth, pendingVenueRequests, rejectedEvents });
  } catch (err) {
    console.error('❌ Venue stats error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ 3. Get Events for HOD's Department
const getEventsByHodDepartment = async (req, res) => {
  try {
    const { department } = req.user;
    const clubs = await User.find({ role: 'club_president', department }).select('clubName');
    const clubNames = clubs.map(club => club.clubName);

    const events = await Event.find({
      club: { $in: clubNames },
      date: { $gte: new Date() },
    });

    res.json(events);
  } catch (error) {
    console.error("Error fetching events for HOD:", error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ✅ 4. Get Events Pending HOD Approval
const getPendingEventsForHOD = async (req, res) => {
  try {
    const { department } = req.user;

    // Step 1: Find all club names in HOD's department
    const clubs = await User.find({ role: 'club_president', department }).select('clubName');
    const clubNames = clubs.map(club => club.clubName);

    // Step 2: Fetch events from those clubs that are faculty_approved
    const events = await Event.find({
      club: { $in: clubNames },
      status: 'faculty_approved'
    });

    res.status(200).json(events);
  } catch (error) {
    console.error("Error fetching HOD pending events:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// ✅ 5. Approve by HOD
// ✅ Final version of approveEventByHod
const approveEventByHod = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event || event.status !== 'faculty_approved' || event.currentApprovalLevel !== 'hod') {
      return res.status(400).json({ message: 'Event not ready for HOD approval' });
    }

    event.status = 'hod_approved';
    event.currentApprovalLevel = 'vc'; // ✅ Pass to venue coordinator next
    await event.save();

    res.json({ message: 'Event approved by HOD', event });
  } catch (err) {
    console.error('❌ HOD approval failed:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


// ✅ 6. Reject by HOD
const rejectEventByHOD = async (req, res) => {
  try {
    const { reason } = req.body;

    const event = await Event.findByIdAndUpdate(
      req.params.id,
      {
        status: 'rejected',
        rejectionReason: reason,
      },
      { new: true }
    );
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: 'Error rejecting event by HOD' });
  }
};

const approveEventByFaculty = async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event || event.currentApprovalLevel !== 'faculty') {
    return res.status(400).json({ message: 'Event not ready for faculty approval' });
  }

  event.status = 'faculty_approved';
  event.currentApprovalLevel = 'hod';
  await event.save();

  res.json({ message: 'Event approved by Faculty' });
};

const approveEventByVenue = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event || event.currentApprovalLevel !== 'vc') {
      return res.status(400).json({ message: 'Event not ready for VC approval' });
    }

    event.status = 'final_approved';
    event.currentApprovalLevel = 'completed';
    event.approvedByVenue = true;     // ✅ must be true
    if (!event.approvedByFaculty) {
      event.approvedByFaculty = true; // ✅ safety: usually already true, but set if missing
    }

    await event.save();

    res.json({ message: 'Event approved by Venue Coordinator', event });
  } catch (err) {
    console.error('❌ Venue approval failed:', err);
    res.status(500).json({ message: 'Server error' });
  }
};



module.exports = {
  createEvent,
  getVenueStats,
  approveEventByFaculty,
  approveEventByHod,
  getEventsByHodDepartment,
  approveEventByVenue,
  getPendingEventsForHOD, // alias it here
  rejectEventByHOD
};
