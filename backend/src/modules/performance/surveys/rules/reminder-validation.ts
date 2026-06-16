export type ReminderFrequency = "DAILY" | "EVERY_X_DAYS" | "WEEKLY";

export interface ReminderConfigInput {
  frequency: ReminderFrequency;
  everyXDays?: number | null;
}

/**
 * Server-side validation: `everyXDays` is required (and must be positive) when the
 * frequency is EVERY_X_DAYS. Reject any create/update that omits it.
 */
export function validateReminderConfig(config: ReminderConfigInput): void {
  if (
    config.frequency === "EVERY_X_DAYS" &&
    !(typeof config.everyXDays === "number" && config.everyXDays > 0)
  ) {
    throw new Error("reminderIntervalDays is required when reminderType = EVERY_X_DAYS");
  }
}
