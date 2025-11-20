const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendMail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: `"Campus Event System" <${process.env.EMAIL_USER}>`,
      to, // single email string expected since we'll send one-by-one now
      subject,
      html
    };
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Mail sent to: ${to} | response: ${info.response}`);
    return info;
  } catch (err) {
    console.error(`❌ Error sending mail to ${to}:`, err);
    throw err;
  }
};

module.exports = sendMail;
