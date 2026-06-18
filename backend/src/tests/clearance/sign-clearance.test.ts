import request from "supertest";
import { app } from "../../app";
import {
  buildSignatoryUser,
  buildSignatureRequest,
  OFFBOARDEE_ID,
  OFFBOARDING_ID,
  REQUEST_ID,
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
      buildSignatureRequest({ status: "SIGNED", note: null, actionAt: new Date() }),
    );
    prisma.clearanceSignatureRequest.count.mockResolvedValue(1); // one still unsigned

    const response = await request(app)
      .post(`/api/v1/clearance/${REQUEST_ID}/sign`)
      .send({})
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: { status: "SIGNED", offboardingCompleted: false, employeeInactivated: false },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("AUTO-COMPLETES the offboarding and sets the employee INACTIVE when all requests are signed", async () => {
    prisma.clearanceSignatureRequest.findUnique.mockResolvedValue(buildSignatureRequest());
    prisma.employee.findUnique.mockResolvedValue({ id: SIGNATORY_EMPLOYEE_ID });
    prisma.clearanceSignatureRequest.update.mockResolvedValue(
      buildSignatureRequest({ status: "SIGNED", note: null, actionAt: new Date() }),
    );
    prisma.clearanceSignatureRequest.count.mockResolvedValue(0); // none unsigned
    prisma.$transaction.mockResolvedValue([{}, {}]);
    // The completion transaction is built from prisma.offboardingRecord.update + employee.update.
    prisma.offboardingRecord.update.mockReturnValue({ __op: "record-complete" });
    prisma.employee.update.mockReturnValue({ __op: "employee-inactive" });

    const response = await request(app)
      .post(`/api/v1/clearance/${REQUEST_ID}/sign`)
      .send({ note: "All clear" })
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

  it("returns 403 when the caller is not the request's signatory", async () => {
    prisma.clearanceSignatureRequest.findUnique.mockResolvedValue(buildSignatureRequest());
    prisma.employee.findUnique.mockResolvedValue({ id: "someone-else-id" });

    const response = await request(app)
      .post(`/api/v1/clearance/${REQUEST_ID}/sign`)
      .send({})
      .expect(403);

    expect(response.body).toMatchObject({ errorCode: "NOT_CLEARANCE_SIGNATORY" });
  });
});
