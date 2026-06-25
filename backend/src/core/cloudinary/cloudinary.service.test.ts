const uploadMock = jest.fn();
const privateDownloadUrlMock = jest.fn();
const configMock = jest.fn();

jest.mock("cloudinary", () => ({
  v2: {
    config: (...args: unknown[]) => configMock(...args),
    uploader: {
      upload: (...args: unknown[]) => uploadMock(...args),
    },
    utils: {
      private_download_url: (...args: unknown[]) => privateDownloadUrlMock(...args),
    },
  },
}));

import { CloudinaryService } from "./cloudinary.service";

/** Pulls the signed `token` query param out of a same-origin document proxy path. */
function tokenFromProxyPath(proxyPath: string): string {
  const url = new URL(proxyPath, "http://localhost");
  const token = url.searchParams.get("token");
  if (!token) {
    throw new Error(`No token in proxy path: ${proxyPath}`);
  }
  return token;
}

describe("CloudinaryService onboarding documents", () => {
  const env = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, "now").mockReturnValue(1_800_000_000_000);
    process.env = {
      ...env,
      CLOUDINARY_CLOUD_NAME: "demo",
      CLOUDINARY_API_KEY: "key",
      CLOUDINARY_API_SECRET: "secret",
    };
    uploadMock.mockResolvedValue({
      public_id: "onboarding/employment-contract.pdf",
      resource_type: "raw",
    });
    privateDownloadUrlMock.mockReturnValue("https://signed.example.test/pdf");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = env;
  });

  it("uploads PDFs as raw authenticated assets", async () => {
    const service = new CloudinaryService();

    await service.uploadOnboardingDocument(
      Buffer.from("%PDF-1.4"),
      "employment-contract.pdf",
      "application/pdf",
    );

    expect(uploadMock).toHaveBeenCalledWith(
      expect.stringContaining("data:application/pdf;base64,"),
      expect.objectContaining({
        resource_type: "raw",
        type: "authenticated",
      }),
    );
  });

  it("uploads images as authenticated image assets", async () => {
    const service = new CloudinaryService();

    await service.uploadOnboardingDocument(
      Buffer.from([0xff, 0xd8, 0xff]),
      "id.jpg",
      "image/jpeg",
    );

    expect(uploadMock).toHaveBeenCalledWith(
      expect.stringContaining("data:image/jpeg;base64,"),
      expect.objectContaining({
        resource_type: "image",
        type: "authenticated",
      }),
    );
  });

  it("resolves stored raw PDF keys into a same-origin proxy path with a valid token", () => {
    const service = new CloudinaryService();

    const result = service.resolveOnboardingDocumentViewUrl(
      "onboarding/employment-contract.pdf|raw",
    );

    expect(result).toMatch(
      /^\/api\/v1\/documents\/view\/employment-contract\.pdf\?token=/,
    );
    // Signing is deferred to stream time, so resolving never hits Cloudinary.
    expect(privateDownloadUrlMock).not.toHaveBeenCalled();
    expect(service.verifyProxyToken(tokenFromProxyPath(result))).toEqual({
      kind: "cloudinary",
      publicId: "onboarding/employment-contract.pdf",
      resourceType: "raw",
    });
  });

  it("converts legacy Cloudinary public URLs into a proxied token", () => {
    const service = new CloudinaryService();

    const result = service.resolveOnboardingDocumentViewUrl(
      "https://res.cloudinary.com/demo/image/upload/v1710000000/onboarding/id-card.jpg",
    );

    expect(service.verifyProxyToken(tokenFromProxyPath(result))).toEqual({
      kind: "cloudinary",
      publicId: "onboarding/id-card",
      resourceType: "image",
    });
    expect(privateDownloadUrlMock).not.toHaveBeenCalled();
  });

  it("proxies legacy non-Cloudinary external URLs through our own origin", () => {
    const service = new CloudinaryService();
    const legacyUrl = "https://storage.example.com/onboarding/id-card.pdf";

    const result = service.resolveOnboardingDocumentViewUrl(legacyUrl);

    expect(result).toMatch(/^\/api\/v1\/documents\/view\/id-card\.pdf\?token=/);
    expect(service.verifyProxyToken(tokenFromProxyPath(result))).toEqual({
      kind: "external",
      url: legacyUrl,
    });
    expect(privateDownloadUrlMock).not.toHaveBeenCalled();
  });

  it("proxies evaluation supporting documents as raw assets", () => {
    const service = new CloudinaryService();

    const result = service.getSupportingDocumentProxyPath(
      "supporting_docs/review.pdf",
    );

    expect(result).toMatch(/^\/api\/v1\/documents\/view\//);
    expect(service.verifyProxyToken(tokenFromProxyPath(result))).toEqual({
      kind: "cloudinary",
      publicId: "supporting_docs/review.pdf",
      resourceType: "raw",
    });
  });

  it("rejects tampered or expired proxy tokens", () => {
    const service = new CloudinaryService();
    const token = tokenFromProxyPath(
      service.getSupportingDocumentProxyPath("supporting_docs/review.pdf"),
    );

    expect(service.verifyProxyToken(`${token}tampered`)).toBeNull();

    jest.spyOn(Date, "now").mockReturnValue(1_800_001_000_000); // past the 10-min TTL
    expect(service.verifyProxyToken(token)).toBeNull();
  });

  it("streams an authenticated document via a signed Cloudinary download URL", async () => {
    privateDownloadUrlMock.mockReturnValue("https://signed.example.test/contract");
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
          controller.close();
        },
      }),
      headers: new Headers({ "content-length": "4" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const service = new CloudinaryService();
    const file = await service.fetchDocument({
      kind: "cloudinary",
      publicId: "supporting_docs/review.pdf",
      resourceType: "raw",
    });

    expect(privateDownloadUrlMock).toHaveBeenCalledWith(
      "supporting_docs/review.pdf",
      "",
      { resource_type: "raw", type: "authenticated", expires_at: 1_800_000_600 },
    );
    expect(fetchMock).toHaveBeenCalledWith("https://signed.example.test/contract");
    expect(file?.contentType).toBe("application/pdf");
    expect(file?.contentLength).toBe("4");
    expect(file?.inline).toBe(true);
  });

  it("streams a legacy external PDF inline but serves unknown types as inert downloads", async () => {
    const pdfResponse = {
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.close();
        },
      }),
      headers: new Headers({ "content-type": "application/pdf" }),
    };
    const htmlResponse = {
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.close();
        },
      }),
      headers: new Headers({ "content-type": "text/html" }),
    };
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(pdfResponse)
      .mockResolvedValueOnce(htmlResponse);
    global.fetch = fetchMock as unknown as typeof fetch;

    const service = new CloudinaryService();
    const url = "https://storage.example.com/onboarding/nbi.pdf";

    const pdf = await service.fetchDocument({ kind: "external", url });
    expect(pdf?.contentType).toBe("application/pdf");
    expect(pdf?.inline).toBe(true);

    const html = await service.fetchDocument({ kind: "external", url });
    expect(html?.contentType).toBe("application/octet-stream");
    expect(html?.inline).toBe(false);

    // Cloudinary signing is never used for an external target.
    expect(privateDownloadUrlMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(url);
  });

  it("returns null when the upstream fetch fails (dead/unreachable source)", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(
        new TypeError("fetch failed"),
      ) as unknown as typeof fetch;

    const service = new CloudinaryService();

    await expect(
      service.fetchDocument({
        kind: "external",
        url: "https://storage.example.com/onboarding/casey-gov-id.pdf",
      }),
    ).resolves.toBeNull();
  });
});
