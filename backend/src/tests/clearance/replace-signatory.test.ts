import request from "supertest";
import { app } from "../../app";
import {
  buildHrUser,
  buildSignatureRequest,
  REQUEST_ID,
} from "./clearance-test.helpers";

const NEW_SIGNATORY_ID = "new-signatory-id";

jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildHrUser();
    next();
  },
}));

jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    employee: { findUnique: jest.fn(), findMany: jest.fn() },
    clearanceSignatureRequest: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    notification: { create: jest.fn() },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require("../../core/database/prisma.service");

describe("POST /api/v1/clearance/:requestId/replace-signatory", () => {
  beforeEach(() => {
    prisma.employee.findUnique.mockReset();
    prisma.employee.findMany.mockReset();
    prisma.clearanceSignatureRequest.findUnique.mockReset();
    prisma.clearanceSignatureRequest.findFirst.mockReset();
    prisma.clearanceSignatureRequest.update.mockReset();
    prisma.notification.create.mockReset();
  });

  it("reassigns the item to a new signatory and resets it to PENDING", async () => {
    prisma.clearanceSignatureRequest.findUnique.mockResolvedValue(buildSignatureRequest());
    prisma.employee.findUnique.mockResolvedValue({
      id: NEW_SIGNATORY_ID,
      firstName: "Nina",
      lastName: "Cruz",
    });
    prisma.clearanceSignatureRequest.findFirst.mockResolvedValue(null); // not already assigned
    prisma.clearanceSignatureRequest.update.mockResolvedValue(
      buildSignatureRequest({ signatoryId: NEW_SIGNATORY_ID, status: "PENDING" }),
    );

    const response = await request(app)
      .post(`/api/v1/clearance/${REQUEST_ID}/replace-signatory`)
      .send({ newSignatoryId: NEW_SIGNATORY_ID })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Clearance signatory replaced successfully",
      data: { status: "PENDING" },
    });
    expect(prisma.clearanceSignatureRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: REQUEST_ID },
        data: expect.objectContaining({
          signatoryId: NEW_SIGNATORY_ID,
          status: "PENDING",
          note: null,
          actionAt: null,
        }),
      }),
    );
  });

  it("returns 409 when the offboarding case is no longer in progress", async () => {
    prisma.clearanceSignatureRequest.findUnique.mockResolvedValue(
      buildSignatureRequest({
        offboarding: { ...buildSignatureRequest().offboarding, status: "COMPLETED" },
      }),
    );

    const response = await request(app)
      .post(`/api/v1/clearance/${REQUEST_ID}/replace-signatory`)
      .send({ newSignatoryId: NEW_SIGNATORY_ID })
      .expect(409);

    expect(response.body).toMatchObject({ errorCode: "OFFBOARDING_NOT_IN_PROGRESS" });
    expect(prisma.clearanceSignatureRequest.update).not.toHaveBeenCalled();
  });

  it("returns 404 when the new signatory employee does not exist", async () => {
    prisma.clearanceSignatureRequest.findUnique.mockResolvedValue(buildSignatureRequest());
    prisma.employee.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .post(`/api/v1/clearance/${REQUEST_ID}/replace-signatory`)
      .send({ newSignatoryId: NEW_SIGNATORY_ID })
      .expect(404);

    expect(response.body).toMatchObject({ errorCode: "SIGNATORY_NOT_FOUND" });
  });

  it("returns 409 when the new signatory already has an item on this clearance", async () => {
    prisma.clearanceSignatureRequest.findUnique.mockResolvedValue(buildSignatureRequest());
    prisma.employee.findUnique.mockResolvedValue({
      id: NEW_SIGNATORY_ID,
      firstName: "Nina",
      lastName: "Cruz",
    });
    prisma.clearanceSignatureRequest.findFirst.mockResolvedValue({ id: "other-request" });

    const response = await request(app)
      .post(`/api/v1/clearance/${REQUEST_ID}/replace-signatory`)
      .send({ newSignatoryId: NEW_SIGNATORY_ID })
      .expect(409);

    expect(response.body).toMatchObject({ errorCode: "SIGNATORY_ALREADY_ON_CLEARANCE" });
    expect(prisma.clearanceSignatureRequest.update).not.toHaveBeenCalled();
  });
});
