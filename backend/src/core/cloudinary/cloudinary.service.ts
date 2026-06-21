import { v2 as cloudinary } from "cloudinary";

/**
 * Uploads onboarding documents to Cloudinary using server-side credentials.
 */
export class CloudinaryService {
  private configured = false;

  private ensureConfigured(): void {
    if (this.configured) {
      return;
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
    const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error("Cloudinary is not configured");
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    this.configured = true;
  }

  /**
   * Uploads a document buffer and returns the secure URL stored in the database.
   */
  async uploadOnboardingDocument(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
  ): Promise<string> {
    this.ensureConfigured();

    const base64 = buffer.toString("base64");
    const dataUri = `data:${mimeType || "application/octet-stream"};base64,${base64}`;

    // "auto" lets Cloudinary classify PDFs as image resources, which (unlike "raw")
    // are delivered inline so HR can preview them in a browser/iframe instead of
    // forcing a download.
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "onboarding",
      resource_type: "auto",
      use_filename: true,
      unique_filename: true,
      filename_override: originalName.replace(/[^\w.\-]+/g, "_"),
    });

    return result.secure_url;
  }

  /**
   * Uploads a supporting document (PDF) and returns its Cloudinary public_id.
   *
   * These are sensitive employee documents, so they're stored as `authenticated`:
   * Cloudinary will not serve them over public delivery URLs (which are blocked for
   * PDFs account-wide anyway). They're only retrievable via a short-lived signed URL
   * minted by getSupportingDocumentDownloadUrl after the caller passes our auth check.
   * We persist the public_id (not a URL) because the signed URL is generated on demand.
   */
  async uploadSupportingDocument(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
  ): Promise<string> {
    this.ensureConfigured();

    const base64 = buffer.toString("base64");
    const dataUri = `data:${mimeType || "application/octet-stream"};base64,${base64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "supporting_docs",
      resource_type: "raw",
      type: "authenticated",
      use_filename: true,
      unique_filename: true,
      filename_override: originalName.replace(/[^\w.\-]+/g, "_"),
    });

    return result.public_id;
  }

  /**
   * Mints a short-lived signed download URL for an authenticated supporting document.
   * This is the only way to retrieve these PDFs — public delivery URLs are blocked.
   */
  getSupportingDocumentDownloadUrl(publicId: string): string {
    this.ensureConfigured();

    return cloudinary.utils.private_download_url(publicId, "", {
      resource_type: "raw",
      type: "authenticated",
    });
  }
}
