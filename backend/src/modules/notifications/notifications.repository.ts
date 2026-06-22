import type { Notification, NotificationType } from "@prisma/client";
import { prisma } from "../../core/database/prisma.service";
import type { CreateNotificationInput } from "./notifications.types";

/**
 * Persistence layer for in-app notifications.
 * All Prisma queries for this feature live here.
 */
export class NotificationsRepository {
  /** Returns active HR employees who should receive onboarding alerts. */
  async findAllHrEmployees() {
    return prisma.employee.findMany({
      where: {
        user: {
          role: "HR",
          isActive: true,
        },
      },
      select: {
        id: true,
        userId: true,
      },
    });
  }

  /** Loads the employee profile linked to an auth user. */
  async findEmployeeByUserId(userId: string) {
    return prisma.employee.findUnique({
      where: { userId },
      select: { id: true },
    });
  }

  /**
   * Loads an employee by ID with the linked auth user for notification delivery, plus the
   * email + name fields needed to also send a reminder email.
   */
  async findEmployeeWithUserById(employeeId: string) {
    return prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        userId: true,
        companyEmail: true,
        firstName: true,
        lastName: true,
      },
    });
  }

  /** Loads id + auth userId for a set of employees, for bulk notification delivery. */
  async findEmployeesWithUserByIds(employeeIds: string[]) {
    if (employeeIds.length === 0) {
      return [];
    }

    return prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: {
        id: true,
        userId: true,
      },
    });
  }

  /** Bulk-inserts notification rows. */
  async createMany(inputs: CreateNotificationInput[]) {
    if (inputs.length === 0) {
      return { count: 0 };
    }

    return prisma.notification.createMany({
      data: inputs.map((input) => ({
        recipientId: input.recipientId,
        type: input.type,
        channel: "IN_APP",
        subject: input.subject,
        body: input.body,
        linkUrl: input.linkUrl ?? null,
        sourceType: input.sourceType ?? null,
        sourceId: input.sourceId ?? null,
      })),
    });
  }

  /**
   * Most recent reminder of a given type for a recipient + source, used to throttle
   * recurring reminders to their configured cadence (the notification table is the
   * dedup ledger — no extra "last reminded" state needed).
   */
  async findLatestReminder(
    recipientId: string,
    type: NotificationType,
    sourceId: string,
  ) {
    return prisma.notification.findFirst({
      where: { recipientId, type, sourceId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
  }

  /** Returns the most recent notifications for a recipient. */
  async findByRecipientId(recipientId: string, limit: number) {
    return prisma.notification.findMany({
      where: { recipientId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /** Loads one notification owned by the given recipient. */
  async findByIdForRecipient(notificationId: string, recipientId: string) {
    return prisma.notification.findFirst({
      where: {
        id: notificationId,
        recipientId,
      },
    });
  }

  /** Marks a notification as read. */
  async markAsRead(notificationId: string) {
    return prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /** Creates a single notification and returns the persisted row. */
  async create(input: CreateNotificationInput): Promise<Notification> {
    return prisma.notification.create({
      data: {
        recipientId: input.recipientId,
        type: input.type,
        channel: "IN_APP",
        subject: input.subject,
        body: input.body,
        linkUrl: input.linkUrl ?? null,
        sourceType: input.sourceType ?? null,
        sourceId: input.sourceId ?? null,
      },
    });
  }
}
