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
  warningBg: "#fffaeb",
  warningBorder: "#fedf89",
  warningText: "#b54708",
  shadow: "0 1px 3px 0 rgba(14,16,27,0.10), 0 1px 2px -1px rgba(14,16,27,0.10)",
} as const;

export interface OnboardingDocumentRejectedEmailParams {
  firstName: string;
  lastName: string;
  documentName: string;
  rejectionNote: string;
  onboardingUrl: string;
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
 * Builds the HTML body for a rejected onboarding document email.
 * The employee can return to the review tracker and re-upload the flagged file.
 */
export function buildOnboardingDocumentRejectedEmailHtml(
  params: OnboardingDocumentRejectedEmailParams,
): string {
  const name = escapeHtml(displayName(params.firstName, params.lastName));
  const documentName = escapeHtml(params.documentName);
  const rejectionNote = escapeHtml(params.rejectionNote);
  const onboardingUrl = escapeHtml(params.onboardingUrl);
  const logoSrc = getJiaLogoSrc();
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Document needs changes on ${BRAND.appName}</title>
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
                Hi, ${name}.
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:24px;color:${BRAND.textSecondary};">
                HR reviewed your onboarding documents and <strong style="color:${BRAND.textPrimary};">${documentName}</strong> needs changes before they can continue.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.warningBg};border:1px solid ${BRAND.warningBorder};border-radius:12px;">
                <tr>
                  <td style="padding:16px 18px;font-size:16px;line-height:24px;color:${BRAND.warningText};">
                    ${rejectionNote}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 40px 32px;text-align:center;">
              <a href="${onboardingUrl}" style="display:inline-block;background-color:${BRAND.buttonBg};color:${BRAND.buttonText};font-size:16px;font-weight:600;line-height:24px;text-decoration:none;padding:12px 20px;border-radius:8px;">
                Re-upload document
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 24px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:24px;color:${BRAND.textSecondary};">
                You can re-upload the document from your onboarding review page. If you have questions, reply to this email and it will reach your HR team.
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
                <a href="${onboardingUrl}" style="color:${BRAND.link};text-decoration:underline;">${onboardingUrl}</a>
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
