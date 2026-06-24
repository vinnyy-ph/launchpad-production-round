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

  it("resolves stored raw PDF keys with expiring authenticated delivery", () => {
    const service = new CloudinaryService();

    const result = service.resolveOnboardingDocumentViewUrl(
      "onboarding/employment-contract.pdf|raw",
    );

    expect(result).toBe("https://signed.example.test/pdf");
    expect(privateDownloadUrlMock).toHaveBeenCalledWith(
      "onboarding/employment-contract.pdf",
      "",
      {
        resource_type: "raw",
        type: "authenticated",
        expires_at: 1_800_000_600,
      },
    );
  });

  it("converts legacy Cloudinary public URLs before signing", () => {
    const service = new CloudinaryService();

    service.resolveOnboardingDocumentViewUrl(
      "https://res.cloudinary.com/demo/image/upload/v1710000000/onboarding/id-card.jpg",
    );

    expect(privateDownloadUrlMock).toHaveBeenCalledWith(
      "onboarding/id-card",
      "",
      {
        resource_type: "image",
        type: "authenticated",
        expires_at: 1_800_000_600,
      },
    );
  });

  it("rejects legacy non-Cloudinary public document URLs", () => {
    const service = new CloudinaryService();

    expect(() =>
      service.resolveOnboardingDocumentViewUrl(
        "https://storage.example.com/onboarding/id-card.pdf",
      ),
    ).toThrow("Legacy public document URL cannot be signed");
  });

  it("creates expiring URLs for evaluation supporting documents", () => {
    const service = new CloudinaryService();

    service.getSupportingDocumentDownloadUrl("supporting_docs/review.pdf");

    expect(privateDownloadUrlMock).toHaveBeenCalledWith(
      "supporting_docs/review.pdf",
      "",
      {
        resource_type: "raw",
        type: "authenticated",
        expires_at: 1_800_000_600,
      },
    );
  });
});
