import request from "supertest";
import { app } from "../../app";
import {
  buildHrUser,
  buildSignatoryUser,
  buildSignatureRequest,
  OFFBOARDING_ID,
  REQUEST_ID,
  SIGNATORY_EMPLOYEE_ID,
} from "./clearance-test.helpers";

// Default caller is the signatory; HR scenarios swap in via mockCurrentRole.
let asHr = false;

jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = asHr ? buildHrUser() : buildSignatoryUser();
    next();
  },
}));

jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    employee: { findMany: jest.fn(), findUnique: jest.fn() },
    clearanceSignatureRequest: { findUnique: jest.fn(), update: jest.fn() },
    notification: { create: jest.fn() },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require("../../core/database/prisma.service");

describe("clearance reject / reset", () => {
  beforeEach(() => {
    asHr = false;
    prisma.employee.findMany.mockReset();
    prisma.employee.findUnique.mockReset();
    prisma.clearanceSignatureRequest.findUnique.mockReset();
    prisma.clearanceSignatureRequest.update.mockReset();
    prisma.notification.create.mockReset();
  });

  it("rejects with a required note and stores the note", async () => {
    prisma.clearanceSignatureRequest.findUnique.mockResolvedValue(buildSignatureRequest());
    prisma.employee.findUnique.mockResolvedValue({ id: SIGNATORY_EMPLOYEE_ID });
    prisma.employee.findMany.mockResolvedValue([{ id: "hr-employee-id", userId: "hr-user-id" }]);
    prisma.clearanceSignatureRequest.update.mockResolvedValue(
      buildSignatureRequest({ status: "REJECTED", note: "Missing handover doc", actionAt: new Date() }),
    );
    prisma.notification.create.mockResolvedValue({
      id: "notification-id",
      recipientId: "hr-employee-id",
      type: "CLEARANCE_REJECTED",
      channel: "IN_APP",
      subject: "Clearance rejected",
      body: "A signatory rejected Blake Rivera's offboarding clearance: \"Missing handover doc\"",
      linkUrl: `/hr/directory/offboarding/${OFFBOARDING_ID}`,
      sourceType: "ClearanceSignatureRequest",
      sourceId: REQUEST_ID,
      isRead: false,
      readAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(app)
      .post(`/api/v1/clearance/${REQUEST_ID}/reject`)
      .send({ note: "Missing handover doc" })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: { status: "REJECTED", note: "Missing handover doc" },
    });
    expect(prisma.clearanceSignatureRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: REQUEST_ID },
        data: expect.objectContaining({ status: "REJECTED", note: "Missing handover doc" }),
      }),
    );
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          recipientId: "hr-employee-id",
          type: "CLEARANCE_REJECTED",
          linkUrl: `/hr/directory/offboarding/${OFFBOARDING_ID}`,
          sourceType: "ClearanceSignatureRequest",
          sourceId: REQUEST_ID,
        }),
      }),
    );
  });

  it("returns 400 when rejecting without a note", async () => {
    const response = await request(app)
      .post(`/api/v1/clearance/${REQUEST_ID}/reject`)
      .send({})
      .expect(400);

    expect(response.body).toMatchObject({ errorCode: "REJECTION_NOTE_REQUIRED" });
  });

  it("lets HR reset a rejected request back to PENDING", async () => {
    asHr = true;
    prisma.clearanceSignatureRequest.findUnique.mockResolvedValue(
      buildSignatureRequest({ status: "REJECTED", note: "Missing doc" }),
    );
    prisma.clearanceSignatureRequest.update.mockResolvedValue(
      buildSignatureRequest({ status: "PENDING", note: null, actionAt: null }),
    );

    const response = await request(app)
      .post(`/api/v1/clearance/${REQUEST_ID}/reset`)
      .send({})
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: { status: "PENDING", note: null },
    });
    expect(prisma.clearanceSignatureRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: REQUEST_ID },
        data: expect.objectContaining({ status: "PENDING", note: null, actionAt: null }),
      }),
    );
    // HR resets without an employee lookup (role-based authz).
    expect(prisma.employee.findUnique).not.toHaveBeenCalled();
  });
});
