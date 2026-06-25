import type { User } from "@prisma/client";
import { API_SUCCESS_MESSAGES } from "../../core/globals";
import type { NotificationPreferencesResponseDto } from "./dto";
import { resolveEffectivePreferences } from "./notification-categories";
import {
  NotificationPreferencesRepository,
  type UpdateNotificationPreferencesData,
} from "./notification-preferences.repository";
import { NotificationsRepository } from "./notifications.repository";

/**
 * Reads and writes the authenticated user's own notification preferences.
 */
export class NotificationPreferencesService {
  constructor(
    private readonly preferencesRepository = new NotificationPreferencesRepository(),
    private readonly notificationsRepository = new NotificationsRepository(),
  ) {}

  /** Returns the caller's resolved preferences, synthesizing all-on defaults if unset. */
  async getForUser(user: User): Promise<NotificationPreferencesResponseDto> {
    const employee = await this.notificationsRepository.findEmployeeByUserId(
      user.id,
    );

    if (!employee) {
      throw new Error("Employee profile not found");
    }

    const row = await this.preferencesRepository.findByEmployeeId(employee.id);

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.NOTIFICATION_PREFERENCES_RETRIEVED,
      data: resolveEffectivePreferences(row),
    };
  }

  /** Upserts the caller's preferences (lazy-creating the row on first save). */
  async updateForUser(
    user: User,
    data: UpdateNotificationPreferencesData,
  ): Promise<NotificationPreferencesResponseDto> {
    const employee = await this.notificationsRepository.findEmployeeByUserId(
      user.id,
    );

    if (!employee) {
      throw new Error("Employee profile not found");
    }

    const row = await this.preferencesRepository.upsert(employee.id, data);

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.NOTIFICATION_PREFERENCES_UPDATED,
      data: resolveEffectivePreferences(row),
    };
  }
}
