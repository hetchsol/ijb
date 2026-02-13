const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST) {
    logger.warn('SMTP not configured - emails will be logged to console');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  return transporter;
}

async function sendEmail(to, subject, html) {
  const transport = getTransporter();

  if (!transport) {
    logger.info(`[EMAIL] To: ${to} | Subject: ${subject}`);
    return;
  }

  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || '"IJB Innovative Ventures" <noreply@ijbventures.com>',
      to,
      subject,
      html
    });
    logger.info(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    logger.error(`Failed to send email to ${to}:`, error);
  }
}

async function sendWelcomeEmail(email, displayName) {
  await sendEmail(email, 'Welcome to IJB Innovative Ventures!', `
    <h2>Welcome, ${displayName}!</h2>
    <p>Thank you for joining IJB Innovative Ventures - Zambia's digital content marketplace.</p>
    <p>You can now upload your digital content and start earning. Creators keep 85% of every sale!</p>
    <p>Get started by visiting your <a href="${process.env.BASE_URL || 'http://localhost:5000'}/dashboard">Creator Dashboard</a>.</p>
    <p>Best regards,<br>IJB Innovative Ventures Team</p>
  `);
}

async function sendPurchaseReceipt(email, contentTitle, amount, downloadUrl) {
  await sendEmail(email, `Purchase Receipt - ${contentTitle}`, `
    <h2>Purchase Confirmed!</h2>
    <p>Thank you for your purchase on IJB Innovative Ventures.</p>
    <p><strong>Content:</strong> ${contentTitle}</p>
    <p><strong>Amount:</strong> ZMW ${amount.toFixed(2)}</p>
    <p>Your download link is valid for 24 hours (up to 3 downloads).</p>
    <p>Best regards,<br>IJB Innovative Ventures Team</p>
  `);
}

async function sendPayoutNotification(email, amount, status) {
  await sendEmail(email, `Payout ${status} - IJB Innovative Ventures`, `
    <h2>Payout ${status === 'approved' ? 'Approved' : 'Update'}</h2>
    <p>Your withdrawal request for <strong>ZMW ${amount.toFixed(2)}</strong> has been <strong>${status}</strong>.</p>
    ${status === 'approved' ? '<p>The funds will be transferred to your account shortly.</p>' : ''}
    <p>Best regards,<br>IJB Innovative Ventures Team</p>
  `);
}

async function sendPasswordResetEmail(email, resetUrl) {
  await sendEmail(email, 'Password Reset - IJB Innovative Ventures', `
    <h2>Password Reset Request</h2>
    <p>We received a request to reset your password.</p>
    <p><a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#6C5CE7;color:white;text-decoration:none;border-radius:5px;">Reset Password</a></p>
    <p>This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
    <p>Best regards,<br>IJB Innovative Ventures Team</p>
  `);
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPurchaseReceipt,
  sendPayoutNotification,
  sendPasswordResetEmail
};
