import { createHmac, timingSafeEqual } from "node:crypto";
import { Readable } from "node:stream";
import { v2 as cloudinary } from "cloudinary";
import { API_ROUTES } from "../globals";
import {
  formatOnboardingDocumentStorageKey,
  isLegacyOnboardingDocumentUrl,
  parseLegacyCloudinaryDocumentUrl,
  parseOnboardingDocumentStorageKey,
} from "./onboarding-document-storage";

const DOCUMENT_LINK_TTL_SECONDS = 10 * 60;

// Same-origin proxy the browser embeds instead of the raw document URL. Serving documents
// through our own origin keeps them under the page CSP (`frame-src 'self'`, `img-src 'self'`),
// avoids browser tracking-prevention blocking a third-party origin, and lets us stream the
// bytes with `Content-Disposition: inline` so PDFs/images render in place instead of
// downloading. The upstream URL is generated/fetched server-side and never reaches the client.
const DOCUMENT_PROXY_BASE = `${API_ROUTES.VERSIONED_ROOT}/documents/view`;

// Field separator inside the proxy token payload. Cloudinary public_ids and URLs never
// contain a newline, so it can't collide with the encoded values.
const PROXY_TOKEN_DELIMITER = "\n";

const PROXY_KIND_CLOUDINARY = "cld";
const PROXY_KIND_EXTERNAL = "url";

/**
 * What a verified proxy token resolves to: either a Cloudinary asset we sign on demand, or a
 * legacy external URL we fetch directly.
 */
type ProxyTarget =
  | { kind: "cloudinary"; publicId: string; resourceType: string }
  | { kind: "external"; url: string };

/** A document fetched server-side and ready to stream to the client. */
interface FetchedDocument {
  stream: Readable;
  contentType: string;
  contentLength: string | null;
  inline: boolean;
}

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
   * Uploads an onboarding document as authenticated delivery and returns a storage key
   * (`public_id|resource_type`) for persistence. Public delivery URLs are not stored.
   */
  async uploadOnboardingDocument(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
  ): Promise<string> {
    this.ensureConfigured();

    const base64 = buffer.toString("base64");
    const dataUri = `data:${mimeType || "application/octet-stream"};base64,${base64}`;
    const normalizedMimeType = mimeType.toLowerCase().split(";")[0]?.trim();
    const resourceType = normalizedMimeType === "application/pdf" ? "raw" : "image";

    // PDFs must be raw assets so signed delivery returns PDF bytes instead of an
    // image-transformation response that browser PDF viewers cannot load.
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "onboarding",
      resource_type: resourceType,
      type: "authenticated",
      use_filename: true,
      unique_filename: true,
      filename_override: originalName.replace(/[^\w.\-]+/g, "_"),
    });

    return formatOnboardingDocumentStorageKey(
      result.public_id,
      result.resource_type,
    );
  }

  /**
   * Resolves an onboarding/offboarding submission into a same-origin proxy URL for inline
   * viewing. Storage keys and legacy Cloudinary URLs are signed on demand; legacy external
   * URLs (old records predating Cloudinary) are proxied by direct fetch so they too stay
   * same-origin instead of being framed cross-origin (which CSP blocks).
   */
  resolveOnboardingDocumentViewUrl(storedValue: string): string {
    if (isLegacyOnboardingDocumentUrl(storedValue)) {
      const legacyDocument = parseLegacyCloudinaryDocumentUrl(storedValue);
      if (legacyDocument) {
        return this.buildCloudinaryProxyPath(
          legacyDocument.publicId,
          legacyDocument.resourceType,
        );
      }

      return this.buildExternalProxyPath(storedValue);
    }

    const { publicId, resourceType } =
      parseOnboardingDocumentStorageKey(storedValue);

    return this.buildCloudinaryProxyPath(publicId, resourceType);
  }

  /**
   * Uploads a supporting document (PDF) and returns its Cloudinary public_id.
   *
   * These are sensitive employee documents, so they're stored as `authenticated`:
   * Cloudinary will not serve them over public delivery URLs (which are blocked for
   * PDFs account-wide anyway). They're only retrievable via the document proxy after
   * the caller passes our auth check. We persist the public_id (not a URL).
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

  /** Same-origin proxy URL for an authenticated supporting document (always a raw PDF). */
  getSupportingDocumentProxyPath(publicId: string): string {
    return this.buildCloudinaryProxyPath(publicId, "raw");
  }

  /**
   * Verifies a proxy token and returns the document it authorizes, or null when the token is
   * forged, malformed, or expired. The HMAC signature makes the token a single-document
   * capability the client cannot tamper with.
   */
  verifyProxyToken(token: string): ProxyTarget | null {
    const separatorIndex = token.lastIndexOf(".");
    if (separatorIndex <= 0) {
      return null;
    }

    const payloadB64 = token.slice(0, separatorIndex);
    const signature = token.slice(separatorIndex + 1);
    const expected = createHmac("sha256", this.getSigningSecret())
      .update(payloadB64)
      .digest("base64url");

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return null;
    }

    const [kind, first, second, expiry] = Buffer.from(payloadB64, "base64url")
      .toString("utf8")
      .split(PROXY_TOKEN_DELIMITER);
    const expiresAt = Number(expiry);

    if (!Number.isFinite(expiresAt) || Math.floor(Date.now() / 1000) > expiresAt) {
      return null;
    }

    if (kind === PROXY_KIND_CLOUDINARY && first && second) {
      return { kind: "cloudinary", publicId: first, resourceType: second };
    }
    if (kind === PROXY_KIND_EXTERNAL && first) {
      return { kind: "external", url: first };
    }
    return null;
  }

  /**
   * Fetches a document server-side, ready to stream inline to the client. Returns null when
   * the asset is missing or the signed link has expired. External (legacy) sources are only
   * rendered inline when they are a PDF or image; anything else is served as an inert
   * download so a stale URL cannot serve active content (e.g. HTML) from our own origin.
   */
  async fetchDocument(target: ProxyTarget): Promise<FetchedDocument | null> {
    const upstreamUrl =
      target.kind === "cloudinary"
        ? this.buildSignedCloudinaryUrl(target.publicId, target.resourceType)
        : target.url;

    if (target.kind === "external" && !/^https?:\/\//i.test(upstreamUrl)) {
      return null;
    }

    const upstream = await fetch(upstreamUrl);
    if (!upstream.ok || !upstream.body) {
      return null;
    }

    const upstreamType = (upstream.headers.get("content-type") ?? "")
      .split(";")[0]
      .trim()
      .toLowerCase();

    let contentType: string;
    let inline: boolean;
    if (target.kind === "cloudinary") {
      // Raw assets in this app are always PDFs; force the inline-renderable type rather than
      // Cloudinary's download content-type. Images keep Cloudinary's content-type.
      contentType =
        target.resourceType === "raw"
          ? "application/pdf"
          : upstreamType || "application/octet-stream";
      inline = true;
    } else {
      const renderable =
        upstreamType === "application/pdf" || upstreamType.startsWith("image/");
      contentType = renderable ? upstreamType : "application/octet-stream";
      inline = renderable;
    }

    return {
      stream: Readable.fromWeb(
        upstream.body as Parameters<typeof Readable.fromWeb>[0],
      ),
      contentType,
      contentLength: upstream.headers.get("content-length"),
      inline,
    };
  }

  /** Same-origin proxy URL (with a signed capability token) for a Cloudinary asset. */
  private buildCloudinaryProxyPath(
    publicId: string,
    resourceType: string,
  ): string {
    const token = this.mintToken(PROXY_KIND_CLOUDINARY, publicId, resourceType);
    const base = publicId.split("/").pop() || "document";
    return this.buildProxyPath(token, base, resourceType === "raw");
  }

  /** Same-origin proxy URL (with a signed capability token) for a legacy external URL. */
  private buildExternalProxyPath(url: string): string {
    const token = this.mintToken(PROXY_KIND_EXTERNAL, url, "");
    let base = "document";
    try {
      base = new URL(url).pathname.split("/").pop() || "document";
    } catch {
      // Keep the fallback; the real identity is in the token, not the filename.
    }
    return this.buildProxyPath(token, base, false);
  }

  /**
   * Assembles `/api/v1/documents/view/<filename>?token=...`. The trailing filename is
   * decorative — it drives the viewer's `.pdf` detection and the download name — while the
   * document identity and authorization live in the signed token.
   */
  private buildProxyPath(
    token: string,
    base: string,
    forcePdf: boolean,
  ): string {
    let filename = base.replace(/[^\w.\-]+/g, "_");
    if (forcePdf && !filename.toLowerCase().endsWith(".pdf")) {
      filename = `${filename}.pdf`;
    }
    return `${DOCUMENT_PROXY_BASE}/${filename}?token=${encodeURIComponent(token)}`;
  }

  private mintToken(kind: string, first: string, second: string): string {
    const payload = [
      kind,
      first,
      second,
      String(this.buildDocumentLinkExpiry()),
    ].join(PROXY_TOKEN_DELIMITER);
    const payloadB64 = Buffer.from(payload, "utf8").toString("base64url");
    const signature = createHmac("sha256", this.getSigningSecret())
      .update(payloadB64)
      .digest("base64url");
    return `${payloadB64}.${signature}`;
  }

  private buildSignedCloudinaryUrl(
    publicId: string,
    resourceType: string,
  ): string {
    this.ensureConfigured();

    return cloudinary.utils.private_download_url(publicId, "", {
      resource_type: resourceType,
      type: "authenticated",
      expires_at: this.buildDocumentLinkExpiry(),
    });
  }

  private getSigningSecret(): string {
    const secret = process.env.CLOUDINARY_API_SECRET?.trim();
    if (!secret) {
      throw new Error("Cloudinary is not configured");
    }
    return secret;
  }

  private buildDocumentLinkExpiry(): number {
    return Math.floor(Date.now() / 1000) + DOCUMENT_LINK_TTL_SECONDS;
  }
}
