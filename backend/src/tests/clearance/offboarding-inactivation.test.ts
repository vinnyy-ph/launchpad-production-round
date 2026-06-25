import { runOffboardingInactivationSweep } from "../../jobs/offboarding-inactivation.job";

jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    offboardingRecord: { findMany: jest.fn() },
    employee: { update: jest.fn() },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require("../../core/database/prisma.service");

describe("offboarding inactivation sweep", () => {
  beforeEach(() => {
    prisma.offboardingRecord.findMany.mockReset();
    prisma.employee.update.mockReset();
  });

  it("inactivates employees whose clearance is complete and whose effective date has arrived", async () => {
    prisma.offboardingRecord.findMany.mockResolvedValue([
      { id: "off-1", employeeId: "emp-1" },
      { id: "off-2", employeeId: "emp-2" },
    ]);
    prisma.employee.update.mockResolvedValue({});

    const now = new Date("2026-07-01T00:00:00.000Z");
    const count = await runOffboardingInactivationSweep(now);

    expect(count).toBe(2);
    // Only completed cases past their effective date with a still-active employee qualify.
    expect(prisma.offboardingRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "COMPLETED",
          effectiveDate: { lte: now },
          employee: { status: "ACTIVE" },
        },
      }),
    );
    expect(prisma.employee.update).toHaveBeenCalledTimes(2);
    expect(prisma.employee.update).toHaveBeenCalledWith({
      where: { id: "emp-1" },
      data: { status: "INACTIVE" },
    });
    expect(prisma.employee.update).toHaveBeenCalledWith({
      where: { id: "emp-2" },
      data: { status: "INACTIVE" },
    });
  });

  it("does nothing when no offboardings are due", async () => {
    prisma.offboardingRecord.findMany.mockResolvedValue([]);

    const count = await runOffboardingInactivationSweep(new Date("2026-07-01T00:00:00.000Z"));

    expect(count).toBe(0);
    expect(prisma.employee.update).not.toHaveBeenCalled();
  });
});
