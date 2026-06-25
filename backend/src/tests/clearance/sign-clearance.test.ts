import request from "supertest";
import { app } from "../../app";
import {
  buildSignatoryUser,
  buildSignatureRequest,
  OFFBOARDEE_ID,
  OFFBOARDING_ID,
  REQUEST_ID,
  SIGNATURE_IMAGE,
  SIGNATORY_EMPLOYEE_ID,
} from "./clearance-test.helpers";

jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildSignatoryUser();
    next();
  },
}));

jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    employee: { findUnique: jest.fn(), update: jest.fn() },
    clearanceSignatureRequest: {
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    offboardingRecord: { update: jest.fn() },
    notification: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require("../../core/database/prisma.service");

describe("POST /api/v1/clearance/:requestId/sign", () => {
  beforeEach(() => {
    prisma.employee.findUnique.mockReset();
    prisma.employee.update.mockReset();
    prisma.clearanceSignatureRequest.findUnique.mockReset();
    prisma.clearanceSignatureRequest.update.mockReset();
    prisma.clearanceSignatureRequest.count.mockReset();
    prisma.offboardingRecord.update.mockReset();
    prisma.$transaction.mockReset();
  });

  it("signs the request and does NOT complete while other requests remain unsigned", async () => {
    prisma.clearanceSignatureRequest.findUnique.mockResolvedValue(buildSignatureRequest());
    prisma.employee.findUnique.mockResolvedValue({ id: SIGNATORY_EMPLOYEE_ID });
    prisma.clearanceSignatureRequest.update.mockResolvedValue(
      buildSignatureRequest({
        status: "SIGNED",
        note: null,
        signatureImage: SIGNATURE_IMAGE,
        actionAt: new Date(),
      }),
    );
    prisma.clearanceSignatureRequest.count.mockResolvedValue(1); // one still unsigned

    const response = await request(app)
      .post(`/api/v1/clearance/${REQUEST_ID}/sign`)
      .send({ signatureImage: SIGNATURE_IMAGE })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: { status: "SIGNED", offboardingCompleted: false, employeeInactivated: false },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("completes the offboarding and sets the employee INACTIVE when all requests are signed and the effective date has passed", async () => {
    prisma.clearanceSignatureRequest.findUnique.mockResolvedValue(buildSignatureRequest());
    prisma.employee.findUnique.mockResolvedValue({ id: SIGNATORY_EMPLOYEE_ID });
    prisma.clearanceSignatureRequest.update.mockResolvedValue(
      buildSignatureRequest({
        status: "SIGNED",
        note: null,
        signatureImage: SIGNATURE_IMAGE,
        actionAt: new Date(),
        offboarding: { effectiveDate: new Date("2000-01-01T00:00:00.000Z") }, // already passed
      }),
    );
    prisma.clearanceSignatureRequest.count.mockResolvedValue(0); // none unsigned
    prisma.$transaction.mockResolvedValue([{}, {}]);
    // The completion transaction is built from prisma.offboardingRecord.update + employee.update.
    prisma.offboardingRecord.update.mockReturnValue({ __op: "record-complete" });
    prisma.employee.update.mockReturnValue({ __op: "employee-inactive" });

    const response = await request(app)
      .post(`/api/v1/clearance/${REQUEST_ID}/sign`)
      .send({ note: "All clear", signatureImage: SIGNATURE_IMAGE })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: { status: "SIGNED", offboardingCompleted: true, employeeInactivated: true },
    });
    expect(prisma.offboardingRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: OFFBOARDING_ID },
        data: expect.objectContaining({ status: "COMPLETED" }),
      }),
    );
    expect(prisma.employee.update).toHaveBeenCalledWith({
      where: { id: OFFBOARDEE_ID },
      data: { status: "INACTIVE" },
    });
  });

  it("completes the offboarding but keeps the employee ACTIVE when all signed before the effective date", async () => {
    prisma.clearanceSignatureRequest.findUnique.mockResolvedValue(buildSignatureRequest());
    prisma.employee.findUnique.mockResolvedValue({ id: SIGNATORY_EMPLOYEE_ID });
    prisma.clearanceSignatureRequest.update.mockResolvedValue(
      buildSignatureRequest({
        status: "SIGNED",
        note: null,
        signatureImage: SIGNATURE_IMAGE,
        actionAt: new Date(),
        offboarding: { effectiveDate: new Date("2999-01-01T00:00:00.000Z") }, // not yet reached
      }),
    );
    prisma.clearanceSignatureRequest.count.mockResolvedValue(0); // none unsigned
    prisma.$transaction.mockResolvedValue([{}]);
    prisma.offboardingRecord.update.mockReturnValue({ __op: "record-complete" });

    const response = await request(app)
      .post(`/api/v1/clearance/${REQUEST_ID}/sign`)
      .send({ signatureImage: SIGNATURE_IMAGE })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: { status: "SIGNED", offboardingCompleted: true, employeeInactivated: false },
    });
    expect(prisma.offboardingRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: OFFBOARDING_ID },
        data: expect.objectContaining({ status: "COMPLETED" }),
      }),
    );
    // The employee is not deactivated until the effective date arrives.
    expect(prisma.employee.update).not.toHaveBeenCalled();
  });

  it("returns 403 when the caller is not the request's signatory", async () => {
    prisma.clearanceSignatureRequest.findUnique.mockResolvedValue(buildSignatureRequest());
    prisma.employee.findUnique.mockResolvedValue({ id: "someone-else-id" });

    const response = await request(app)
      .post(`/api/v1/clearance/${REQUEST_ID}/sign`)
      .send({ signatureImage: SIGNATURE_IMAGE })
      .expect(403);

    expect(response.body).toMatchObject({ errorCode: "NOT_CLEARANCE_SIGNATORY" });
  });

  it("returns 400 when signatureImage is missing or invalid", async () => {
    await request(app)
      .post(`/api/v1/clearance/${REQUEST_ID}/sign`)
      .send({})
      .expect(400);

    const response = await request(app)
      .post(`/api/v1/clearance/${REQUEST_ID}/sign`)
      .send({ signatureImage: "typed:Blake" })
      .expect(400);

    expect(response.body).toMatchObject({ errorCode: "VALIDATION_FAILED" });
  });
});
