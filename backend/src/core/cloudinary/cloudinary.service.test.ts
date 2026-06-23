const uploadMock = jest.fn();
const urlMock = jest.fn();
const configMock = jest.fn();

jest.mock("cloudinary", () => ({
  v2: {
    config: (...args: unknown[]) => configMock(...args),
    uploader: {
      upload: (...args: unknown[]) => uploadMock(...args),
    },
    url: (...args: unknown[]) => urlMock(...args),
    utils: {
      private_download_url: jest.fn(),
    },
  },
}));

import { CloudinaryService } from "./cloudinary.service";

describe("CloudinaryService onboarding documents", () => {
  const env = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
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

  it("resolves stored raw PDF keys with raw signed delivery", () => {
    const service = new CloudinaryService();
    urlMock.mockReturnValue("https://signed.example.test/pdf");

    service.resolveOnboardingDocumentViewUrl(
      "onboarding/employment-contract.pdf|raw",
    );

    expect(urlMock).toHaveBeenCalledWith(
      "onboarding/employment-contract.pdf",
      expect.objectContaining({
        resource_type: "raw",
        type: "authenticated",
        sign_url: true,
      }),
    );
  });
});
