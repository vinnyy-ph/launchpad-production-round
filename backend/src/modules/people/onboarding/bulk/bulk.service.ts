
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
    const supervisorIds = Array.from(new Set(rows.map((row) => row.supervisorId)));
    const normalizedPhones = rows
      .map((row) => row.emergencyContactNormalizedPhone)
      .filter((phone): phone is string => Boolean(phone));

    const [existingEmails, existingSupervisorIds, existingPhoneNumbers] = await Promise.all([
      this.bulkRepository.findExistingEmails(Array.from(new Set(emails))),
      this.bulkRepository.findSupervisorIds(supervisorIds),
      this.bulkRepository.findEmergencyContactNumbers(),
    ]);

    const seenEmails = new Set<string>();
    const seenPhones = new Set<string>();
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

      if (!existingSupervisorIds.has(row.supervisorId)) {
        errors.push({
          rowNumber: row.rowNumber,
          field: "supervisorId",
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
      const result = await this.onboardingService.onboardEmployee(row);
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
}
