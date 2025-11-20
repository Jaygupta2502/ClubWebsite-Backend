const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Ensure uploads folder exists
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath);
}


const authRoutes = require('./routes/authRoutes');
const hodRoutes = require('./routes/hodRoutes');
const eventRoutes = require('./routes/eventRoutes');
const reportRoutes = require('./routes/reportRoutes');
const app = express();





// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/club', require('./routes/clubRoutes'));
app.use('/api/dean', require('./routes/deanRoutes'));


// Serve local uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static('uploads', {
  setHeaders: (res, path) => {
    res.set('Access-Control-Allow-Origin', '*'); // 🔥 CORS fix for canvas
  }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/hod', hodRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/reports', reportRoutes);


mongoose.connect(process.env.MONGO_URI)
  .then(() => app.listen(5000, () => console.log('✅ Server running on port 5000')))
  .catch(err => console.error('❌ DB connection error:', err));
