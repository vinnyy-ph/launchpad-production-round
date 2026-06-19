import fs from "fs";
import path from "path";

const logoPath = path.join(__dirname, "assets", "jia-logo.svg");

let cachedLogoDataUri: string | undefined;

/** Returns the Manage Jia logo as an inline data URI for HTML emails. */
export function getJiaLogoDataUri(): string {
  if (!cachedLogoDataUri) {
    const svg = fs.readFileSync(logoPath, "utf8");
    cachedLogoDataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  }

  return cachedLogoDataUri;
}
