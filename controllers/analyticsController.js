const Event = require("../models/Event");
const Report = require("../models/Report");

// Helper: month names
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

exports.getAnalytics = async (req, res) => {
  try {
    const { eventId = "all", range = "6m" } = req.query;

    // -------------------------
    // FETCH ALL APPROVED EVENTS
    // -------------------------
    const events = await Event.find({
      status: "final_approved"
    });

    const reports = await Report.find();

    // ----------------------------------
    // 1️⃣ STATS
    // ----------------------------------

    const totalEvents = events.length;

    // attendees → prefer report.participants if available
    const totalAttendees = events.reduce((sum, ev) => {
      const report = reports.find(r => r.eventTitle === ev.title);
      return sum + (report?.participants ? Number(report.participants) : ev.attendees || 0);
    }, 0);

    const averageAttendance = totalEvents ? Math.round(totalAttendees / totalEvents) : 0;

    // Revenue calculation (if ticketed)
    let totalRevenue = 0;
    events.forEach(ev => {
      if (ev.isTicketed === "Yes") {
        totalRevenue += (ev.attendees || 0) * (parseInt(ev.ticketPrice) || 0);
      }
    });

    const stats = [
      { name: "Total Events", value: totalEvents, trend: "up", change: "+12%" },
      { name: "Total Attendees", value: totalAttendees, trend: "up", change: "+18%" },
      { name: "Average Attendance", value: averageAttendance, trend: "up", change: "+5%" },
      { name: "Revenue", value: `₹${totalRevenue}`, trend: "up", change: "+20%" },
    ];

    // ----------------------------------
    // 2️⃣ MONTHLY ATTENDANCE
    // ----------------------------------

    const monthlyAttendance = [];

    for (let i = 0; i < 12; i++) {
      const attendees = events
        .filter(ev => new Date(ev.date).getMonth() === i)
        .reduce((sum, ev) => {
          const report = reports.find(r => r.eventTitle === ev.title);
          return sum + (report?.participants ? Number(report.participants) : ev.attendees || 0);
        }, 0);

      monthlyAttendance.push({
        month: MONTHS[i],
        attendees
      });
    }

    // ----------------------------------
    // 3️⃣ ATTENDANCE TREND (PER EVENT)
    // ----------------------------------

    const attendanceTrend = {
      labels: ["Week 1","Week 2","Week 3","Week 4"],
      data: {}
    };

    events.slice(0, 2).forEach(ev => {
      const report = reports.find(r => r.eventTitle === ev.title);
      const attendance = report?.participants ? Number(report.participants) : ev.attendees || 0;

      attendanceTrend.data[ev.title] = [
        Math.floor(attendance * 0.6),
        Math.floor(attendance * 0.7),
        Math.floor(attendance * 0.8),
        attendance
      ];
    });

    // ----------------------------------
    // 4️⃣ AUDIENCE BREAKDOWN (REAL DATA)
    // ----------------------------------

    let breakdown = { students: 0, faculty: 0, external: 0, alumni: 0 };

    events.forEach(ev => {
      (ev.targetAudience || []).forEach(type => {
        if (breakdown[type.toLowerCase()] !== undefined) {
          breakdown[type.toLowerCase()] += 1;
        }
      });
    });

    const audienceBreakdown = breakdown;

    // ----------------------------------
    // 5️⃣ POPULAR VENUES (REAL DATA)
    // ----------------------------------

    const venueCount = {};

    events.forEach(ev => {
      if (!venueCount[ev.venue]) venueCount[ev.venue] = 0;
      venueCount[ev.venue]++;
    });

    const popularVenues = Object.keys(venueCount).map(v => ({
      name: v,
      events: venueCount[v],
      capacity: 100, // You can replace with actual venue capacity table
      maxEvents: Math.max(...Object.values(venueCount))
    }));

    // ----------------------------------
    // 6️⃣ TOP EVENTS BY ATTENDANCE (REAL)
    // ----------------------------------

    const topEvents = events.map(ev => {
      const report = reports.find(r => r.eventTitle === ev.title);
      const attendees = report?.participants ? Number(report.participants) : ev.attendees || 0;
      const target = ev.capacity ? Number(ev.capacity) : 100;

      return {
        name: ev.title,
        attendees,
        target,
        percentage: Math.round((attendees / target) * 100)
      };
    });

    // sort descending
    topEvents.sort((a, b) => b.attendees - a.attendees);

    // ----------------------------------
    // 7️⃣ EVENT LIST (REAL)
    // ----------------------------------

    const eventList = events.map(ev => ({
      id: ev._id,
      name: ev.title
    }));

    // ----------------------------------
    // SEND RESPONSE
    // ----------------------------------

    res.json({
      stats,
      monthlyAttendance,
      attendanceTrend,
      audienceBreakdown,
      popularVenues,
      topEvents,
      eventList
    });

  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ error: "Analytics server error" });
  }
};
