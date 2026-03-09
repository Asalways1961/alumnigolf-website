// Supabase Edge Function: partner-reminder
// Runs daily — finds invitations sent 3+ days ago where partner hasn't registered
// Sends reminder email to captain and re-sends invite to partner

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = 're_JZrAhBP8_9tQvrEkRyRKjCsPfWtNMBRtQ';
const SITE_URL = 'https://alumnigolf.net';
const FROM = 'Alumni Golf <noreply@alumnigolf.net>';

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  return res.json();
}

function emailTemplate(content: string) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{margin:0;padding:0;background:#f4f1eb;font-family:Georgia,serif;}
  .wrap{max-width:600px;margin:0 auto;background:#fff;}
  .header{background:#0A1F44;padding:32px 40px;text-align:center;border-bottom:3px solid #C89B3C;}
  .header h1{color:#C89B3C;font-size:13px;letter-spacing:3px;text-transform:uppercase;margin:12px 0 0;font-family:Arial,sans-serif;}
  .body{padding:40px;}
  .gold-line{width:50px;height:2px;background:#C89B3C;margin:0 0 24px;}
  h2{color:#0A1F44;font-size:24px;margin:0 0 16px;}
  p{color:#444;font-size:15px;line-height:1.7;margin:0 0 16px;}
  .info-box{background:#f8f6f0;border-left:3px solid #C89B3C;padding:16px 20px;border-radius:0 8px 8px 0;margin:20px 0;}
  .info-box p{margin:4px 0;font-size:14px;}
  .btn{display:inline-block;background:#C89B3C;color:#0A1F44;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:1px;text-transform:uppercase;margin:8px 0;}
  .footer{background:#0A1F44;padding:24px 40px;text-align:center;}
  .footer p{color:rgba(255,255,255,0.5);font-size:11px;margin:4px 0;font-family:Arial,sans-serif;}
  .footer a{color:#C89B3C;text-decoration:none;}
</style></head><body>
<div class="wrap">
  <div class="header">
    <img src="https://alumnigolf.net/Full_Logo.jpg" alt="Alumni Schools Golf Challenge" style="height:70px;width:auto;" />
    <h1>Alumni Schools Golf Challenge</h1>
  </div>
  <div class="body">${content}</div>
  <div class="footer">
    <p>© 2026 Alumni Schools Golf Challenge · Legacy Event Ventures (Pty) Ltd</p>
    <p><a href="mailto:info@alumnigolf.net">info@alumnigolf.net</a> · <a href="${SITE_URL}">${SITE_URL}</a></p>
  </div>
</div></body></html>`;
}

Deno.serve(async () => {
  const sb = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // Find invitations sent 3+ days ago where:
  // 1. Partner has NOT registered (no player row with that mobile)
  // 2. Reminder hasn't been sent yet
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: invitations, error } = await sb
    .from('player_invitations')
    .select('*')
    .lt('created_at', threeDaysAgo)
    .is('reminder_sent_at', null);

  if (error) {
    console.error('Error fetching invitations:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let sent = 0;
  let skipped = 0;

  for (const inv of (invitations ?? [])) {
    // Check if partner has already registered
    const { data: partner } = await sb
      .from('players')
      .select('email, registration_complete')
      .eq('mobile', inv.invited_mobile)
      .maybeSingle();

    if (partner?.registration_complete) {
      // Partner already registered — mark reminder as not needed
      await sb.from('player_invitations').update({ reminder_sent_at: new Date().toISOString() }).eq('id', inv.id);
      skipped++;
      continue;
    }

    // Get captain details
    const { data: captain } = await sb
      .from('players')
      .select('full_name, email, team_number, school')
      .eq('mobile', inv.invited_by_mobile)
      .maybeSingle();

    const captainName = captain?.full_name ?? 'Your captain';
    const teamNumber = captain?.team_number ?? inv.school;
    const school = inv.school ?? captain?.school ?? '';
    const inviteLink = `${SITE_URL}/register.html?invite=1&mobile=${encodeURIComponent(inv.invited_mobile)}`;
    const partnerName = inv.invited_name ?? '';

    // ── Email to partner ──────────────────────────────────────────────────────
    if (inv.invited_email) {
      const partnerHtml = emailTemplate(`
        <div class="gold-line"></div>
        <h2>Reminder: Complete Your Registration ⏰</h2>
        <p>Hi ${partnerName.split(' ')[0] || 'there'},</p>
        <p><strong>${captainName}</strong> is still waiting for you to complete your registration for the Alumni Schools Golf Challenge!</p>
        <div class="info-box">
          <p><strong>Team:</strong> ${teamNumber}</p>
          <p><strong>School:</strong> ${school}</p>
          <p><strong>Captain:</strong> ${captainName}</p>
        </div>
        <p>Your team entry is not complete until you register. It only takes a few minutes:</p>
        <p style="text-align:center;margin:28px 0">
          <a href="${inviteLink}" class="btn">Complete My Registration →</a>
        </p>
        <p style="font-size:13px;color:#888">Questions? Contact <a href="mailto:info@alumnigolf.net" style="color:#C89B3C">info@alumnigolf.net</a></p>
      `);
      await sendEmail(inv.invited_email, `Reminder: ${captainName} is waiting for you — Alumni Golf ⏰`, partnerHtml);
    }

    // ── Email to captain ──────────────────────────────────────────────────────
    if (captain?.email) {
      const captainHtml = emailTemplate(`
        <div class="gold-line"></div>
        <h2>Your Partner Hasn't Registered Yet ⏳</h2>
        <p>Hi ${captainName.split(' ')[0]},</p>
        <p>Just a heads-up — <strong>${partnerName}</strong> has not yet completed their registration for the Alumni Schools Golf Challenge.</p>
        <div class="info-box">
          <p><strong>Partner:</strong> ${partnerName}</p>
          <p><strong>Team:</strong> ${teamNumber}</p>
          <p><strong>School:</strong> ${school}</p>
          ${inv.invited_email ? `<p><strong>Partner Email:</strong> ${inv.invited_email}</p>` : ''}
        </div>
        <p>We've sent them a reminder. You can also forward their invite link directly:</p>
        <div style="background:#f8f6f0;border-radius:8px;padding:12px;font-size:12px;color:#888;word-break:break-all;">
          ${inviteLink}
        </div>
        <p style="margin-top:16px;font-size:13px;color:#888">Questions? Contact <a href="mailto:info@alumnigolf.net" style="color:#C89B3C">info@alumnigolf.net</a></p>
      `);
      await sendEmail(captain.email, `Your partner ${partnerName} hasn't registered yet — Alumni Golf ⏳`, captainHtml);
    }

    // Mark reminder as sent
    await sb.from('player_invitations').update({ reminder_sent_at: new Date().toISOString() }).eq('id', inv.id);
    sent++;
  }

  return new Response(
    JSON.stringify({ success: true, reminders_sent: sent, skipped }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
