
import { tryExtractNormalizedPhilippinePhone } from "../../../shared/phone";
import { API_SUCCESS_MESSAGES } from "../../../../core/globals";
import { InvitationService } from "../invitation/invitation.service";
import { OnboardingService } from "../onboarding.service";
import { BulkOnboardingRepository } from "./bulk.repository";
import type {
  BulkOnboardingCommitData,
  BulkOnboardingPreviewData,
  BulkOnboardingRowError,
  BulkOnboardingRowInput,
  ParsedBulkOnboardingRows,
} from "./bulk.types";

export class BulkOnboardingValidationError extends Error {
  constructor(public readonly preview: BulkOnboardingPreviewData) {
    super("Bulk onboarding rows are invalid");
  }
}

export class BulkOnboardingService {
  constructor(
    private readonly bulkRepository = new BulkOnboardingRepository(),
    private readonly onboardingService = new OnboardingService(),
    private readonly invitationService = new InvitationService(),
  ) {}

  async preview(parsed: ParsedBulkOnboardingRows): Promise<BulkOnboardingPreviewData> {
    const rows = parsed.rows;
    const errors: BulkOnboardingRowError[] = [...parsed.errors];
    const emails = rows.map((row) => row.companyEmail.toLowerCase());
    const supervisorEmails = Array.from(
      new Set(
        rows
          .map((row) => row.supervisorEmail?.toLowerCase())
          .filter((email): email is string => Boolean(email)),
      ),
    );
    const legacySupervisorIds = Array.from(
      new Set(
        rows
          .filter((row) => !row.supervisorEmail && row.supervisorId)
          .map((row) => row.supervisorId)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const normalizedPhones = rows
      .map((row) => row.emergencyContactNormalizedPhone)
      .filter((phone): phone is string => Boolean(phone));

    const [
      existingEmails,
      supervisorsByEmail,
      supervisorsById,
      existingPhoneNumbers,
    ] = await Promise.all([
      this.bulkRepository.findExistingEmails(Array.from(new Set(emails))),
      this.bulkRepository.findSupervisorsByEmails(supervisorEmails),
      this.bulkRepository.findSupervisorsByIds(legacySupervisorIds),
      this.bulkRepository.findEmergencyContactNumbers(),
    ]);

    const seenEmails = new Set<string>();
    const seenPhones = new Set<string>();
    const resolvedSupervisorsByRow = new Map<
      number,
      { id: string; companyEmail: string; firstName: string; lastName: string }
    >();
    const existingPhones = new Set(
      existingPhoneNumbers
        .map((phone) => tryExtractNormalizedPhilippinePhone(phone))
        .filter((phone): phone is string => Boolean(phone)),
    );

    rows.forEach((row) => {
      const email = row.companyEmail.toLowerCase();
      if (seenEmails.has(email)) {
        errors.push({
          rowNumber: row.rowNumber,
          field: "companyEmail",
          message: "This email appears more than once in the file.",
        });
      }
      seenEmails.add(email);

      if (existingEmails.has(email)) {
        errors.push({
          rowNumber: row.rowNumber,
          field: "companyEmail",
          message: "An employee with this email already exists.",
        });
      }

      const supervisorEmail = row.supervisorEmail?.toLowerCase();
      const supervisorByEmail = supervisorEmail ? supervisorsByEmail.get(supervisorEmail) : null;
      const supervisorById = !supervisorEmail && row.supervisorId
        ? supervisorsById.get(row.supervisorId)
        : null;
      const supervisor = supervisorByEmail ?? supervisorById;

      if (supervisor) {
        row.supervisorId = supervisor.id;
        row.supervisorEmail = supervisor.companyEmail.toLowerCase();
        resolvedSupervisorsByRow.set(row.rowNumber, supervisor);
      } else {
        errors.push({
          rowNumber: row.rowNumber,
          field: supervisorEmail ? "supervisorEmail" : "supervisorId",
          message: "Supervisor not found.",
        });
      }

      const phone = row.emergencyContactNormalizedPhone;
      if (!phone) return;

      if (seenPhones.has(phone)) {
        errors.push({
          rowNumber: row.rowNumber,
          field: "emergencyContact",
          message: "This emergency contact number appears more than once in the file.",
        });
      }
      seenPhones.add(phone);

      if (existingPhones.has(phone)) {
        errors.push({
          rowNumber: row.rowNumber,
          field: "emergencyContact",
          message: "This emergency contact phone number is already assigned to another employee.",
        });
      }
    });

    return {
      totalRows: parsed.totalRows,
      validRows: parsed.totalRows - new Set(errors.map((error) => error.rowNumber)).size,
      invalidRows: new Set(errors.map((error) => error.rowNumber)).size,
      errors,
      rows: rows.map((row) => {
        const rowErrors = errors.some((error) => error.rowNumber === row.rowNumber);
        const supervisor = resolvedSupervisorsByRow.get(row.rowNumber);

        return {
          rowNumber: row.rowNumber,
          employeeName: [row.firstName, row.lastName].filter(Boolean).join(" ") || "-",
          companyEmail: row.companyEmail,
          jobTitle: row.jobTitle,
          department: row.department,
          supervisorEmail: row.supervisorEmail ?? null,
          supervisorName: supervisor ? this.formatFullName(supervisor) : null,
          status: rowErrors ? "invalid" : "valid",
        };
      }),
    };
  }

  async commit(parsed: ParsedBulkOnboardingRows) {
    const rows = parsed.rows;
    const preview = await this.preview(parsed);

    if (preview.errors.length > 0) {
      throw new BulkOnboardingValidationError(preview);
    }

    const created: BulkOnboardingCommitData["created"] = [];
    const inviteFailures: BulkOnboardingRowError[] = [];

    for (const row of rows) {
      if (!row.supervisorId) {
        throw new BulkOnboardingValidationError(preview);
      }

      const result = await this.onboardingService.onboardEmployee({
        ...row,
        supervisorId: row.supervisorId,
      });
      created.push(result.data);

      try {
        await this.invitationService.sendInvitation({
          recordId: result.data.onboardingRecord.id,
        });
      } catch {
        inviteFailures.push({
          rowNumber: row.rowNumber,
          field: "companyEmail",
          message: "Invitation email could not be delivered.",
        });
      }
    }

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.EMPLOYEE_ONBOARDED,
      data: { created, inviteFailures },
    };
  }

  private formatFullName(supervisor: { firstName: string; lastName: string }): string {
    return [supervisor.firstName, supervisor.lastName].filter(Boolean).join(" ").trim();
  }
}
