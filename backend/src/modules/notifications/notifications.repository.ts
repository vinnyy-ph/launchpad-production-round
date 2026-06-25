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

  /**
   * Returns the recipient's most recent non-archived notifications, pinned ones first
   * (newest-pinned first), then the rest newest-first. Types in `excludeTypes` are
   * dropped server-side (the recipient's opted-out categories) before the limit applies,
   * so an opted-out category never reaches the client.
   */
  async findByRecipientId(
    recipientId: string,
    limit: number,
    excludeTypes: NotificationType[] = [],
  ) {
    return prisma.notification.findMany({
      where: {
        recipientId,
        deletedAt: null,
        ...(excludeTypes.length > 0 ? { type: { notIn: excludeTypes } } : {}),
      },
      orderBy: [{ isPinned: "desc" }, { pinnedAt: "desc" }, { createdAt: "desc" }],
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

  /** Marks every unread, non-archived notification for a recipient as read. Returns the count. */
  async markAllAsRead(recipientId: string) {
    return prisma.notification.updateMany({
      where: { recipientId, isRead: false, deletedAt: null },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /** Pins or unpins a notification, stamping pinnedAt when pinning and clearing it when unpinning. */
  async setPinned(notificationId: string, isPinned: boolean) {
    return prisma.notification.update({
      where: { id: notificationId },
      data: { isPinned, pinnedAt: isPinned ? new Date() : null },
    });
  }

  /** Soft-deletes (archives) one notification so it leaves the list but stays in the dedup ledger. */
  async softDelete(notificationId: string) {
    return prisma.notification.update({
      where: { id: notificationId },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Soft-deletes every non-archived, non-pinned notification for a recipient (a "clear all" that
   * spares pinned items). Returns the count.
   */
  async softDeleteAllForRecipient(recipientId: string) {
    return prisma.notification.updateMany({
      where: { recipientId, deletedAt: null, isPinned: false },
      data: { deletedAt: new Date() },
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
