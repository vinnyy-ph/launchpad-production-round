import type { Notification, User } from "@prisma/client";
import { API_SUCCESS_MESSAGES } from "../../core/globals";
import { InAppChannel } from "./channels/in-app.channel";
import { EmailService } from "../../core/email/email.service";
import { buildEvaluationReminderEmailHtml } from "../../core/email/templates/evaluation-reminder.template";
import { buildPulseSurveyReminderEmailHtml } from "../../core/email/templates/pulse-survey-reminder.template";
import { buildPulseResultsSharedEmailHtml } from "../../core/email/templates/pulse-results-shared.template";
import type {
  ListNotificationsQueryDto,
  ListNotificationsResponseDto,
  MarkAsReadResponseDto,
  NotificationResponseDto,
} from "./dto";
import { NotificationsRepository } from "./notifications.repository";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Orchestrates notification creation, listing, and real-time delivery.
 */
export class NotificationsService {
  constructor(
    private readonly notificationsRepository = new NotificationsRepository(),
    private readonly inAppChannel = new InAppChannel(),
    private readonly emailService = new EmailService(),
  ) {}

  /** First configured app origin, used to build deep links in emails. */
  private resolveAppUrl(): string {
    return (
      process.env.CORS_ORIGIN?.split(",")[0]?.trim() ?? "http://localhost:3000"
    );
  }

  /**
   * Notifies all HR users when an employee submits onboarding for document review.
   * Failures are swallowed so submission is never blocked.
   */
  async notifyHrOnboardingSubmittedForReview(
    employeeName: string,
    employeeId: string,
  ): Promise<void> {
    try {
      const hrEmployees = await this.notificationsRepository.findAllHrEmployees();

      if (hrEmployees.length === 0) {
        return;
      }

      const subject = "Onboarding ready for review";
      const body = `${employeeName} submitted their onboarding for document review.`;
      const linkUrl = `/hr/directory/onboarding/${employeeId}`;

      for (const hrEmployee of hrEmployees) {
        const notification = await this.notificationsRepository.create({
          recipientId: hrEmployee.id,
          type: "ONBOARDING_STATUS",
          subject,
          body,
          linkUrl,
          sourceType: "Employee",
          sourceId: employeeId,
        });

        this.inAppChannel.deliver(
          hrEmployee.userId,
          this.toNotificationDto(notification),
        );
      }
    } catch {
      // Fire-and-forget: submission must succeed even if notification delivery fails.
    }
  }

  /**
   * Notifies all HR users when an employee completes onboarding and becomes active.
   * Failures are swallowed so onboarding completion is never blocked.
   */
  async notifyHrOnboardingComplete(
    employeeName: string,
    employeeId: string,
  ): Promise<void> {
    try {
      const hrEmployees = await this.notificationsRepository.findAllHrEmployees();

      if (hrEmployees.length === 0) {
        return;
      }

      const subject = "Employee onboarding completed";
      const body = `${employeeName} has completed onboarding and is now active.`;
      const linkUrl = `/employees/${employeeId}`;

      for (const hrEmployee of hrEmployees) {
        const notification = await this.notificationsRepository.create({
          recipientId: hrEmployee.id,
          type: "ONBOARDING_COMPLETE",
          subject,
          body,
          linkUrl,
          sourceType: "Employee",
          sourceId: employeeId,
        });

        this.inAppChannel.deliver(
          hrEmployee.userId,
          this.toNotificationDto(notification),
        );
      }
    } catch {
      // Fire-and-forget: onboarding must succeed even if notification delivery fails.
    }
  }

  /**
   * Notifies an employee when HR approves one of their onboarding documents.
   * Failures are swallowed so the review action is never blocked.
   */
  async notifyEmployeeDocumentApproved(
    employeeId: string,
    documentName: string,
  ): Promise<void> {
    try {
      const employee =
        await this.notificationsRepository.findEmployeeWithUserById(employeeId);

      if (!employee) {
        return;
      }

      const notification = await this.notificationsRepository.create({
        recipientId: employee.id,
        type: "ONBOARDING_STATUS",
        subject: "Document approved",
        body: `Your "${documentName}" was approved by HR.`,
        linkUrl: `/employee/onboarding`,
        sourceType: "Employee",
        sourceId: employeeId,
      });

      this.inAppChannel.deliver(
        employee.userId,
        this.toNotificationDto(notification),
      );
    } catch {
      // Fire-and-forget: the review action must succeed even if notification delivery fails.
    }
  }

  /**
   * Notifies an employee when HR rejects one of their onboarding documents, so they
   * can re-upload it. Failures are swallowed so the review action is never blocked.
   */
  async notifyEmployeeDocumentRejected(
    employeeId: string,
    documentName: string,
    note: string,
  ): Promise<void> {
    try {
      const employee =
        await this.notificationsRepository.findEmployeeWithUserById(employeeId);

      if (!employee) {
        return;
      }

      const notification = await this.notificationsRepository.create({
        recipientId: employee.id,
        type: "ONBOARDING_STATUS",
        subject: "Document needs to be re-uploaded",
        body: `Your "${documentName}" was rejected: "${note}". Please re-upload it.`,
        linkUrl: `/employee/onboarding`,
        sourceType: "Employee",
        sourceId: employeeId,
      });

      this.inAppChannel.deliver(
        employee.userId,
        this.toNotificationDto(notification),
      );
    } catch {
      // Fire-and-forget: the review action must succeed even if notification delivery fails.
    }
  }

  /**
   * Notifies a supervisor when a direct report starts onboarding.
   * Failures are swallowed so onboarding creation is never blocked.
   */
  async notifySupervisorOnboardingStarted(
    employeeName: string,
    employeeId: string,
    supervisorId: string,
  ): Promise<void> {
    try {
      const supervisor =
        await this.notificationsRepository.findEmployeeWithUserById(supervisorId);

      if (!supervisor) {
        return;
      }

      const notification = await this.notificationsRepository.create({
        recipientId: supervisor.id,
        type: "ONBOARDING_STATUS",
        subject: "Direct report started onboarding",
        body: `${employeeName} has started onboarding.`,
        linkUrl: `/employees/${employeeId}`,
        sourceType: "Employee",
        sourceId: employeeId,
      });

      this.inAppChannel.deliver(
        supervisor.userId,
        this.toNotificationDto(notification),
      );
    } catch {
      // Fire-and-forget: onboarding must succeed even if notification delivery fails.
    }
  }

  /**
   * Notifies a supervisor when a direct report completes onboarding.
   * Failures are swallowed so onboarding completion is never blocked.
   */
  async notifySupervisorOnboardingComplete(
    employeeName: string,
    employeeId: string,
    supervisorId: string,
  ): Promise<void> {
    try {
      const supervisor =
        await this.notificationsRepository.findEmployeeWithUserById(supervisorId);

      if (!supervisor) {
        return;
      }

      const notification = await this.notificationsRepository.create({
        recipientId: supervisor.id,
        type: "ONBOARDING_COMPLETE",
        subject: "Direct report completed onboarding",
        body: `${employeeName} has completed onboarding and is now active.`,
        linkUrl: `/employees/${employeeId}`,
        sourceType: "Employee",
        sourceId: employeeId,
      });

      this.inAppChannel.deliver(
        supervisor.userId,
        this.toNotificationDto(notification),
      );
    } catch {
      // Fire-and-forget: onboarding must succeed even if notification delivery fails.
    }
  }

  /**
   * Notifies the offboardee that their offboarding process has started.
   * Failures are swallowed so offboarding initiation is never blocked.
   */
  async notifyOffboardingStarted(
    employeeId: string,
    offboardingId: string,
  ): Promise<void> {
    try {
      const employee =
        await this.notificationsRepository.findEmployeeWithUserById(employeeId);

      if (!employee) {
        return;
      }

      const notification = await this.notificationsRepository.create({
        recipientId: employee.id,
        type: "OFFBOARDING_STARTED",
        subject: "Your offboarding has started",
        body: "Your offboarding process has been initiated. You can track your clearance status here.",
        linkUrl: "/offboarding",
        sourceType: "OffboardingRecord",
        sourceId: offboardingId,
      });

      this.inAppChannel.deliver(
        employee.userId,
        this.toNotificationDto(notification),
      );
    } catch {
      // Fire-and-forget: offboarding must succeed even if notification delivery fails.
    }
  }

  /**
   * Notifies supervisors in the offboardee's upward reporting chain.
   * Failures are swallowed so offboarding initiation is never blocked.
   */
  async notifySupervisorOffboardingStarted(
    supervisorIds: string[],
    employeeName: string,
    offboardingId: string,
  ): Promise<void> {
    try {
      const supervisors =
        await this.notificationsRepository.findEmployeesWithUserByIds(
          supervisorIds,
        );

      if (supervisors.length === 0) {
        return;
      }

      for (const supervisor of supervisors) {
        const notification = await this.notificationsRepository.create({
          recipientId: supervisor.id,
          type: "OFFBOARDING_STATUS",
          subject: "Employee in your hierarchy is offboarding",
          body: `${employeeName} has started offboarding. You can track their clearance progress from your hierarchy status.`,
          linkUrl: "/supervisor/status",
          sourceType: "OffboardingRecord",
          sourceId: offboardingId,
        });

        this.inAppChannel.deliver(
          supervisor.userId,
          this.toNotificationDto(notification),
        );
      }
    } catch {
      // Fire-and-forget: offboarding must succeed even if notification delivery fails.
    }
  }

  /**
   * Notifies a signatory that a clearance is awaiting their signature.
   * Failures are swallowed so offboarding initiation is never blocked.
   */
  async notifyClearanceSignRequest(
    signatoryId: string,
    employeeName: string,
    requestId: string,
  ): Promise<void> {
    try {
      const signatory =
        await this.notificationsRepository.findEmployeeWithUserById(signatoryId);

      if (!signatory) {
        return;
      }

      const notification = await this.notificationsRepository.create({
        recipientId: signatory.id,
        type: "CLEARANCE_SIGN_REQUEST",
        subject: "Clearance awaiting your signature",
        body: `${employeeName}'s offboarding clearance is awaiting your signature.`,
        linkUrl: `/clearance`,
        sourceType: "ClearanceSignatureRequest",
        sourceId: requestId,
      });

      this.inAppChannel.deliver(
        signatory.userId,
        this.toNotificationDto(notification),
      );
    } catch {
      // Fire-and-forget: offboarding must succeed even if notification delivery fails.
    }
  }

  /**
   * Notifies all HR users when a signatory rejects a clearance, so HR can reset it.
   * Failures are swallowed so the reject action is never blocked.
   */
  async notifyHrClearanceRejected(
    employeeName: string,
    requestId: string,
    offboardingId: string,
    note: string,
  ): Promise<void> {
    try {
      const hrEmployees = await this.notificationsRepository.findAllHrEmployees();

      if (hrEmployees.length === 0) {
        return;
      }

      const subject = "Clearance rejected";
      const body = `A signatory rejected ${employeeName}'s offboarding clearance: "${note}"`;
      const linkUrl = `/hr/directory/offboarding/${offboardingId}`;

      for (const hrEmployee of hrEmployees) {
        const notification = await this.notificationsRepository.create({
          recipientId: hrEmployee.id,
          type: "CLEARANCE_REJECTED",
          subject,
          body,
          linkUrl,
          sourceType: "ClearanceSignatureRequest",
          sourceId: requestId,
        });

        this.inAppChannel.deliver(
          hrEmployee.userId,
          this.toNotificationDto(notification),
        );
      }
    } catch {
      // Fire-and-forget: the reject action must succeed even if notification delivery fails.
    }
  }

  /**
   * Notifies a reviewee that a performance evaluation has been sent to them for
   * acknowledgement. Deep-links to the exact evaluation.
   * Failures are swallowed so sending the evaluation is never blocked.
   */
  async notifyNewEvaluation(
    revieweeId: string,
    evaluationId: string,
  ): Promise<void> {
    try {
      const reviewee =
        await this.notificationsRepository.findEmployeeWithUserById(revieweeId);

      if (!reviewee) {
        return;
      }

      const notification = await this.notificationsRepository.create({
        recipientId: reviewee.id,
        type: "NEW_EVALUATION",
        subject: "New performance evaluation",
        body: "Your supervisor has sent you a performance evaluation to acknowledge.",
        linkUrl: `/evaluations/${evaluationId}`,
        sourceType: "PerformanceEvaluation",
        sourceId: evaluationId,
      });

      this.inAppChannel.deliver(
        reviewee.userId,
        this.toNotificationDto(notification),
      );
    } catch {
      // Fire-and-forget: sending the evaluation must succeed even if notification delivery fails.
    }
  }

  /**
   * Notifies both parties that an evaluation was auto-acknowledged because its
   * acknowledgement deadline passed without the reviewee acting (deemed-ack): the reviewee
   * (who missed the deadline) and the reviewer (FYI on the exception). In-app and
   * fire-and-forget per recipient, so the settlement sweep is never blocked by a delivery
   * failure. The two recipients land on different pages, disambiguated by linkUrl prefix
   * (the type is shared), so the reviewer link points at the supervisor list.
   */
  async notifyEvalDeemedAck(
    reviewerId: string,
    revieweeId: string,
    evaluationId: string,
  ): Promise<void> {
    await this.deliverDeemedAck(reviewerId, evaluationId, {
      body: "An evaluation you sent was automatically marked acknowledged after its deadline passed.",
      linkUrl: "/supervisor/evaluations",
    });
    await this.deliverDeemedAck(revieweeId, evaluationId, {
      body: "Your performance evaluation was automatically acknowledged because the deadline passed without your acknowledgement.",
      linkUrl: `/evaluations/${evaluationId}`,
    });
  }

  /** Delivers one in-app deemed-ack notification; swallows failures (fire-and-forget). */
  private async deliverDeemedAck(
    recipientId: string,
    evaluationId: string,
    copy: { body: string; linkUrl: string },
  ): Promise<void> {
    try {
      const recipient =
        await this.notificationsRepository.findEmployeeWithUserById(recipientId);

      if (!recipient) {
        return;
      }

      const notification = await this.notificationsRepository.create({
        recipientId: recipient.id,
        type: "EVAL_DEEMED_ACK",
        subject: "Evaluation auto-acknowledged",
        body: copy.body,
        linkUrl: copy.linkUrl,
        sourceType: "PerformanceEvaluation",
        sourceId: evaluationId,
      });

      this.inAppChannel.deliver(
        recipient.userId,
        this.toNotificationDto(notification),
      );
    } catch {
      // Fire-and-forget: the deemed-ack settlement must succeed even if notification delivery fails.
    }
  }

  /**
   * Notifies every resolved audience member that a new pulse survey is open.
   * Deep-links to the survey.
   * Failures are swallowed so activating the survey is never blocked.
   */
  async notifyNewPulse(
    audienceEmployeeIds: string[],
    surveyId: string,
    surveyName: string,
    occurrenceId: string,
  ): Promise<void> {
    try {
      const recipients =
        await this.notificationsRepository.findEmployeesWithUserByIds(
          audienceEmployeeIds,
        );

      if (recipients.length === 0) {
        return;
      }

      const subject = "New survey available";
      const body = `A new pulse survey "${surveyName}" is now open. Please respond before the deadline.`;
      // Deep-link by occurrence id — the employee surveys page opens the exact pulse
      // off the occurrence (?pulse=<id>). sourceId stays the survey for reminder dedup.
      const linkUrl = `/surveys/${occurrenceId}`;

      for (const recipient of recipients) {
        const notification = await this.notificationsRepository.create({
          recipientId: recipient.id,
          type: "NEW_PULSE",
          subject,
          body,
          linkUrl,
          sourceType: "PulseSurvey",
          sourceId: surveyId,
        });

        this.inAppChannel.deliver(
          recipient.userId,
          this.toNotificationDto(notification),
        );
      }
    } catch {
      // Fire-and-forget: activation must succeed even if notification delivery fails.
    }
  }

  /**
   * Notifies a team's supervisor that HR has deliberately shared their small team's anonymous
   * pulse results with them. Deep-links to the (now-granted) team-scoped results view. In-app +
   * email, fire-and-forget so a delivery failure never fails the share action itself.
   */
  async notifySupervisorPulseResultsShared(
    supervisorId: string,
    surveyName: string,
    teamName: string,
    surveyId: string,
    occurrenceId: string,
    teamId: string,
  ): Promise<void> {
    try {
      const supervisor =
        await this.notificationsRepository.findEmployeeWithUserById(supervisorId);

      if (!supervisor) {
        return;
      }

      // Carries the team + round so the supervisor lands on the exact granted breakdown.
      const linkUrl = `/surveys/${surveyId}/results?teamId=${teamId}&occurrenceId=${occurrenceId}`;

      const notification = await this.notificationsRepository.create({
        recipientId: supervisor.id,
        type: "PULSE_RESULTS_SHARED",
        subject: "Pulse results shared with you",
        body: `HR shared the results of "${surveyName}" for your team ${teamName}. Because this is a small team, please treat the responses sensitively.`,
        linkUrl,
        sourceType: "PulseSurvey",
        sourceId: surveyId,
      });

      this.inAppChannel.deliver(
        supervisor.userId,
        this.toNotificationDto(notification),
      );

      await this.emailService.sendEmail({
        to: supervisor.companyEmail,
        subject: "Pulse results shared with you",
        html: buildPulseResultsSharedEmailHtml({
          firstName: supervisor.firstName,
          lastName: supervisor.lastName,
          surveyName,
          teamName,
          resultsUrl: `${this.resolveAppUrl()}${linkUrl}`,
        }),
      });
    } catch {
      // Fire-and-forget: the share action must succeed even if notification delivery fails.
    }
  }

  /**
   * Sends a pulse reminder to a non-responder, throttled to the configured cadence:
   * skips unless `intervalDays` have elapsed since the last reminder (or, for the first
   * one, since the occurrence opened — `anchorDate`). The notification table is the dedup
   * ledger. Failures are swallowed so a reminder sweep never throws into a read path.
   */
  async remindPulseIfDue(
    recipientId: string,
    intervalDays: number,
    anchorDate: Date,
    surveyId: string,
    surveyName: string,
    now: Date,
    occurrenceId: string,
  ): Promise<void> {
    try {
      const recipient =
        await this.notificationsRepository.findEmployeeWithUserById(recipientId);
      if (!recipient) {
        return;
      }

      const last = await this.notificationsRepository.findLatestReminder(
        recipient.id,
        "PULSE_REMINDER",
        surveyId,
      );
      const since = last?.createdAt ?? anchorDate;
      if (now.getTime() - since.getTime() < intervalDays * DAY_MS) {
        return;
      }

      const notification = await this.notificationsRepository.create({
        recipientId: recipient.id,
        type: "PULSE_REMINDER",
        subject: "Reminder: pulse survey awaiting your response",
        body: `The pulse survey "${surveyName}" is still open. Please respond before the deadline.`,
        linkUrl: `/surveys/${occurrenceId}`,
        sourceType: "PulseSurvey",
        sourceId: surveyId,
      });

      this.inAppChannel.deliver(
        recipient.userId,
        this.toNotificationDto(notification),
      );

      // Email travels on the same throttle as the in-app reminder: only sent when one is
      // actually created above. Fire-and-forget — delivery failure must not break the sweep.
      await this.emailService.sendEmail({
        to: recipient.companyEmail,
        subject: "Reminder: complete your pulse survey",
        html: buildPulseSurveyReminderEmailHtml({
          firstName: recipient.firstName,
          lastName: recipient.lastName,
          surveyName,
          surveyUrl: `${this.resolveAppUrl()}/employee/surveys`,
        }),
      });
    } catch {
      // Fire-and-forget: a reminder sweep must never break the read path that triggered it.
    }
  }

  /**
   * Sends an evaluation-acknowledgement reminder to a reviewee, throttled to the configured
   * cadence (anchored to issuance — `sentAt` — for the first one). Same dedup-via-ledger
   * and swallow-failures contract as `remindPulseIfDue`.
   */
  async remindEvalAckIfDue(
    recipientId: string,
    intervalDays: number,
    anchorDate: Date,
    evaluationId: string,
    now: Date,
  ): Promise<void> {
    try {
      const recipient =
        await this.notificationsRepository.findEmployeeWithUserById(recipientId);
      if (!recipient) {
        return;
      }

      const last = await this.notificationsRepository.findLatestReminder(
        recipient.id,
        "EVAL_ACK_REMINDER",
        evaluationId,
      );
      const since = last?.createdAt ?? anchorDate;
      if (now.getTime() - since.getTime() < intervalDays * DAY_MS) {
        return;
      }

      const notification = await this.notificationsRepository.create({
        recipientId: recipient.id,
        type: "EVAL_ACK_REMINDER",
        subject: "Action required: acknowledge your evaluation",
        body: "You have a performance evaluation from your supervisor awaiting your acknowledgement.",
        linkUrl: `/evaluations/${evaluationId}`,
        sourceType: "PerformanceEvaluation",
        sourceId: evaluationId,
      });

      this.inAppChannel.deliver(
        recipient.userId,
        this.toNotificationDto(notification),
      );

      // Email travels on the same throttle as the in-app reminder: only sent when one is
      // actually created above. Fire-and-forget — delivery failure must not break the sweep.
      await this.emailService.sendEmail({
        to: recipient.companyEmail,
        subject: "Reminder: acknowledge your evaluation",
        html: buildEvaluationReminderEmailHtml({
          firstName: recipient.firstName,
          lastName: recipient.lastName,
          evaluationUrl: `${this.resolveAppUrl()}/employee/surveys`,
        }),
      });
    } catch {
      // Fire-and-forget: a reminder sweep must never break the read path that triggered it.
    }
  }

  /** Returns recent notifications for the authenticated user's employee profile. */
  async getNotifications(
    user: User,
    query: ListNotificationsQueryDto,
  ): Promise<ListNotificationsResponseDto> {
    const employee = await this.notificationsRepository.findEmployeeByUserId(
      user.id,
    );

    if (!employee) {
      throw new Error("Employee profile not found");
    }

    const notifications = await this.notificationsRepository.findByRecipientId(
      employee.id,
      query.limit,
    );

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.NOTIFICATIONS_RETRIEVED,
      data: notifications.map((notification) => this.toNotificationDto(notification)),
    };
  }

  /** Marks one notification as read for the authenticated user. */
  async markAsRead(
    user: User,
    notificationId: string,
  ): Promise<MarkAsReadResponseDto> {
    const employee = await this.notificationsRepository.findEmployeeByUserId(
      user.id,
    );

    if (!employee) {
      throw new Error("Employee profile not found");
    }

    const notification = await this.notificationsRepository.findByIdForRecipient(
      notificationId,
      employee.id,
    );

    if (!notification) {
      throw new Error("Notification not found");
    }

    const updated = await this.notificationsRepository.markAsRead(notification.id);

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.NOTIFICATION_MARKED_AS_READ,
      data: this.toNotificationDto(updated),
    };
  }

  /** Maps a Prisma notification row to the API response shape. */
  private toNotificationDto(notification: Notification): NotificationResponseDto {
    return {
      id: notification.id,
      type: notification.type,
      subject: notification.subject,
      body: notification.body,
      linkUrl: notification.linkUrl,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
    };
  }
}
