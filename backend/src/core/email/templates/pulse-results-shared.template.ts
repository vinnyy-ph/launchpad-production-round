/** Manage Jia brand tokens used in transactional email (inline-safe hex values). */
import { getJiaLogoSrc } from "../jia-logo";
const BRAND = {
  appName: "Manage Jia",
  bgPage: "#f9f9fb",
  bgCard: "#ffffff",
  textPrimary: "#181d27",
  textSecondary: "#414651",
  textTertiary: "#717680",
  border: "#e9eaeb",
  buttonBg: "#111322",
  buttonText: "#ffffff",
  link: "#404968",
  shadow: "0 1px 3px 0 rgba(14,16,27,0.10), 0 1px 2px -1px rgba(14,16,27,0.10)",
} as const;

export interface PulseResultsSharedEmailParams {
  firstName: string;
  lastName: string;
  surveyName: string;
  teamName: string;
  /** HR's open-text note to the supervisor — the content they're meant to read. */
  message: string;
  resultsUrl: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function displayName(firstName: string, lastName: string): string {
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return fullName || "there";
}

/**
 * Builds the HTML body for the "HR shared your team's pulse results" email — sent when HR
 * deliberately shares a small (sub-threshold) anonymous team's results with that team's
 * supervisor. Same layout as the other transactional emails: logo, greeting, CTA, footer.
 */
export function buildPulseResultsSharedEmailHtml(
  params: PulseResultsSharedEmailParams,
): string {
  const name = escapeHtml(displayName(params.firstName, params.lastName));
  const surveyName = escapeHtml(params.surveyName);
  const teamName = escapeHtml(params.teamName);
  const resultsUrl = escapeHtml(params.resultsUrl);
  const messageHtml = escapeHtml(params.message).replace(/\r?\n/g, "<br />");
  const logoSrc = getJiaLogoSrc();
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pulse results shared with you on ${BRAND.appName}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bgPage};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bgPage};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:${BRAND.bgCard};border-radius:16px;box-shadow:${BRAND.shadow};overflow:hidden;">
          <tr>
            <td style="padding:40px 40px 32px;text-align:center;">
              <img src="${logoSrc}" alt="${BRAND.appName}" height="38" style="height:38px;width:auto;display:inline-block;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 24px;">
              <h1 style="margin:0 0 20px;font-size:30px;line-height:38px;font-weight:700;letter-spacing:-0.02em;color:${BRAND.textPrimary};">
                Hi, ${name}!
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:24px;color:${BRAND.textSecondary};">
                HR has shared a note about your team <strong style="color:${BRAND.textPrimary};">${teamName}</strong>'s responses to the anonymous pulse survey <strong style="color:${BRAND.textPrimary};">${surveyName}</strong>:
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
                <tr>
                  <td style="border-left:3px solid ${BRAND.border};background-color:${BRAND.bgPage};border-radius:8px;padding:16px 18px;font-size:16px;line-height:24px;color:${BRAND.textPrimary};">
                    ${messageHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;text-align:center;">
              <a href="${resultsUrl}" style="display:inline-block;background-color:${BRAND.buttonBg};color:${BRAND.buttonText};font-size:16px;font-weight:600;line-height:24px;text-decoration:none;padding:12px 20px;border-radius:8px;">
                Open in ${BRAND.appName}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 24px;">
              <p style="margin:0;font-size:16px;line-height:24px;color:${BRAND.textSecondary};">
                Thank you,<br />
                <strong style="color:${BRAND.textPrimary};">The ${BRAND.appName} Team</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 40px;border-top:1px solid ${BRAND.border};">
              <p style="margin:0 0 12px;font-size:14px;line-height:20px;color:${BRAND.textTertiary};">
                If you're having trouble with the button above, copy and paste this URL into your web browser:
              </p>
              <p style="margin:0;font-size:14px;line-height:20px;word-break:break-all;">
                <a href="${resultsUrl}" style="color:${BRAND.link};text-decoration:underline;">${resultsUrl}</a>
              </p>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin-top:32px;">
          <tr>
            <td align="center" style="font-size:12px;line-height:18px;color:${BRAND.textTertiary};">
              <p style="margin:0 0 8px;">&copy; ${year} ${BRAND.appName}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
