import { validateReminderConfig } from "./reminder-validation";

describe("validateReminderConfig", () => {
  it("rejects EVERY_X_DAYS without a positive interval", () => {
    expect(() => validateReminderConfig({ frequency: "EVERY_X_DAYS" })).toThrow();
    expect(() => validateReminderConfig({ frequency: "EVERY_X_DAYS", everyXDays: 0 })).toThrow();
    expect(() => validateReminderConfig({ frequency: "EVERY_X_DAYS", everyXDays: null })).toThrow();
  });

  it("accepts EVERY_X_DAYS with a positive interval", () => {
    expect(() => validateReminderConfig({ frequency: "EVERY_X_DAYS", everyXDays: 3 })).not.toThrow();
  });

  it("accepts DAILY and WEEKLY regardless of interval", () => {
    expect(() => validateReminderConfig({ frequency: "DAILY" })).not.toThrow();
    expect(() => validateReminderConfig({ frequency: "WEEKLY" })).not.toThrow();
  });
});
