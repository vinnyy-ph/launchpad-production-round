import request from "supertest";
import { app } from "../../../app";
import {
  buildAdminUser,
  buildCreateDocumentBody,
  resetDocumentMocks,
} from "./documents-test.helpers";

jest.mock("../../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildAdminUser();
    next();
  },
}));

jest.mock("../../../core/database/prisma.service", () => ({
  prisma: {
    onboardingTemplate: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    onboardingDocument: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe("Required documents - admin authorization", () => {
  beforeEach(() => {
    resetDocumentMocks();
  });

  it("returns 403 when an admin tries to create a document", async () => {
    const response = await request(app)
      .post("/api/v1/onboarding/documents")
      .send(buildCreateDocumentBody())
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "You do not have permission to perform this action",
    });
  });

  it("returns 403 when an admin tries to list documents", async () => {
    const response = await request(app)
      .get("/api/v1/onboarding/documents")
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "You do not have permission to perform this action",
    });
  });
});
