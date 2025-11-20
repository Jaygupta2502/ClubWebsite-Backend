// test-email.js
require('dotenv').config();
const sendMail = require('./utils/mailer');

sendMail(
  'your-other-email@gmail.com',
  'Test Email',
  '<p>This is a test from Campus Event System</p>'
)
  .then(() => console.log('✅ Email sent!'))
  .catch(err => console.error('❌ Email error:', err));
