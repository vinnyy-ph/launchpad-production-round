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

    const normalizedName = originalName.toLowerCase();
    const isPdf =
      normalizedName.endsWith(".pdf") || mimeType.toLowerCase() === "application/pdf";

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "onboarding",
      resource_type: isPdf ? "raw" : "auto",
      use_filename: true,
      unique_filename: true,
      filename_override: originalName.replace(/[^\w.\-]+/g, "_"),
    });

    return result.secure_url;
  }

  /**
   * Uploads a supporting document (PDF) and returns the secure URL.
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
      use_filename: true,
      unique_filename: true,
      filename_override: originalName.replace(/[^\w.\-]+/g, "_"),
    });

    return result.secure_url;
  }
}
