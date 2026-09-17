'use strict';

const nodemailer = require('nodemailer');

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD;
const APP_URL    = process.env.APP_URL || 'http://localhost:5173';
const APP_NAME   = 'Mode Mentor';

// Create transporter lazily so startup doesn't fail if creds are missing
let _transporter = null;
function getTransporter() {
  if (!_transporter) {
    if (!GMAIL_USER || !GMAIL_PASS) {
      throw new Error('[EmailService] GMAIL_USER or GMAIL_APP_PASSWORD not set in .env');
    }
    _transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_PASS }
    });
  }
  return _transporter;
}

/** Common branded wrapper for all HTML emails */
function wrapHtml(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
  <style>
    body { margin:0; padding:0; background:#0f1220; font-family:'Segoe UI',Arial,sans-serif; color:#e2e8f0; }
    .wrap { max-width:560px; margin:40px auto; background:rgba(20,27,50,0.98); border-radius:20px; overflow:hidden; border:1px solid rgba(255,255,255,0.08); box-shadow:0 24px 64px rgba(0,0,0,0.5); }
    .header { background:linear-gradient(135deg,#a78bfa,#6d28d9); padding:36px 40px; text-align:center; }
    .header-logo { font-size:28px; font-weight:800; color:#fff; letter-spacing:-0.5px; }
    .header-logo span { opacity:.7; font-weight:400; }
    .header-tag { font-size:13px; color:rgba(255,255,255,0.65); margin-top:4px; }
    .body { padding:36px 40px; }
    .title { font-size:22px; font-weight:700; color:#fff; margin:0 0 12px; }
    .text { font-size:15px; color:#cbd5e1; line-height:1.7; margin:0 0 20px; }
    .btn { display:inline-block; background:linear-gradient(135deg,#a78bfa,#7c3aed); color:#fff !important; text-decoration:none; padding:14px 32px; border-radius:12px; font-size:15px; font-weight:700; margin:8px 0 24px; }
    .divider { border:none; border-top:1px solid rgba(255,255,255,0.07); margin:24px 0; }
    .small { font-size:12px; color:rgba(255,255,255,0.3); line-height:1.6; }
    .highlight { color:#a78bfa; font-weight:600; }
    .footer { background:rgba(0,0,0,0.25); padding:20px 40px; text-align:center; font-size:12px; color:rgba(255,255,255,0.25); }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div class="header-logo">Mode<span>Mentor</span></div>
      <div class="header-tag">AI-Powered Wellness Companion</div>
    </div>
    <div class="body">
      ${bodyHtml}
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} Mode Mentor &nbsp;·&nbsp; This email was sent by moodmentor01@gmail.com<br/>
      Please do not reply to this email.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Send a password reset email
 * @param {string} toEmail
 * @param {string} rawToken - the unencoded token for the reset URL
 * @param {string} displayName
 */
async function sendPasswordResetEmail(toEmail, rawToken, displayName = 'there') {
  const resetUrl = `${APP_URL}?reset_token=${encodeURIComponent(rawToken)}`;
  const html = wrapHtml('Reset Your Password', `
    <p class="title">Reset Your Password 🔐</p>
    <p class="text">Hi <span class="highlight">${displayName}</span>,</p>
    <p class="text">We received a request to reset the password for your Mode Mentor account. Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.</p>
    <div style="text-align:center">
      <a href="${resetUrl}" class="btn">Reset My Password</a>
    </div>
    <hr class="divider"/>
    <p class="small">If you didn't request a password reset, you can safely ignore this email — your password won't change.<br/><br/>
    Or copy and paste this link into your browser:<br/><span style="color:#a78bfa;word-break:break-all">${resetUrl}</span></p>
  `);

  await getTransporter().sendMail({
    from: `"${APP_NAME}" <${GMAIL_USER}>`,
    to: toEmail,
    subject: '🔐 Reset Your Mode Mentor Password',
    html
  });
  console.log(`[EmailService] Password reset email sent to ${toEmail}`);
}

/**
 * Notify a user that the admin replied to their Mentor Note
 * @param {string} toEmail
 * @param {string} displayName
 * @param {string} originalMessage - user's original post
 * @param {string} replyText - admin reply
 */
async function sendMentorReplyEmail(toEmail, displayName = 'there', originalMessage, replyText) {
  const html = wrapHtml('Your Mentor Replied', `
    <p class="title">Your Mentor Replied 💬</p>
    <p class="text">Hi <span class="highlight">${displayName}</span>,</p>
    <p class="text">Your wellness mentor has replied to your message on Mode Mentor.</p>
    <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:16px 20px;margin:0 0 16px;border-left:3px solid #a78bfa">
      <p style="font-size:12px;color:rgba(255,255,255,0.35);margin:0 0 6px;text-transform:uppercase;letter-spacing:.05em">Your message</p>
      <p style="font-size:14px;color:#94a3b8;margin:0;line-height:1.6">${originalMessage}</p>
    </div>
    <div style="background:rgba(129,199,132,0.1);border-radius:12px;padding:16px 20px;margin:0 0 24px;border-left:3px solid #81c784">
      <p style="font-size:12px;color:#81c784;margin:0 0 6px;text-transform:uppercase;letter-spacing:.05em;font-weight:700">🛡 Mentor reply</p>
      <p style="font-size:15px;color:#e2e8f0;margin:0;line-height:1.6">${replyText}</p>
    </div>
    <div style="text-align:center">
      <a href="${APP_URL}" class="btn">View in App</a>
    </div>
    <hr class="divider"/>
    <p class="small">You're receiving this because you posted a message in the Mentor Notes section of Mode Mentor.</p>
  `);

  await getTransporter().sendMail({
    from: `"${APP_NAME}" <${GMAIL_USER}>`,
    to: toEmail,
    subject: '💬 Your Mode Mentor mentor replied to your note',
    html
  });
  console.log(`[EmailService] Mentor reply notification sent to ${toEmail}`);
}

/**
 * Send a wellness broadcast notification to a user
 * @param {string} toEmail
 * @param {string} displayName
 * @param {string} suggestionText
 * @param {string|null} department
 */
async function sendBroadcastEmail(toEmail, displayName = 'there', suggestionText, department = null) {
  const targetLabel = department ? `the <strong>${department}</strong> team` : 'your team';
  const html = wrapHtml('Wellness Message from Your Mentor', `
    <p class="title">Message from Your Mentor 🌱</p>
    <p class="text">Hi <span class="highlight">${displayName}</span>,</p>
    <p class="text">Your wellness mentor has shared a message for ${targetLabel}:</p>
    <div style="background:rgba(255,183,77,0.1);border-radius:14px;padding:20px 24px;margin:0 0 24px;border-left:3px solid #ffb74d">
      <p style="font-size:16px;color:#fff;margin:0;line-height:1.7;font-style:italic">"${suggestionText}"</p>
    </div>
    <div style="text-align:center">
      <a href="${APP_URL}" class="btn">Open Mode Mentor</a>
    </div>
    <hr class="divider"/>
    <p class="small">You're receiving this because you're part of a team using Mode Mentor. Go to your Progress page to see all mentor messages.</p>
  `);

  await getTransporter().sendMail({
    from: `"${APP_NAME}" <${GMAIL_USER}>`,
    to: toEmail,
    subject: '🌱 A wellness message from your mentor',
    html
  });
  console.log(`[EmailService] Broadcast email sent to ${toEmail}`);
}

/**
 * Send a daily check-in reminder
 * @param {string} toEmail
 * @param {string} displayName
 */
async function sendCheckinReminderEmail(toEmail, displayName = 'there') {
  const html = wrapHtml('Daily Wellness Check-in Reminder', `
    <p class="title">Time for Your Daily Check-in ✨</p>
    <p class="text">Hi <span class="highlight">${displayName}</span>,</p>
    <p class="text">A few minutes of reflection goes a long way. Your daily Mode Mentor wellness check-in is ready — share how you're feeling today and get personalised insights and suggestions.</p>
    <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap">
      <div style="flex:1;min-width:120px;background:rgba(255,255,255,0.04);border-radius:12px;padding:14px;text-align:center">
        <div style="font-size:24px">🎯</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:6px">Earn Mode Points</div>
      </div>
      <div style="flex:1;min-width:120px;background:rgba(255,255,255,0.04);border-radius:12px;padding:14px;text-align:center">
        <div style="font-size:24px">📊</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:6px">Track your mood</div>
      </div>
      <div style="flex:1;min-width:120px;background:rgba(255,255,255,0.04);border-radius:12px;padding:14px;text-align:center">
        <div style="font-size:24px">💡</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:6px">Get AI insights</div>
      </div>
    </div>
    <div style="text-align:center">
      <a href="${APP_URL}" class="btn">Start My Check-in</a>
    </div>
    <hr class="divider"/>
    <p class="small">You're receiving this because you enabled daily check-in reminders in Mode Mentor. You can turn these off anytime in your Profile → Preferences.</p>
  `);

  await getTransporter().sendMail({
    from: `"${APP_NAME}" <${GMAIL_USER}>`,
    to: toEmail,
    subject: '✨ Your daily wellness check-in is ready',
    html
  });
  console.log(`[EmailService] Check-in reminder sent to ${toEmail}`);
}

/**
 * Verify the Gmail connection (call once on startup)
 */
async function verifyConnection() {
  if (!GMAIL_USER || !GMAIL_PASS) {
    console.warn('[EmailService] ⚠ Gmail credentials not configured — email notifications disabled.');
    return false;
  }
  try {
    await getTransporter().verify();
    console.log('[EmailService] ✓ Gmail SMTP connection verified');
    return true;
  } catch (err) {
    console.warn('[EmailService] ⚠ Gmail SMTP verify failed:', err.message);
    return false;
  }
}

module.exports = {
  sendPasswordResetEmail,
  sendMentorReplyEmail,
  sendBroadcastEmail,
  sendCheckinReminderEmail,
  verifyConnection
};
