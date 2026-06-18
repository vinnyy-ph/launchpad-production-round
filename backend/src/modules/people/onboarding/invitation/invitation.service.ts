import type { InviteStatus, OnboardingInvitation } from "@prisma/client";
import { EmailService } from "../../../../core/email";
import { API_SUCCESS_MESSAGES } from "../../../../core/globals";
import { INVITATION_EXPIRY_DAYS } from "../onboarding.constants";
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
  ): Promise<InvitationResponseDto> {
    const record = await this.invitationRepository.findRecordWithEmployee(
      params.recordId,
    );

    if (!record) {
      throw new Error("Onboarding record not found");
    }

    const expiresAt = this.buildExpiryDate();
    let invitation =
      record.invitations[0] ??
      (await this.invitationRepository.create(
        record.id,
        record.employee.companyEmail,
        expiresAt,
      ));

    invitation = await this.deliverInvitationEmail(
      invitation,
      record.employee.firstName,
      record.employee.lastName,
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

    const expiresAt = this.buildExpiryDate();
    let updatedInvitation = await this.invitationRepository.markResent(
      invitation.id,
      expiresAt,
    );

    updatedInvitation = await this.deliverInvitationEmail(
      updatedInvitation,
      invitation.record.employee.firstName,
      invitation.record.employee.lastName,
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

    await this.invitationRepository.updateEmployeeEmail(
      invitation.record.employee.id,
      user.id,
      body.email,
    );

    const expiresAt = this.buildExpiryDate();
    let updatedInvitation = await this.invitationRepository.updateEmail(
      invitation.id,
      body.email,
    );

    updatedInvitation = await this.invitationRepository.markResent(
      updatedInvitation.id,
      expiresAt,
    );

    updatedInvitation = await this.deliverInvitationEmail(
      updatedInvitation,
      invitation.record.employee.firstName,
      invitation.record.employee.lastName,
    );

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.INVITATION_EMAIL_UPDATED,
      data: this.toInvitationDto(updatedInvitation),
    };
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
  ): Promise<InvitationRecord> {
    try {
      await this.emailService.sendEmail({
        to: invitation.sentToEmail,
        subject: "You are invited to complete onboarding",
        html: this.buildInvitationEmailHtml(
          firstName,
          lastName,
          invitation.sentToEmail,
        ),
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

  /** Builds a simple onboarding invitation email body. */
  private buildInvitationEmailHtml(
    firstName: string,
    lastName: string,
    email: string,
  ): string {
    const appUrl =
      process.env.CORS_ORIGIN?.split(",")[0]?.trim() ?? "http://localhost:5173";
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

    return `
      <p>Hello ${fullName || "there"},</p>
      <p>HR has invited you to complete your employee onboarding.</p>
      <p>Sign in with Google using <strong>${email}</strong>.</p>
      <p><a href="${appUrl}">Open Launchpad</a></p>
      <p>If you did not expect this email, please contact HR.</p>
    `;
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

  /** Returns a date ${INVITATION_EXPIRY_DAYS} days from now. */
  private buildExpiryDate(): Date {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    return expiresAt;
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
