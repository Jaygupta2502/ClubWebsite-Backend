const express = require("express");
const router = express.Router();
const Recruitment = require("../models/Recruitment");
const verifyToken = require("../middleware/verifyToken");
const User = require("../models/User");
const multer = require("multer");
const path = require("path");

// ============================
// Multer Storage for uploads
// ============================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/recruitments/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

// ============================
// CREATE Recruitment
// ============================
router.post(
  "/",
  verifyToken,
  upload.fields([
    { name: "clubLogo", maxCount: 1 },
    { name: "attachments", maxCount: 10 }
  ]),
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);

      if (!user || user.role !== "club_president") {
        return res.status(403).json({ message: "Only club presidents can create recruitments" });
      }

      const clubLogoUrl = req.files["clubLogo"]
        ? `/uploads/recruitments/${req.files["clubLogo"][0].filename}`
        : "";

      const attachments = req.files["attachments"]
        ? req.files["attachments"].map((file) => ({
            fileName: file.originalname,
            fileUrl: `/uploads/recruitments/${file.filename}`
          }))
        : [];

      const newRecruitment = new Recruitment({
        ...req.body,
        clubLogoUrl,
        attachments,
        club: user.clubName,
        createdBy: user._id
      });

      await newRecruitment.save();

      res.status(201).json({
        message: "Recruitment created successfully",
        recruitment: newRecruitment
      });
    } catch (err) {
      console.error("❌ Recruitment Create Error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ============================
// GET All Recruitments
// ============================
router.get("/", async (req, res) => {
  try {
    const recruitments = await Recruitment.find().sort({ createdDate: -1 });
    res.json(recruitments);
  } catch (err) {
    console.error("❌ Recruitment Fetch Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ============================
// GET Single Recruitment
// ============================
router.get("/:id", async (req, res) => {
  try {
    const recruitment = await Recruitment.findById(req.params.id);
    if (!recruitment) {
      return res.status(404).json({ message: "Recruitment not found" });
    }
    res.json(recruitment);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ============================
// UPDATE Recruitment
// ============================
router.patch(
  "/:id",
  verifyToken,
  upload.fields([
    { name: "clubLogo", maxCount: 1 },
    { name: "attachments", maxCount: 10 }
  ]),
  async (req, res) => {
    try {
      let recruitment = await Recruitment.findById(req.params.id);
      if (!recruitment) return res.status(404).json({ message: "Recruitment not found" });

      const clubLogoUrl = req.files["clubLogo"]
        ? `/uploads/recruitments/${req.files["clubLogo"][0].filename}`
        : recruitment.clubLogoUrl;

      const newAttachments = req.files["attachments"]
        ? req.files["attachments"].map((file) => ({
            fileName: file.originalname,
            fileUrl: `/uploads/recruitments/${file.filename}`
          }))
        : [];

      recruitment = await Recruitment.findByIdAndUpdate(
        req.params.id,
        {
          ...req.body,
          clubLogoUrl,
          attachments: [...recruitment.attachments, ...newAttachments]
        },
        { new: true }
      );

      res.json({ message: "Recruitment updated", recruitment });
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ============================
// DELETE Recruitment
// ============================
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const recruitment = await Recruitment.findByIdAndDelete(req.params.id);
    if (!recruitment) {
      return res.status(404).json({ message: "Recruitment not found" });
    }

    res.json({ message: "Recruitment deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
