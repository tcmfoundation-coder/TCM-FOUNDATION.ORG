/**
 * Shared layout for transactional email.
 *
 * Deliberately lives beside the mail abstraction rather than inside any
 * provider adapter: message content is an application concern, so replacing
 * Resend with another provider must not touch these templates.
 *
 * Written for email clients, not browsers — table layout, inline styles, no
 * external stylesheets, no web fonts, no images. Outlook ignores most modern
 * CSS, so the button is a bordered table cell rather than a styled anchor.
 */

// Brand values are the real ones from the client's logo, mirroring
// apps/web/src/app/globals.css so email and site stay visually consistent.
const BRAND = '#782e7f';
const BRAND_DARK = '#2e1231';
const INK = '#241726';
const INK_SOFT = '#5a4b5d';
const HAIRLINE = '#e6dce8';
const PAPER = '#f7f5fa';

/** Values are internally generated, but escaping keeps the templates safe by construction. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface EmailContent {
  /** Shown as the <h1> inside the email body. */
  heading: string;
  /** One or two sentences explaining why the message was sent. */
  intro: string;
  actionLabel: string;
  actionUrl: string;
  /** Expiry and "ignore this if it wasn't you" guidance. */
  securityNote: string;
  /**
   * Optional secondary link rendered small, in the footer. Exists so an
   * opt-out can sit where recipients expect it without competing with the
   * message's primary action. Auth email omits it.
   */
  footerLink?: { label: string; url: string };
}

export function renderEmailHtml(content: EmailContent): string {
  const { heading, intro, actionLabel, actionUrl, securityNote, footerLink } =
    content;
  const safeUrl = escapeHtml(actionUrl);
  const footerLinkHtml = footerLink
    ? `<br><a href="${escapeHtml(footerLink.url)}" style="color:#8a7a8d;text-decoration:underline;">${escapeHtml(footerLink.label)}</a>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:${PAPER};">
<!-- Preheader: the preview line, hidden in the body itself. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(intro)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${PAPER};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;border:1px solid ${HAIRLINE};border-radius:6px;">
        <tr>
          <td style="padding:24px 32px;background-color:${BRAND_DARK};border-radius:6px 6px 0 0;">
            <span style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:600;color:#ffffff;letter-spacing:0.01em;">TCM Foundation</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
            <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;font-weight:600;color:${INK};">${escapeHtml(heading)}</h1>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${INK_SOFT};">${escapeHtml(intro)}</p>

            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" bgcolor="${BRAND}" style="border-radius:4px;">
                  <a href="${safeUrl}" style="display:inline-block;padding:12px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:4px;">${escapeHtml(actionLabel)}</a>
                </td>
              </tr>
            </table>

            <p style="margin:24px 0 8px;font-size:13px;line-height:1.6;color:${INK_SOFT};">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="margin:0 0 24px;font-size:13px;line-height:1.6;word-break:break-all;">
              <a href="${safeUrl}" style="color:${BRAND};text-decoration:underline;">${safeUrl}</a>
            </p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="border-top:1px solid ${HAIRLINE};font-size:0;line-height:0;">&nbsp;</td></tr>
            </table>

            <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:${INK_SOFT};">${escapeHtml(securityNote)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;line-height:1.5;color:#8a7a8d;border-top:1px solid ${HAIRLINE};">
            This is an automated message from The Corporate Muslimah Foundation. Please do not reply to this email.${footerLinkHtml}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/**
 * Plain-text counterpart carrying the same action URL and explanation.
 *
 * The URL is placed on its own line, before any other URL in the body, so it
 * survives naive extraction (the auth e2e suite reads the token back out of
 * this text) and so email clients auto-link it cleanly.
 */
export function renderEmailText(content: EmailContent): string {
  const { heading, intro, actionUrl, securityNote, footerLink } = content;
  return [
    heading,
    '',
    intro,
    '',
    actionUrl,
    '',
    securityNote,
    '',
    '—',
    'This is an automated message from The Corporate Muslimah Foundation.',
    'Please do not reply to this email.',
    ...(footerLink ? ['', `${footerLink.label}: ${footerLink.url}`] : []),
  ].join('\n');
}
