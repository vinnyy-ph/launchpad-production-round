import fs from "fs";
import path from "path";

const logoPath = path.join(__dirname, "assets", "jia-logo.png");

/** Content-ID referenced by email templates: <img src="cid:jia-logo@managejia" /> */
export const JIA_LOGO_CID = "jia-logo@managejia";

/** Returns the CID source used in HTML email templates. */
export function getJiaLogoSrc(): string {
  return `cid:${JIA_LOGO_CID}`;
}

/** Inline attachment for nodemailer / Resend so clients like Gmail can render the logo. */
export function getJiaLogoAttachment() {
  return {
    filename: "jia-logo.png",
    path: logoPath,
    content: fs.readFileSync(logoPath),
    cid: JIA_LOGO_CID,
    contentId: JIA_LOGO_CID,
  };
}
