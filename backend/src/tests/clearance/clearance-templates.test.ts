import request from "supertest";
import { app } from "../../app";
import { buildHrUser } from "./clearance-test.helpers";

jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildHrUser();
    next();
  },
}));

jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    clearanceTemplate: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
    },
    clearanceSignatory: { deleteMany: jest.fn() },
    employee: { findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require("../../core/database/prisma.service");

const TEMPLATE_ID = "template-id";
const SIG_EMPLOYEE_ID = "sig-employee-id";

/** A clearance version with one signatory + in-use count, as the include returns it. */
function buildTemplateRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: TEMPLATE_ID,
    name: "Standard Clearance",
    isDefault: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    signatories: [
      {
        id: "signatory-id",
        employee: {
          id: SIG_EMPLOYEE_ID,
          firstName: "Kurt",
          lastName: "Reyes",
          jobTitle: "CEO",
        },
        purpose: "Executive sign-off",
        requirements: "Confirm no outstanding assets.",
        order: 1,
      },
    ],
    _count: { offboardingRecord: 0 },
    ...overrides,
  };
}

function buildCreateBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "Standard Clearance",
    isDefault: true,
    signatories: [
      {
        employeeId: SIG_EMPLOYEE_ID,
        purpose: "Executive sign-off",
        requirements: "Confirm no outstanding assets.",
      },
    ],
    ...overrides,
  };
}

describe("Clearance versions (templates) API", () => {
  beforeEach(() => {
    prisma.clearanceTemplate.findMany.mockReset();
    prisma.clearanceTemplate.findUnique.mockReset();
    prisma.clearanceTemplate.create.mockReset();
    prisma.clearanceTemplate.update.mockReset();
    prisma.clearanceTemplate.delete.mockReset();
    prisma.clearanceTemplate.updateMany.mockReset();
    prisma.clearanceSignatory.deleteMany.mockReset();
    prisma.employee.findMany.mockReset();
    prisma.$transaction.mockReset();
    // Run transaction callbacks against the same mocked prisma client.
    prisma.$transaction.mockImplementation((cb: (tx: unknown) => unknown) => cb(prisma));
  });

  it("GET / lists clearance versions with their signatories", async () => {
    prisma.clearanceTemplate.findMany.mockResolvedValue([buildTemplateRecord()]);

    const response = await request(app).get("/api/v1/clearance-templates").expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: [
        {
          id: TEMPLATE_ID,
          name: "Standard Clearance",
          isDefault: true,
          inUseCount: 0,
          signatories: [{ purpose: "Executive sign-off", order: 1 }],
        },
      ],
    });
  });

  it("POST / creates a version (201) after validating signatory employees exist", async () => {
    prisma.employee.findMany.mockResolvedValue([{ id: SIG_EMPLOYEE_ID }]);
    prisma.clearanceTemplate.create.mockResolvedValue(buildTemplateRecord());

    const response = await request(app)
      .post("/api/v1/clearance-templates")
      .send(buildCreateBody())
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      message: "Clearance version created successfully",
      data: { id: TEMPLATE_ID, isDefault: true },
    });
    // Setting default clears the prior default within the transaction.
    expect(prisma.clearanceTemplate.updateMany).toHaveBeenCalledWith({
      where: { isDefault: true },
      data: { isDefault: false },
    });
  });

  it("POST / returns 422 when no signatories are provided", async () => {
    const response = await request(app)
      .post("/api/v1/clearance-templates")
      .send(buildCreateBody({ signatories: [] }))
      .expect(422);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "CLEARANCE_TEMPLATE_REQUIRES_SIGNATORY",
    });
  });

  it("POST / returns 404 when a signatory employee does not exist", async () => {
    prisma.employee.findMany.mockResolvedValue([]); // none of the ids exist

    const response = await request(app)
      .post("/api/v1/clearance-templates")
      .send(buildCreateBody())
      .expect(404);

    expect(response.body).toMatchObject({ errorCode: "SIGNATORY_NOT_FOUND" });
  });

  it("POST /:id/default sets the version as default and clears the others", async () => {
    prisma.clearanceTemplate.findUnique.mockResolvedValue(buildTemplateRecord());
    prisma.clearanceTemplate.update.mockResolvedValue(buildTemplateRecord({ isDefault: true }));

    const response = await request(app)
      .post(`/api/v1/clearance-templates/${TEMPLATE_ID}/default`)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Clearance version set as default successfully",
      data: { isDefault: true },
    });
    expect(prisma.clearanceTemplate.updateMany).toHaveBeenCalledWith({
      where: { isDefault: true, NOT: { id: TEMPLATE_ID } },
      data: { isDefault: false },
    });
  });

  it("DELETE /:id returns 409 when offboarding cases still use the version", async () => {
    prisma.clearanceTemplate.findUnique.mockResolvedValue(
      buildTemplateRecord({ _count: { offboardingRecord: 2 } }),
    );

    const response = await request(app)
      .delete(`/api/v1/clearance-templates/${TEMPLATE_ID}`)
      .expect(409);

    expect(response.body).toMatchObject({ errorCode: "CLEARANCE_TEMPLATE_IN_USE" });
    expect(prisma.clearanceTemplate.delete).not.toHaveBeenCalled();
  });

  it("DELETE /:id deletes an unused version", async () => {
    prisma.clearanceTemplate.findUnique.mockResolvedValue(buildTemplateRecord());
    prisma.clearanceTemplate.delete.mockResolvedValue(buildTemplateRecord());

    const response = await request(app)
      .delete(`/api/v1/clearance-templates/${TEMPLATE_ID}`)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Clearance version deleted successfully",
    });
    expect(prisma.clearanceSignatory.deleteMany).toHaveBeenCalledWith({
      where: { templateId: TEMPLATE_ID },
    });
  });
});
