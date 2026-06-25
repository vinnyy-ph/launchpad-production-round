jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    employee: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
    employeeEmergencyContact: { findMany: jest.fn() },
    onboardingInvitation: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    onboardingRecord: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  },
}));

import { BulkOnboardingService } from "../../modules/people/onboarding/bulk/bulk.service";
import { BulkOnboardingValidation } from "../../modules/people/onboarding/bulk/bulk.validation";

const supervisor = {
  id: "supervisor-1",
  companyEmail: "jane.manager@example.com",
  firstName: "Jane",
  lastName: "Manager",
};

function buildRow(overrides: Record<string, unknown> = {}) {
  return {
    rowNumber: 1,
    companyEmail: "new.hire@example.com",
    firstName: "New",
    lastName: "Hire",
    jobTitle: "Software Engineer",
    department: "Engineering",
    supervisorEmail: "Jane.Manager@Example.com",
    ...overrides,
  };
}

function buildService(overrides: {
  supervisorsByEmail?: Map<string, typeof supervisor>;
  supervisorsById?: Map<string, typeof supervisor>;
  existingEmails?: Set<string>;
  onboardEmployee?: jest.Mock;
  sendInvitation?: jest.Mock;
} = {}) {
  const repository = {
    findExistingEmails: jest.fn().mockResolvedValue(overrides.existingEmails ?? new Set()),
    findSupervisorsByEmails: jest
      .fn()
      .mockResolvedValue(
        overrides.supervisorsByEmail ??
          new Map([[supervisor.companyEmail, supervisor]]),
      ),
    findSupervisorsByIds: jest
      .fn()
      .mockResolvedValue(overrides.supervisorsById ?? new Map([[supervisor.id, supervisor]])),
    findEmergencyContactNumbers: jest.fn().mockResolvedValue([]),
  };

  const onboardingService = {
    onboardEmployee:
      overrides.onboardEmployee ??
      jest.fn().mockResolvedValue({
        data: {
          onboardingRecord: { id: "record-1" },
        },
      }),
  };

  const invitationService = {
    sendInvitation: overrides.sendInvitation ?? jest.fn().mockResolvedValue(undefined),
  };

  return {
    repository,
    onboardingService,
    invitationService,
    service: new BulkOnboardingService(
      repository as never,
      onboardingService as never,
      invitationService as never,
    ),
  };
}

describe("bulk onboarding supervisor email resolution", () => {
  const validation = new BulkOnboardingValidation();

  it("previews a valid supervisorEmail with supervisor full name", async () => {
    const parsed = validation.parseRows({ rows: [buildRow()] });
    const { service } = buildService();

    const preview = await service.preview(parsed);

    expect(preview.errors).toEqual([]);
    expect(preview.rows[0]).toMatchObject({
      rowNumber: 1,
      supervisorEmail: "jane.manager@example.com",
      supervisorName: "Jane Manager",
      status: "valid",
    });
    expect(parsed.rows[0].supervisorId).toBe("supervisor-1");
  });

  it("returns a supervisorEmail row error when the supervisor is missing", async () => {
    const parsed = validation.parseRows({ rows: [buildRow()] });
    const { service } = buildService({ supervisorsByEmail: new Map() });

    const preview = await service.preview(parsed);

    expect(preview.errors).toEqual([
      {
        rowNumber: 1,
        field: "supervisorEmail",
        message: "Supervisor not found.",
      },
    ]);
    expect(preview.rows[0]).toMatchObject({
      supervisorEmail: "jane.manager@example.com",
      supervisorName: null,
      status: "invalid",
    });
  });

  it("commits rows using supervisorEmail after resolving supervisorId", async () => {
    const parsed = validation.parseRows({ rows: [buildRow()] });
    const onboardEmployee = jest.fn().mockResolvedValue({
      data: { onboardingRecord: { id: "record-1" } },
    });
    const { service } = buildService({ onboardEmployee });

    await service.commit(parsed);

    expect(onboardEmployee).toHaveBeenCalledWith(
      expect.objectContaining({
        companyEmail: "new.hire@example.com",
        supervisorEmail: "jane.manager@example.com",
        supervisorId: "supervisor-1",
      }),
    );
  });

  it("keeps legacy supervisorId rows working", async () => {
    const parsed = validation.parseRows({
      rows: [
        buildRow({
          supervisorEmail: undefined,
          supervisorId: "supervisor-1",
        }),
      ],
    });
    const { service } = buildService();

    const preview = await service.preview(parsed);

    expect(preview.errors).toEqual([]);
    expect(preview.rows[0]).toMatchObject({
      supervisorEmail: "jane.manager@example.com",
      supervisorName: "Jane Manager",
      status: "valid",
    });
  });

  it("keeps duplicate employee email validation in the preview", async () => {
    const parsed = validation.parseRows({ rows: [buildRow()] });
    const { service } = buildService({
      existingEmails: new Set(["new.hire@example.com"]),
    });

    const preview = await service.preview(parsed);

    expect(preview.errors).toEqual(
      expect.arrayContaining([
        {
          rowNumber: 1,
          field: "companyEmail",
          message: "An employee with this email already exists.",
        },
      ]),
    );
  });

  it("flags every row when the same company email appears more than once in the file", async () => {
    const parsed = validation.parseRows({
      rows: [
        buildRow({ rowNumber: 1, companyEmail: "duplicate@example.com" }),
        buildRow({
          rowNumber: 2,
          companyEmail: "duplicate@example.com",
          firstName: "Other",
          lastName: "Person",
        }),
      ],
    });
    const { service } = buildService();

    const preview = await service.preview(parsed);

    expect(preview.errors).toEqual(
      expect.arrayContaining([
        {
          rowNumber: 1,
          field: "companyEmail",
          message: "This email appears more than once in the file.",
        },
        {
          rowNumber: 2,
          field: "companyEmail",
          message: "This email appears more than once in the file.",
        },
      ]),
    );
    expect(preview.rows[0].status).toBe("invalid");
    expect(preview.rows[1].status).toBe("invalid");
  });

  it("returns a companyEmail row error when the work email is not a valid email format", async () => {
    const parsed = validation.parseRows({
      rows: [buildRow({ companyEmail: "maria.santos" })],
    });
    const { service } = buildService();

    const preview = await service.preview(parsed);

    expect(preview.errors).toEqual([
      {
        rowNumber: 1,
        field: "companyEmail",
        message: "Invalid companyEmail",
      },
    ]);
  });

  it("returns required and empty-space messages for missing bulk fields", () => {
    const parsed = validation.parseRows({
      rows: [
        buildRow({
          firstName: "",
          lastName: "   ",
        }),
      ],
    });

    expect(parsed.errors).toEqual(
      expect.arrayContaining([
        {
          rowNumber: 1,
          field: "firstName",
          message: "First name is required.",
        },
        {
          rowNumber: 1,
          field: "lastName",
          message: "Last name cannot be empty spaces.",
        },
      ]),
    );
  });

  it("returns a field error for unsafe HTML in a bulk text field", () => {
    const parsed = validation.parseRows({
      rows: [buildRow({ jobTitle: "<script>alert(1)</script>" })],
    });

    expect(parsed.errors).toEqual([
      {
        rowNumber: 1,
        field: "jobTitle",
        message: "Job title must not contain HTML or control characters",
      },
    ]);
  });

  it("returns a friendly profanity message for bulk text fields", () => {
    const parsed = validation.parseRows({
      rows: [buildRow({ firstName: "f*ck" })],
    });

    expect(parsed.errors).toEqual([
      {
        rowNumber: 1,
        field: "firstName",
        message: "Please remove any offensive or inappropriate language.",
      },
    ]);
  });
});
