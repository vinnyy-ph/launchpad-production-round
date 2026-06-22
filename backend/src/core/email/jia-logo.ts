import fs from "fs";
import path from "path";

const logoPath = path.join(__dirname, "assets", "jia-logo.png");

let cachedLogoDataUri: string | undefined;

/** Returns the Manage Jia logo as an inline data URI for HTML emails. */
export function getJiaLogoDataUri(): string {
  if (!cachedLogoDataUri) {
    const png = fs.readFileSync(logoPath);
    cachedLogoDataUri = `data:image/png;base64,${png.toString("base64")}`;
  }

  return cachedLogoDataUri;
}
