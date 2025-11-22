const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const app = express();

// ===== Ensure uploads folder exists =====
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath);
}

// ===== MIDDLEWARE (Must be BEFORE routes) =====
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== Static Upload Folder =====
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(
  '/uploads',
  express.static('uploads', {
    setHeaders: (res, path) => {
      res.set('Access-Control-Allow-Origin', '*'); // CORS fix
    },
  })
);

// ===== ROUTES =====
const authRoutes = require('./routes/authRoutes');
const hodRoutes = require('./routes/hodRoutes');
const eventRoutes = require('./routes/eventRoutes');
const reportRoutes = require('./routes/reportRoutes');
const clubRoutes = require('./routes/clubRoutes');
const deanRoutes = require('./routes/deanRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/hod', hodRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/club', clubRoutes);
app.use('/api/dean', deanRoutes);
app.use("/api/recruitments", require("./routes/recruitmentRoutes"));

// ===== DEFAULT ROUTE =====
app.get('/', (req, res) => {
  res.send('Backend running successfully 🚀');
});

// ===== DATABASE + SERVER START =====
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () =>
      console.log(`✅ Server running on port ${PORT}`)
    );
  })
  .catch((err) => console.error('❌ DB connection error:', err));
