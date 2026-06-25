import type { NotificationPreference } from "@prisma/client";
import { prisma } from "../../core/database/prisma.service";

/** The preference fields an employee may set (locked/non-existent channels excluded). */
export interface UpdateNotificationPreferencesData {
  surveysInApp?: boolean;
  surveysEmail?: boolean;
  evaluationsEmail?: boolean;
  onboardingInApp?: boolean;
  onboardingEmail?: boolean;
  offboardingInApp?: boolean;
  pauseAllEmail?: boolean;
}

/**
 * Persistence layer for per-employee notification preferences.
 */
export class NotificationPreferencesRepository {
  /** Loads an employee's preferences row, or null when none has been saved yet. */
  findByEmployeeId(employeeId: string): Promise<NotificationPreference | null> {
    return prisma.notificationPreference.findUnique({ where: { employeeId } });
  }

  /** Creates the row on first save, otherwise patches the provided fields. */
  upsert(
    employeeId: string,
    data: UpdateNotificationPreferencesData,
  ): Promise<NotificationPreference> {
    return prisma.notificationPreference.upsert({
      where: { employeeId },
      create: { employeeId, ...data },
      update: data,
    });
  }
}
