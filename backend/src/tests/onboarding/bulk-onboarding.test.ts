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
});
