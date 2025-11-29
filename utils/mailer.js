// utils/mailer.js
const axios = require("axios");

async function sendMail(to, subject, html) {
  try {
    const res = await axios.post(
      "https://api.resend.com/emails",
      {
        from: process.env.RESEND_FROM_EMAIL,
        to,
        subject,
        html
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("📧 Email sent:", res.data);
    return true;
  } catch (error) {
    console.error("❌ Email send failed:", error.response?.data || error.message);
    return false;
  }
}

module.exports = sendMail;
