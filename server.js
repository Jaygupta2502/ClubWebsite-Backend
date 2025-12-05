const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const app = express();

// ===== CORS CONFIG (ONLY ONCE) =====
const allowedOrigins = [
  'http://localhost:5173',
  'https://clubwebsite-frontend.onrender.com'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.options('/api/*', cors({
  origin: allowedOrigins,
  credentials: true
}));


// ===== BODY PARSERS =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== Ensure uploads folder exists =====
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath);
}

// ===== Static Upload Folder =====
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== ROUTES =====
const authRoutes = require('./routes/authRoutes');
console.log('AuthRoutes = ', authRoutes);
app.use('/api/auth', authRoutes);
const hodRoutes = require('./routes/hodRoutes');
const eventRoutes = require('./routes/eventRoutes');
const reportRoutes = require('./routes/reportRoutes');
const clubRoutes = require('./routes/clubRoutes');
const deanRoutes = require('./routes/deanRoutes');

console.log("PATH:", __dirname);
console.log("AUTH ROUTE EXISTS:", fs.existsSync(path.join(__dirname,"routes/authRoutes.js")));
console.log("AUTH ROUTE CONTENT:", require('./routes/authRoutes'));

// ===== Routes =====
app.use('/api/auth', require('./routes/authRoutes'));
//app.use('/api/hod', require('./routes/hodRoutes'));
//app.use('/api/events', require('./routes/eventRoutes'));
//app.use('/api/reports', require('./routes/reportRoutes'));
//app.use('/api/club', require('./routes/clubRoutes'));
//app.use('/api/dean', require('./routes/deanRoutes'));
//app.use('/api/recruitments', require('./routes/recruitmentRoutes'));

// ===== DEFAULT ROUTE =====
app.get('/', (req, res) => {
  res.send('Backend running successfully 🚀');
});

// ===== DATABASE + SERVER START =====
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch((err) => console.error('❌ DB connection error:', err));