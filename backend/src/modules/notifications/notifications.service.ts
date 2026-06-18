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
