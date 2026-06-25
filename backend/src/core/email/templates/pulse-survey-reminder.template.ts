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

export interface PulseSurveyReminderEmailParams {
  firstName: string;
  lastName: string;
  surveyName: string;
  surveyUrl: string;
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
 * Builds the HTML body for a pulse survey reminder email — sent on the survey's configured
 * cadence to an audience member who has not yet responded. Same layout as the invitation:
 * logo, greeting, CTA, support copy, footer.
 */
export function buildPulseSurveyReminderEmailHtml(
  params: PulseSurveyReminderEmailParams,
): string {
  const name = escapeHtml(displayName(params.firstName, params.lastName));
  const surveyName = escapeHtml(params.surveyName);
  const surveyUrl = escapeHtml(params.surveyUrl);
  const logoSrc = getJiaLogoSrc();
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reminder: complete your pulse survey on ${BRAND.appName}</title>
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
                This is a reminder that the pulse survey, <strong style="color:${BRAND.textPrimary};">${surveyName}</strong>, is still open and waiting for your response.
                Click the button below to answer it. It only takes a few minutes, and your input helps your team.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;text-align:center;">
              <a href="${surveyUrl}" style="display:inline-block;background-color:${BRAND.buttonBg};color:${BRAND.buttonText};font-size:16px;font-weight:600;line-height:24px;text-decoration:none;padding:12px 20px;border-radius:8px;">
                Answer survey
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 24px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:24px;color:${BRAND.textSecondary};">
                Please respond before the deadline. If you have any questions, reply to this email and it will reach your HR team.
              </p>
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
                <a href="${surveyUrl}" style="color:${BRAND.link};text-decoration:underline;">${surveyUrl}</a>
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
