/**
 * Transactional email via the Resend REST API (plain fetch, no SDK).
 *
 * Like payments and Google sync, this degrades gracefully: without
 * RESEND_API_KEY the email is printed to the server log and `sent: false`
 * is returned, so every flow stays fully testable in dev.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export interface EmailResult {
  sent: boolean;
  error?: string;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "SnapEvent <onboarding@resend.dev>";

  if (!apiKey) {
    console.log(
      `[email] RESEND_API_KEY not set — would have sent to ${opts.to}: "${opts.subject}"`
    );
    return { sent: false, error: "Email not configured" };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[email] Resend responded ${res.status}: ${body}`);
      return { sent: false, error: `Provider error ${res.status}` };
    }
    return { sent: true };
  } catch (err: any) {
    console.error("[email] send failed:", err?.message ?? err);
    return { sent: false, error: "Network error" };
  }
}

/* ---------------------------------------------------------------- */
/* Templates — bilingual (Hebrew first, RTL) matching the brand.    */
/* ---------------------------------------------------------------- */

const BRAND = "#a12148"; // brand-700 from tailwind.config.ts

function shell(inner: string): string {
  return `
  <div style="background:#faf7f5;padding:32px 16px;font-family:-apple-system,'Segoe UI',Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #eee;overflow:hidden;">
      <div style="background:${BRAND};padding:20px 28px;">
        <span style="color:#fff;font-size:20px;font-weight:bold;letter-spacing:2px;">SnapEvent</span>
      </div>
      <div style="padding:28px;">${inner}</div>
      <div style="padding:16px 28px;border-top:1px solid #f3f3f3;color:#999;font-size:12px;text-align:center;">
        SnapEvent · נעשה באהבה לחגיגות בישראל · Made with ❤️ for celebrations in Israel
      </div>
    </div>
  </div>`;
}

function linkRow(label: string, url: string): string {
  return `
  <p style="margin:0 0 4px;font-weight:bold;color:#333;font-size:14px;">${label}</p>
  <p style="margin:0 0 16px;">
    <a href="${url}" style="color:${BRAND};font-size:13px;word-break:break-all;" dir="ltr">${url}</a>
  </p>`;
}

export function eventCreatedEmail(opts: {
  eventName: string;
  adminUrl: string;
  guestUrl: string;
  slideshowUrl: string;
  dashboardUrl: string;
}): { subject: string; html: string } {
  const { eventName, adminUrl, guestUrl, slideshowUrl, dashboardUrl } = opts;
  const he = `
    <div dir="rtl" style="text-align:right;">
      <h1 style="margin:0 0 8px;font-size:22px;color:#111;">🎉 האירוע שלכם באוויר!</h1>
      <p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.6;">
        שמרו על המייל הזה — כאן כל הקישורים של <b>${escapeHtml(eventName)}</b>.
        קישור הניהול פרטי, שמרו עליו כמו על סיסמה.
      </p>
      ${linkRow("לוח ניהול (פרטי)", adminUrl)}
      ${linkRow("עמוד ההעלאה לאורחים", guestUrl)}
      ${linkRow("סליידשואו לאולם", slideshowUrl)}
      <p style="margin:20px 0 0;color:#555;font-size:13px;line-height:1.6;">
        אפשר גם להתחבר בכל רגע לאזור האישי עם כתובת המייל הזו:
        <a href="${dashboardUrl}" style="color:${BRAND};">${dashboardUrl}</a>
      </p>
    </div>`;
  const en = `
    <div dir="ltr" style="text-align:left;border-top:1px solid #f3f3f3;margin-top:24px;padding-top:24px;">
      <h2 style="margin:0 0 8px;font-size:18px;color:#111;">🎉 Your event is live!</h2>
      <p style="margin:0 0 16px;color:#555;font-size:13px;line-height:1.6;">
        Keep this email — it holds every link for <b>${escapeHtml(eventName)}</b>.
        The admin link is private; treat it like a password. You can also sign in
        any time at <a href="${dashboardUrl}" style="color:${BRAND};">your dashboard</a>
        using this email address.
      </p>
    </div>`;
  return {
    subject: `הקישורים לאירוע שלכם · Your event links — ${eventName}`,
    html: shell(he + en),
  };
}

export function loginCodeEmail(code: string): { subject: string; html: string } {
  const inner = `
    <div dir="rtl" style="text-align:right;">
      <h1 style="margin:0 0 8px;font-size:20px;color:#111;">קוד הכניסה שלכם</h1>
      <p style="margin:0 0 20px;color:#555;font-size:14px;">הקוד תקף ל־10 דקות.</p>
    </div>
    <p style="margin:0 0 20px;text-align:center;">
      <span dir="ltr" style="display:inline-block;background:#faf7f5;border:1px solid #eee;border-radius:12px;padding:14px 28px;font-size:30px;font-weight:bold;letter-spacing:8px;color:#111;">${code}</span>
    </p>
    <div dir="ltr" style="text-align:left;">
      <p style="margin:0;color:#555;font-size:13px;">Your SnapEvent sign-in code. Valid for 10 minutes. If you didn't request it, you can ignore this email.</p>
    </div>`;
  return { subject: `${code} — קוד הכניסה ל־SnapEvent · Your sign-in code`, html: shell(inner) };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
