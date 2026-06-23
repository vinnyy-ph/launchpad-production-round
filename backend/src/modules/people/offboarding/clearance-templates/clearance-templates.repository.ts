import { prisma } from "../../../../core/database/prisma.service";
import type { ClearanceTemplateSignatoryInputDto } from "./dto";

/** Shape returned by the template queries — signatories joined with their employee. */
const templateInclude = {
  signatories: {
    orderBy: { order: "asc" as const },
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, jobTitle: true },
      },
    },
  },
  _count: { select: { offboardingRecord: true } },
} as const;

/**
 * Persistence layer for clearance versions (templates) and their signatories.
 * All Prisma access for clearance-version management lives here.
 */
export class ClearanceTemplatesRepository {
  /** Lists every clearance version with its ordered signatories, default first. */
  async findAll() {
    return prisma.clearanceTemplate.findMany({
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      include: templateInclude,
    });
  }

  /** Loads one clearance version with signatories, or null when absent. */
  async findById(id: string) {
    return prisma.clearanceTemplate.findUnique({
      where: { id },
      include: templateInclude,
    });
  }

  /** Returns the ids of employees that exist among the given ids (signatory validation). */
  async findExistingEmployeeIds(employeeIds: string[]): Promise<string[]> {
    const rows = await prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true },
    });

    return rows.map((row) => row.id);
  }

  /**
   * Creates a clearance version with its ordered signatories in one transaction.
   * When `isDefault` is set, clears the previous default first so exactly one remains.
   */
  async create(
    name: string,
    isDefault: boolean,
    signatories: ClearanceTemplateSignatoryInputDto[],
  ) {
    return prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.clearanceTemplate.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }

      const template = await tx.clearanceTemplate.create({
        data: {
          name,
          isDefault,
          signatories: {
            create: signatories.map((signatory, index) => ({
              employeeId: signatory.employeeId,
              purpose: signatory.purpose,
              requirements: signatory.requirements,
              order: index + 1,
            })),
          },
        },
        include: templateInclude,
      });

      return template;
    });
  }

  /**
   * Replaces a version's name and signatory list atomically. Old signatory rows are
   * deleted and re-created with fresh order indices. Snapshots on in-flight clearances
   * are untouched (they live on ClearanceSignatureRequest, not the template).
   */
  async update(
    id: string,
    name: string,
    signatories: ClearanceTemplateSignatoryInputDto[],
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.clearanceSignatory.deleteMany({ where: { templateId: id } });

      const template = await tx.clearanceTemplate.update({
        where: { id },
        data: {
          name,
          signatories: {
            create: signatories.map((signatory, index) => ({
              employeeId: signatory.employeeId,
              purpose: signatory.purpose,
              requirements: signatory.requirements,
              order: index + 1,
            })),
          },
        },
        include: templateInclude,
      });

      return template;
    });
  }

  /**
   * Makes the given version the default, clearing the flag on every other version.
   * Returns the updated version with signatories.
   */
  async setDefault(id: string) {
    return prisma.$transaction(async (tx) => {
      await tx.clearanceTemplate.updateMany({
        where: { isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });

      return tx.clearanceTemplate.update({
        where: { id },
        data: { isDefault: true },
        include: templateInclude,
      });
    });
  }

  /** Deletes a version and its signatory rows atomically. */
  async delete(id: string) {
    return prisma.$transaction(async (tx) => {
      await tx.clearanceSignatory.deleteMany({ where: { templateId: id } });

      return tx.clearanceTemplate.delete({
        where: { id },
        include: templateInclude,
      });
    });
  }
}
