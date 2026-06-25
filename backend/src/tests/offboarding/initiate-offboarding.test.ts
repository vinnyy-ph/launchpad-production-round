import request from "supertest";
import { app } from "../../app";
import {
  buildHrUser,
  buildOffboardingRecord,
  buildTemplateSignatories,
  HR_EMPLOYEE_ID,
  OFFBOARDEE_ID,
  TEMPLATE_ID,
} from "./offboarding-test.helpers";

jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildHrUser();
    next();
  },
}));

jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    employee: { count: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    clearanceTemplate: { findFirst: jest.fn(), findUnique: jest.fn() },
    clearanceSignatory: { findMany: jest.fn() },
    offboardingRecord: { findUnique: jest.fn(), findMany: jest.fn() },
    clearanceSignatureRequest: { create: jest.fn() },
    notification: { create: jest.fn() },
    team: { count: jest.fn(), updateMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require("../../core/database/prisma.service");
const employeeCountMock = prisma.employee.count as jest.Mock;
const employeeFindUniqueMock = prisma.employee.findUnique as jest.Mock;
const clearanceTemplateFindFirstMock = prisma.clearanceTemplate.findFirst as jest.Mock;
const clearanceSignatoryFindManyMock = prisma.clearanceSignatory.findMany as jest.Mock;
const offboardingRecordFindUniqueMock = prisma.offboardingRecord.findUnique as jest.Mock;
const teamCountMock = prisma.team.count as jest.Mock;
const transactionMock = prisma.$transaction as jest.Mock;

describe("POST /api/v1/offboarding - initiate", () => {
  beforeEach(() => {
    employeeCountMock.mockReset();
    employeeFindUniqueMock.mockReset();
    clearanceTemplateFindFirstMock.mockReset();
    clearanceSignatoryFindManyMock.mockReset();
    offboardingRecordFindUniqueMock.mockReset();
    teamCountMock.mockReset();
    transactionMock.mockReset();
    employeeCountMock.mockResolvedValue(0);
    teamCountMock.mockResolvedValue(0);
  });

  it("creates the record, snapshots signature requests, and sets the employee to OFFBOARDING", async () => {
    // initiator (by userId), offboardee (by id), and notification lookups all hit findUnique.
    employeeFindUniqueMock.mockImplementation(({ where }: { where: { userId?: string; id?: string } }) => {
      if (where.userId) return Promise.resolve({ id: HR_EMPLOYEE_ID });
      return Promise.resolve({
        id: OFFBOARDEE_ID,
        firstName: "Blake",
        lastName: "Rivera",
        status: "ACTIVE",
        userId: "blake-user-id",
      });
    });
    offboardingRecordFindUniqueMock
      .mockResolvedValueOnce(null) // no existing active offboarding
      .mockResolvedValueOnce(buildOffboardingRecord()); // findRecordById after create
    clearanceTemplateFindFirstMock.mockResolvedValue({ id: TEMPLATE_ID });
    clearanceSignatoryFindManyMock.mockResolvedValue(buildTemplateSignatories());

    let employeeStatusUpdate: unknown = null;
    const createdRequests: unknown[] = [];
    transactionMock.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        offboardingRecord: {
          create: jest.fn().mockResolvedValue({ id: "offboarding-id" }),
        },
        clearanceSignatureRequest: {
          create: jest.fn().mockImplementation(({ data }: { data: unknown }) => {
            createdRequests.push(data);
            return Promise.resolve(data);
          }),
        },
        employee: {
          update: jest.fn().mockImplementation((args: unknown) => {
            employeeStatusUpdate = args;
            return Promise.resolve({});
          }),
        },
      };
      return cb(tx);
    });

    const response = await request(app)
      .post("/api/v1/offboarding")
      .send({
        employeeId: OFFBOARDEE_ID,
        tenderDate: "2026-06-01",
        effectiveDate: "2026-06-30",
      })
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      data: { id: "offboarding-id", status: "IN_PROGRESS" },
    });
    // Snapshotted one request per template signatory, copying purpose/requirements.
    expect(createdRequests).toHaveLength(2);
    expect(createdRequests[0]).toMatchObject({
      signatoryId: "kurt-id",
      purpose: "Executive sign-off",
      status: "PENDING",
    });
    // Employee flipped to OFFBOARDING.
    expect(employeeStatusUpdate).toMatchObject({
      where: { id: OFFBOARDEE_ID },
      data: { status: "OFFBOARDING" },
    });
  });

  it("returns 409 when the employee already has an offboarding record", async () => {
    employeeFindUniqueMock.mockImplementation(({ where }: { where: { userId?: string } }) =>
      where.userId
        ? Promise.resolve({ id: HR_EMPLOYEE_ID })
        : Promise.resolve({ id: OFFBOARDEE_ID, firstName: "Blake", lastName: "Rivera", status: "ACTIVE" }),
    );
    offboardingRecordFindUniqueMock.mockResolvedValue({ id: "existing-id" });

    const response = await request(app)
      .post("/api/v1/offboarding")
      .send({ employeeId: OFFBOARDEE_ID, tenderDate: "2026-06-01", effectiveDate: "2026-06-30" })
      .expect(409);

    expect(response.body).toMatchObject({ errorCode: "OFFBOARDING_ALREADY_EXISTS" });
  });

  it("returns 400 when effectiveDate is before tenderDate", async () => {
    const response = await request(app)
      .post("/api/v1/offboarding")
      .send({ employeeId: OFFBOARDEE_ID, tenderDate: "2026-06-30", effectiveDate: "2026-06-01" })
      .expect(400);

    expect(response.body).toMatchObject({ errorCode: "INVALID_EFFECTIVE_DATE" });
  });

  it("requires a new supervisor when the employee has direct reports", async () => {
    employeeFindUniqueMock.mockImplementation(({ where }: { where: { userId?: string } }) =>
      where.userId
        ? Promise.resolve({ id: HR_EMPLOYEE_ID })
        : Promise.resolve({ id: OFFBOARDEE_ID, firstName: "Blake", lastName: "Rivera", status: "ACTIVE" }),
    );
    offboardingRecordFindUniqueMock.mockResolvedValue(null);
    clearanceTemplateFindFirstMock.mockResolvedValue({ id: TEMPLATE_ID });
    clearanceSignatoryFindManyMock.mockResolvedValue(buildTemplateSignatories());
    employeeCountMock.mockResolvedValue(2);

    const response = await request(app)
      .post("/api/v1/offboarding")
      .send({ employeeId: OFFBOARDEE_ID, tenderDate: "2026-06-01", effectiveDate: "2026-06-30" })
      .expect(400);

    expect(response.body).toMatchObject({ errorCode: "VALIDATION_FAILED" });
    expect(response.body.errors[0]).toMatchObject({ field: "newSupervisorId" });
  });

  it("requires a new team leader when the employee leads teams", async () => {
    employeeFindUniqueMock.mockImplementation(({ where }: { where: { userId?: string } }) =>
      where.userId
        ? Promise.resolve({ id: HR_EMPLOYEE_ID })
        : Promise.resolve({ id: OFFBOARDEE_ID, firstName: "Blake", lastName: "Rivera", status: "ACTIVE" }),
    );
    offboardingRecordFindUniqueMock.mockResolvedValue(null);
    clearanceTemplateFindFirstMock.mockResolvedValue({ id: TEMPLATE_ID });
    clearanceSignatoryFindManyMock.mockResolvedValue(buildTemplateSignatories());
    teamCountMock.mockResolvedValue(1);

    const response = await request(app)
      .post("/api/v1/offboarding")
      .send({ employeeId: OFFBOARDEE_ID, tenderDate: "2026-06-01", effectiveDate: "2026-06-30" })
      .expect(400);

    expect(response.body).toMatchObject({ errorCode: "VALIDATION_FAILED" });
    expect(response.body.errors[0]).toMatchObject({ field: "newTeamLeaderId" });
  });
});
