import type { InviteStatus, OnboardingInvitation } from "@prisma/client";
import { EmailService } from "../../../../core/email";
import { buildOnboardingInvitationEmailHtml } from "../../../../core/email/templates/onboarding-invitation.template";
import { API_SUCCESS_MESSAGES } from "../../../../core/globals";
import {
  INVITATION_EXPIRY_HOURS,
  INVITATION_RESEND_COOLDOWN_SECONDS,
  INVITATION_RESEND_MAX_ATTEMPTS_PER_HOUR,
} from "../onboarding.constants";
import type {
  GetInvitationStatusParamsDto,
  InvitationDto,
  InvitationListResponseDto,
  InvitationResponseDto,
  InvitationStatusDto,
  ResendInvitationParamsDto,
  SendInvitationParamsDto,
  UpdateInvitationEmailRequestDto,
} from "./dto";
import { InvitationRepository } from "./invitation.repository";

type InvitationRecord = OnboardingInvitation;

/**
 * Orchestrates invitation send, resend, email correction, and status retrieval.
 */
export class InvitationService {
  constructor(
    private readonly invitationRepository = new InvitationRepository(),
    private readonly emailService = new EmailService(),
  ) {}

  /**
   * Sends the onboarding invitation email for an onboarding record.
   * Creates an invitation when none exists yet.
   */
  async sendInvitation(
    params: SendInvitationParamsDto,
    inviterEmail?: string | null,
  ): Promise<InvitationResponseDto> {
    const record = await this.invitationRepository.findRecordWithEmployee(
      params.recordId,
    );

    if (!record) {
      throw new Error("Onboarding record not found");
    }

    const existingInvitation = record.invitations[0];

    if (existingInvitation) {
      if (existingInvitation.status === "ACCEPTED") {
        throw new Error("Invitation already accepted");
      }

      const invitation = await this.deliverInvitationEmail(
        existingInvitation,
        record.employee.firstName,
        record.employee.lastName,
        inviterEmail,
      );

      return {
        success: true,
        message: API_SUCCESS_MESSAGES.INVITATION_SENT,
        data: this.toInvitationDto(invitation),
      };
    }

    let invitation =
      await this.invitationRepository.create(
        record.id,
        record.employee.companyEmail,
        this.buildExpiryDate(),
      );

    invitation = await this.deliverInvitationEmail(
      invitation,
      record.employee.firstName,
      record.employee.lastName,
      inviterEmail,
    );

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.INVITATION_SENT,
      data: this.toInvitationDto(invitation),
    };
  }

  /**
   * Resends an existing invitation email and refreshes its expiry window.
   */
  async resendInvitation(
    params: ResendInvitationParamsDto,
    inviterEmail?: string | null,
  ): Promise<InvitationResponseDto> {
    const invitation = await this.invitationRepository.findById(
      params.invitationId,
    );

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.status === "ACCEPTED") {
      throw new Error("Invitation already accepted");
    }

    const updatedInvitation = await this.resendInvitationEmail(
      invitation,
      invitation.record.employee.firstName,
      invitation.record.employee.lastName,
      inviterEmail,
    );

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.INVITATION_RESENT,
      data: this.toInvitationDto(updatedInvitation),
    };
  }

  /**
   * Corrects the invite email before account creation and re-sends the invitation.
   */
  async updateEmail(
    params: ResendInvitationParamsDto,
    body: UpdateInvitationEmailRequestDto,
    inviterEmail?: string | null,
  ): Promise<InvitationResponseDto> {
    const invitation = await this.invitationRepository.findById(
      params.invitationId,
    );

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.status === "ACCEPTED") {
      throw new Error("Invitation already accepted");
    }

    const user = invitation.record.employee.user;

    if (user.googleId) {
      throw new Error("Account already created");
    }

    await this.assertCanResend(invitation);

    await this.invitationRepository.updateEmployeeEmail(
      invitation.record.employee.id,
      user.id,
      body.email,
    );

    let updatedInvitation = await this.invitationRepository.updateEmail(
      invitation.id,
      body.email,
    );

    updatedInvitation = await this.invitationRepository.markResent(
      updatedInvitation.id,
      this.buildExpiryDate(),
    );

    updatedInvitation = await this.deliverInvitationEmail(
      updatedInvitation,
      invitation.record.employee.firstName,
      invitation.record.employee.lastName,
      inviterEmail,
    );

    await this.invitationRepository.createResendAttempt(updatedInvitation.id);

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.INVITATION_EMAIL_UPDATED,
      data: this.toInvitationDto(updatedInvitation),
    };
  }

  /** Applies resend policy, refreshes expiry, sends email, and records the resend. */
  private async resendInvitationEmail(
    invitation: InvitationRecord,
    firstName: string,
    lastName: string,
    inviterEmail?: string | null,
  ): Promise<InvitationRecord> {
    await this.assertCanResend(invitation);

    let updatedInvitation = await this.invitationRepository.markResent(
      invitation.id,
      this.buildExpiryDate(),
    );

    updatedInvitation = await this.deliverInvitationEmail(
      updatedInvitation,
      firstName,
      lastName,
      inviterEmail,
    );

    await this.invitationRepository.createResendAttempt(updatedInvitation.id);

    return updatedInvitation;
  }

  /** Enforces the 60-second cooldown and 5-per-hour resend cap. */
  private async assertCanResend(invitation: InvitationRecord) {
    const now = Date.now();
    const cooldownMs = INVITATION_RESEND_COOLDOWN_SECONDS * 1000;
    const elapsedSinceLastSend = now - invitation.sentAt.getTime();

    if (elapsedSinceLastSend < cooldownMs) {
      throw new Error("Invitation resend cooldown");
    }

    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    const attempts =
      await this.invitationRepository.countResendAttemptsSince(
        invitation.id,
        oneHourAgo,
      );

    if (attempts >= INVITATION_RESEND_MAX_ATTEMPTS_PER_HOUR) {
      throw new Error("Invitation resend rate limited");
    }
  }

  /**
   * Returns all invitations for an onboarding record with computed status.
   */
  async getInvitationStatus(
    params: GetInvitationStatusParamsDto,
  ): Promise<InvitationListResponseDto> {
    const record = await this.invitationRepository.findRecordWithEmployee(
      params.recordId,
    );

    if (!record) {
      throw new Error("Onboarding record not found");
    }

    const invitations = await this.invitationRepository.findByRecordId(
      params.recordId,
    );

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.INVITATION_STATUS_RETRIEVED,
      data: invitations.map((invitation) =>
        this.toInvitationDto(this.resolveEffectiveStatus(invitation)),
      ),
    };
  }

  /** Sends the invitation email and updates delivery status on failure. */
  private async deliverInvitationEmail(
    invitation: InvitationRecord,
    firstName: string,
    lastName: string,
    inviterEmail?: string | null,
  ): Promise<InvitationRecord> {
    try {
      await this.emailService.sendEmail({
        to: invitation.sentToEmail,
        subject: "You're invited to join Manage Jia",
        html: buildOnboardingInvitationEmailHtml({
          firstName,
          lastName,
          email: invitation.sentToEmail,
          hrEmail: inviterEmail,
          appUrl: this.resolveAppUrl(),
        }),
      });

      return this.invitationRepository.updateStatus(invitation.id, "PENDING");
    } catch {
      await this.invitationRepository.updateStatus(
        invitation.id,
        "FAILED_DELIVERY",
      );

      throw new Error("Invitation delivery failed");
    }
  }

  /** Returns the frontend base URL used in invitation links and assets. */
  private resolveAppUrl(): string {
    return (
      process.env.CORS_ORIGIN?.split(",")[0]?.trim() ?? "http://localhost:3000"
    );
  }

  /** Computes expiry when an invitation is still pending past its expiry date. */
  private resolveEffectiveStatus(invitation: InvitationRecord): InvitationRecord {
    if (
      invitation.status === "PENDING" &&
      invitation.expiresAt.getTime() < Date.now()
    ) {
      return { ...invitation, status: "EXPIRED" };
    }

    return invitation;
  }

  /** Returns a date 24 hours from now. */
  private buildExpiryDate(): Date {
    return new Date(Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000);
  }

  /** Maps a Prisma invitation record into the public API DTO. */
  private toInvitationDto(invitation: InvitationRecord): InvitationDto {
    const effective = this.resolveEffectiveStatus(invitation);

    return {
      id: effective.id,
      recordId: effective.recordId,
      sentToEmail: effective.sentToEmail,
      status: this.toStatusDto(effective.status),
      sentAt: effective.sentAt,
      expiresAt: effective.expiresAt,
      createdAt: effective.createdAt,
      updatedAt: effective.updatedAt,
    };
  }

  /** Maps Prisma enum values to lowercase API status strings. */
  private toStatusDto(status: InviteStatus): InvitationStatusDto {
    return status.toLowerCase() as InvitationStatusDto;
  }
}
