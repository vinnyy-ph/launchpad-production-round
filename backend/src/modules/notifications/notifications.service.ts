import type { Notification, User } from "@prisma/client";
import { API_SUCCESS_MESSAGES } from "../../core/globals";
import { InAppChannel } from "./channels/in-app.channel";
import type {
  ListNotificationsQueryDto,
  ListNotificationsResponseDto,
  MarkAsReadResponseDto,
  NotificationResponseDto,
} from "./dto";
import { NotificationsRepository } from "./notifications.repository";

/**
 * Orchestrates notification creation, listing, and real-time delivery.
 */
export class NotificationsService {
  constructor(
    private readonly notificationsRepository = new NotificationsRepository(),
    private readonly inAppChannel = new InAppChannel(),
  ) {}

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
        linkUrl: `/offboarding/me`,
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
    note: string,
  ): Promise<void> {
    try {
      const hrEmployees = await this.notificationsRepository.findAllHrEmployees();

      if (hrEmployees.length === 0) {
        return;
      }

      const subject = "Clearance rejected";
      const body = `A signatory rejected ${employeeName}'s offboarding clearance: "${note}"`;
      const linkUrl = `/clearance`;

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
