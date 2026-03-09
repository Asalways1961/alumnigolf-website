// ── ALUMNI GOLF EMAIL SERVICE ─────────────────────────────────────────────────
// Uses Resend API via a Supabase Edge Function proxy
// All emails sent from: noreply@alumnigolf.net
// Broadcasts sent from: info@alumnigolf.net

const RESEND_API_KEY = 're_JZrAhBP8_9tQvrEkRyRKjCsPfWtNMBRtQ';
const FROM_NOREPLY   = 'Alumni Golf <noreply@alumnigolf.net>';
const FROM_INFO      = 'Alumni Golf <info@alumnigolf.net>';
const SITE_URL       = 'https://alumnigolf.net';

// ── SEND HELPER ───────────────────────────────────────────────────────────────
async function sendEmail({ to, from, subject, html }) {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from: from || FROM_NOREPLY, to, subject, html })
    });
    const data = await res.json();
    if (!res.ok) console.error('Email error:', data);
    return data;
  } catch (err) {
    console.error('Email send failed:', err);
  }
}

// ── BASE TEMPLATE ─────────────────────────────────────────────────────────────
function baseTemplate(content) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;background:#f4f1eb;font-family:'Georgia',serif;}
  .wrap{max-width:600px;margin:0 auto;background:#ffffff;}
  .header{background:#0A1F44;padding:32px 40px;text-align:center;border-bottom:3px solid #C89B3C;}
  .header img{height:70px;width:auto;}
  .header h1{color:#C89B3C;font-size:13px;letter-spacing:3px;text-transform:uppercase;margin:12px 0 0;font-family:Arial,sans-serif;font-weight:600;}
  .body{padding:40px;}
  .gold-line{width:50px;height:2px;background:#C89B3C;margin:0 0 24px;}
  h2{color:#0A1F44;font-size:24px;margin:0 0 16px;}
  p{color:#444;font-size:15px;line-height:1.7;margin:0 0 16px;}
  .info-box{background:#f8f6f0;border-left:3px solid #C89B3C;padding:16px 20px;border-radius:0 8px 8px 0;margin:20px 0;}
  .info-box p{margin:4px 0;font-size:14px;}
  .info-box strong{color:#0A1F44;}
  .btn{display:inline-block;background:#C89B3C;color:#0A1F44;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:1px;text-transform:uppercase;margin:8px 0;}
  .divider{height:1px;background:#eee;margin:28px 0;}
  .footer{background:#0A1F44;padding:24px 40px;text-align:center;}
  .footer p{color:rgba(255,255,255,0.5);font-size:11px;margin:4px 0;font-family:Arial,sans-serif;}
  .footer a{color:#C89B3C;text-decoration:none;}
  .badge{display:inline-block;background:rgba(200,155,60,0.15);border:1px solid #C89B3C;color:#0A1F44;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:1px;}
</style></head><body>
<div class="wrap">
  <div class="header">
    <img src="https://alumnigolf.net/Full_Logo.jpg" alt="Alumni Schools Golf Challenge" />
    <h1>Alumni Schools Golf Challenge</h1>
  </div>
  <div class="body">${content}</div>
  <div class="footer">
    <p>© 2026 Alumni Schools Golf Challenge · Legacy Event Ventures (Pty) Ltd</p>
    <p><a href="mailto:info@alumnigolf.net">info@alumnigolf.net</a> · <a href="${SITE_URL}">${SITE_URL}</a></p>
    <p style="margin-top:8px;color:rgba(255,255,255,0.3)">You're receiving this because you registered for the Alumni Schools Golf Challenge.</p>
  </div>
</div></body></html>`;
}

// ── 1. WELCOME EMAIL ──────────────────────────────────────────────────────────
async function sendWelcomeEmail({ name, email, school, teamNumber, referenceNumber }) {
  const html = baseTemplate(`
    <div class="gold-line"></div>
    <h2>Welcome to the Challenge, ${name.split(' ')[0]}! ⛳</h2>
    <p>Your registration for the <strong>Alumni Schools Golf Challenge</strong> has been received. We're thrilled to have you representing <strong>${school}</strong>.</p>
    <div class="info-box">
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>School:</strong> ${school}</p>
      <p><strong>Team Number:</strong> ${teamNumber || '—'}</p>
      <p><strong>Payment Reference:</strong> ${referenceNumber || '—'}</p>
    </div>
    <p>Your next step is to complete your payment if you haven't already, and log in to your Player Portal to track your registration.</p>
    <p style="text-align:center;margin:28px 0">
      <a href="${SITE_URL}/portal.html" class="btn">Go to Player Portal</a>
    </p>
    <div class="divider"></div>
    <p style="font-size:13px;color:#888">If you have any questions, reply to this email or contact us at <a href="mailto:info@alumnigolf.net" style="color:#C89B3C">info@alumnigolf.net</a>.</p>
  `);
  return sendEmail({ to: email, subject: `Welcome to the Alumni Schools Golf Challenge, ${name.split(' ')[0]}! ⛳`, html });
}

// ── 2. PAYMENT CONFIRMATION ───────────────────────────────────────────────────
async function sendPaymentConfirmationEmail({ name, email, school, teamNumber, amount }) {
  const html = baseTemplate(`
    <div class="gold-line"></div>
    <h2>Payment Confirmed ✅</h2>
    <p>Great news, ${name.split(' ')[0]}! Your payment for the Alumni Schools Golf Challenge has been confirmed.</p>
    <div class="info-box">
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>School:</strong> ${school}</p>
      <p><strong>Team Number:</strong> ${teamNumber}</p>
      <p><strong>Amount Paid:</strong> R${amount ? amount.toLocaleString() : '1,500'}</p>
      <p><strong>Status:</strong> <span style="color:#1B4D2E;font-weight:700">✅ Paid</span></p>
    </div>
    <p>Your entry is now fully confirmed. You can view your match schedule and division on your Player Portal once divisions are announced.</p>
    <p style="text-align:center;margin:28px 0">
      <a href="${SITE_URL}/portal.html" class="btn">View Player Portal</a>
    </p>
  `);
  return sendEmail({ to: email, subject: 'Payment Confirmed — Alumni Schools Golf Challenge ✅', html });
}

// ── 3. PAYMENT REMINDER ───────────────────────────────────────────────────────
async function sendPaymentReminderEmail({ name, email, school, teamNumber, referenceNumber }) {
  const html = baseTemplate(`
    <div class="gold-line"></div>
    <h2>Payment Reminder ⏰</h2>
    <p>Hi ${name.split(' ')[0]}, just a friendly reminder that your entry fee for the Alumni Schools Golf Challenge is still outstanding.</p>
    <div class="info-box">
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>School:</strong> ${school}</p>
      <p><strong>Team Number:</strong> ${teamNumber || '—'}</p>
      <p><strong>Payment Reference:</strong> ${referenceNumber || '—'}</p>
      <p><strong>Amount Due:</strong> R1,500 per player or R2,800 per team</p>
    </div>
    <p><strong>EFT Banking Details:</strong></p>
    <div class="info-box">
      <p><strong>Account Name:</strong> Legacy Event Ventures (Pty) Ltd</p>
      <p><strong>Bank:</strong> FNB — Cape Gate</p>
      <p><strong>Account Number:</strong> 63192217123</p>
      <p><strong>Branch Code:</strong> 251945</p>
      <p><strong>Reference:</strong> ${referenceNumber || teamNumber || name}</p>
    </div>
    <p>Please use your reference number above and send your proof of payment to <a href="mailto:info@alumnigolf.net" style="color:#C89B3C">info@alumnigolf.net</a> or upload it via your Player Portal.</p>
    <p style="text-align:center;margin:28px 0">
      <a href="${SITE_URL}/portal.html" class="btn">Upload Proof of Payment</a>
    </p>
  `);
  return sendEmail({ to: email, subject: 'Payment Reminder — Alumni Schools Golf Challenge ⏰', html });
}

// ── 4. PARTNER INVITATION ─────────────────────────────────────────────────────
async function sendPartnerInvitationEmail({ inviterName, inviterSchool, teamNumber, partnerEmail, partnerName, inviteLink, isCaptainCopy }) {
  const firstName = partnerName ? partnerName.split(' ')[0] : 'there';
  const link = inviteLink || `${SITE_URL}/register.html?invite=1`;
  const captainNote = isCaptainCopy ? `
    <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:13px;color:#856404;">
      📋 <strong>This is a copy of the invitation sent to ${partnerName || 'your partner'}.</strong> You can forward this email to them if they haven't received it.
    </div>` : '';

  const html = baseTemplate(`
    ${captainNote}
    <div class="gold-line"></div>
    <h2>${isCaptainCopy ? `Invitation Sent to ${partnerName || 'Your Partner'} ✅` : `Congratulations! You're In! 🎉`}</h2>
    <p>Hi ${isCaptainCopy ? inviterName.split(' ')[0] : firstName},</p>
    ${isCaptainCopy
      ? `<p>You have successfully invited <strong>${partnerName}</strong> to join your team. The invitation below has been sent to them.</p>`
      : `<p><strong>${inviterName}</strong> has invited you to join their team in the <strong>Alumni Schools Golf Challenge</strong>, representing <strong>${inviterSchool}</strong>.</p>`
    }
    <div class="info-box">
      <p><strong>Team:</strong> ${teamNumber || inviterSchool}</p>
      <p><strong>School:</strong> ${inviterSchool}</p>
      <p><strong>Captain:</strong> ${inviterName}</p>
      <p><strong>Tournament:</strong> Alumni Schools Golf Challenge — Inaugural Season 2026/27</p>
      <p><strong>Format:</strong> Betterball Matchplay</p>
    </div>
    ${!isCaptainCopy ? `
    <p>To complete your registration and join the team, click the button below:</p>
    <p style="text-align:center;margin:28px 0">
      <a href="${link}" class="btn">Complete My Registration →</a>
    </p>
    <p style="text-align:center;font-size:12px;color:#aaa">Or visit: <a href="${SITE_URL}/register.html?invite=1" style="color:#C89B3C">${SITE_URL}/register.html</a> and click "I Received an Invite"</p>
    ` : `
    <div style="margin-top:16px;padding:12px;background:#f8f6f0;border-radius:8px;font-size:12px;color:#888;text-align:center;">
      Partner's registration link: <a href="${link}" style="color:#C89B3C">${link}</a>
    </div>
    `}
    <div class="divider"></div>
    <p style="font-size:13px;color:#888">Questions? Contact us at <a href="mailto:info@alumnigolf.net" style="color:#C89B3C">info@alumnigolf.net</a></p>
  `);

  const subject = isCaptainCopy
    ? `Copy: Invitation sent to ${partnerName || 'your partner'} — Alumni Golf`
    : `Congratulations! ${inviterName} has invited you to the Alumni Schools Golf Challenge! 🎉`;

  return sendEmail({ to: partnerEmail, subject, html });
}

// ── 5. PARTNER REGISTRATION REMINDER ─────────────────────────────────────────
async function sendPartnerReminderEmail({ playerName, playerEmail, playerSchool, partnerName, partnerEmail }) {
  const html = baseTemplate(`
    <div class="gold-line"></div>
    <h2>Your Partner Hasn't Registered Yet ⏳</h2>
    <p>Hi ${playerName.split(' ')[0]},</p>
    <p>Just a heads-up — your partner <strong>${partnerName || 'your invited partner'}</strong> has not yet completed their registration for the Alumni Schools Golf Challenge.</p>
    <p>Your team entry for <strong>${playerSchool}</strong> is not complete until both players have registered.</p>
    <p>You can resend the invitation from your Player Portal, or ask your partner to register directly:</p>
    <p style="text-align:center;margin:28px 0">
      <a href="${SITE_URL}/register.html" class="btn">Register as Partner</a>
    </p>
    <div class="divider"></div>
    <p style="font-size:13px;color:#888">Need help? Contact us at <a href="mailto:info@alumnigolf.net" style="color:#C89B3C">info@alumnigolf.net</a></p>
  `);
  return sendEmail({ to: playerEmail, subject: 'Your partner hasn\'t registered yet — Alumni Schools Golf Challenge ⏳', html });
}

// ── 6. MATCH REMINDER ─────────────────────────────────────────────────────────
async function sendMatchReminderEmail({ playerName, playerEmail, homeTeam, awayTeam, round, matchDate, venue }) {
  const html = baseTemplate(`
    <div class="gold-line"></div>
    <h2>Match Reminder 🎯</h2>
    <p>Hi ${playerName.split(' ')[0]}, your upcoming match in the Alumni Schools Golf Challenge is approaching!</p>
    <div class="info-box">
      <p><strong>Round:</strong> ${round}</p>
      <p><strong>Home Team:</strong> ${homeTeam}</p>
      <p><strong>Away Team:</strong> ${awayTeam}</p>
      ${matchDate ? `<p><strong>Date:</strong> ${new Date(matchDate).toLocaleDateString('en-ZA', {weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>` : ''}
      ${venue ? `<p><strong>Venue:</strong> ${venue}</p>` : ''}
    </div>
    <p>Remember: the <strong>home team</strong> is responsible for booking the course. Please confirm arrangements with your opponents via the Player Portal.</p>
    <p style="text-align:center;margin:28px 0">
      <a href="${SITE_URL}/portal.html" class="btn">View Match Details</a>
    </p>
  `);
  return sendEmail({ to: playerEmail, subject: `Match Reminder: ${homeTeam} vs ${awayTeam} — Round ${round} 🎯`, html });
}

// ── 7. MATCH RESULT NOTIFICATION ─────────────────────────────────────────────
async function sendMatchResultEmail({ playerName, playerEmail, homeTeam, awayTeam, winner, score, round }) {
  const won = winner && (playerEmail || '').toLowerCase().includes((winner || '').toLowerCase().split(' ')[0].toLowerCase());
  const html = baseTemplate(`
    <div class="gold-line"></div>
    <h2>Match Result — Round ${round} 🏆</h2>
    <p>Hi ${playerName.split(' ')[0]}, the result for your Round ${round} match has been confirmed.</p>
    <div class="info-box">
      <p><strong>Round:</strong> ${round}</p>
      <p><strong>Home Team:</strong> ${homeTeam}</p>
      <p><strong>Away Team:</strong> ${awayTeam}</p>
      <p><strong>Winner:</strong> <span style="color:#1B4D2E;font-weight:700">${winner || '—'}</span></p>
      ${score ? `<p><strong>Score:</strong> ${score}</p>` : ''}
    </div>
    <p>Log in to your Player Portal to view your updated division standings and next round draw.</p>
    <p style="text-align:center;margin:28px 0">
      <a href="${SITE_URL}/portal.html" class="btn">View Standings</a>
    </p>
  `);
  return sendEmail({ to: playerEmail, subject: `Match Result: ${homeTeam} vs ${awayTeam} — Round ${round}`, html });
}

// ── 8. ADMIN BROADCAST ────────────────────────────────────────────────────────
async function sendBroadcastEmail({ recipients, subject, title, message }) {
  const html = baseTemplate(`
    <div class="gold-line"></div>
    <h2>${title}</h2>
    ${message.split('\n').map(p => `<p>${p}</p>`).join('')}
    <div class="divider"></div>
    <p style="text-align:center;margin:28px 0">
      <a href="${SITE_URL}/portal.html" class="btn">Go to Player Portal</a>
    </p>
  `);
  // Send to each recipient individually
  const results = [];
  for (const email of recipients) {
    results.push(await sendEmail({ to: email, from: FROM_INFO, subject, html }));
  }
  return results;
}

// ── EXPORT ────────────────────────────────────────────────────────────────────
window.EmailService = {
  sendWelcomeEmail,
  sendPaymentConfirmationEmail,
  sendPaymentReminderEmail,
  sendPartnerInvitationEmail,
  sendPartnerReminderEmail,
  sendMatchReminderEmail,
  sendMatchResultEmail,
  sendBroadcastEmail,
};
