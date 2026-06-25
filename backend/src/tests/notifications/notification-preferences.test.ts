jest.mock("../../core/database/prisma.service", () => ({ prisma: {} }));

import type { NotificationPreference } from "@prisma/client";
import { NotificationsService } from "../../modules/notifications/notifications.service";
import {
  isEmailEnabled,
  isInAppEnabled,
  resolveEffectivePreferences,
  suppressedInAppTypes,
} from "../../modules/notifications/notification-categories";

/** A stored row with every channel explicitly off (the most restrictive a user can save). */
function buildRow(
  overrides: Partial<NotificationPreference> = {},
): NotificationPreference {
  return {
    id: "pref-1",
    employeeId: "emp-1",
    surveysInApp: false,
    surveysEmail: false,
    evaluationsEmail: false,
    onboardingInApp: false,
    onboardingEmail: false,
    offboardingInApp: false,
    pauseAllEmail: false,
    createdAt: new Date("2026-06-25T00:00:00.000Z"),
    updatedAt: new Date("2026-06-25T00:00:00.000Z"),
    ...overrides,
  };
}

describe("notification-categories", () => {
  describe("resolveEffectivePreferences", () => {
    it("returns all-on defaults when no row exists", () => {
      const prefs = resolveEffectivePreferences(null);
      expect(prefs).toEqual({
        surveysInApp: true,
        surveysEmail: true,
        evaluationsInApp: true,
        evaluationsEmail: true,
        onboardingInApp: true,
        onboardingEmail: true,
        offboardingInApp: true,
        offboardingEmail: false,
        pauseAllEmail: false,
      });
    });

    it("forces evaluations in-app on and offboarding email off, even from a row", () => {
      const prefs = resolveEffectivePreferences(buildRow());
      // These two are constants, never driven by stored columns.
      expect(prefs.evaluationsInApp).toBe(true);
      expect(prefs.offboardingEmail).toBe(false);
      // The rest mirror the row.
      expect(prefs.surveysInApp).toBe(false);
      expect(prefs.onboardingInApp).toBe(false);
    });
  });

  describe("isInAppEnabled", () => {
    it("never silences evaluation in-app notices (deemed-ack audit trail)", () => {
      const prefs = resolveEffectivePreferences(buildRow());
      expect(isInAppEnabled(prefs, "NEW_EVALUATION")).toBe(true);
      expect(isInAppEnabled(prefs, "EVAL_ACK_REMINDER")).toBe(true);
      expect(isInAppEnabled(prefs, "EVAL_DEEMED_ACK")).toBe(true);
    });

    it("respects the surveys in-app toggle", () => {
      expect(
        isInAppEnabled(resolveEffectivePreferences(buildRow()), "NEW_PULSE"),
      ).toBe(false);
      expect(
        isInAppEnabled(
          resolveEffectivePreferences(buildRow({ surveysInApp: true })),
          "NEW_PULSE",
        ),
      ).toBe(true);
    });
  });

  describe("isEmailEnabled", () => {
    it("suppresses every email when pauseAllEmail is set", () => {
      const prefs = resolveEffectivePreferences(
        buildRow({
          surveysEmail: true,
          evaluationsEmail: true,
          onboardingEmail: true,
          pauseAllEmail: true,
        }),
      );
      expect(isEmailEnabled(prefs, "PULSE_REMINDER")).toBe(false);
      expect(isEmailEnabled(prefs, "EVAL_ACK_REMINDER")).toBe(false);
      expect(isEmailEnabled(prefs, "ONBOARDING_STATUS")).toBe(false);
    });

    it("never sends offboarding/clearance email (none exists)", () => {
      const prefs = resolveEffectivePreferences(null); // all-on defaults
      expect(isEmailEnabled(prefs, "CLEARANCE_SIGN_REQUEST")).toBe(false);
      expect(isEmailEnabled(prefs, "OFFBOARDING_STARTED")).toBe(false);
    });
  });

  describe("suppressedInAppTypes", () => {
    it("lists only the disabled categories' types, never evaluations", () => {
      const suppressed = suppressedInAppTypes(
        resolveEffectivePreferences(buildRow({ surveysInApp: false })),
      );
      expect(suppressed).toEqual(
        expect.arrayContaining([
          "NEW_PULSE",
          "PULSE_REMINDER",
          "PULSE_RESULTS_SHARED",
        ]),
      );
      expect(suppressed).not.toContain("NEW_EVALUATION");
      expect(suppressed).not.toContain("EVAL_ACK_REMINDER");
    });

    it("returns nothing for all-on defaults", () => {
      expect(suppressedInAppTypes(resolveEffectivePreferences(null))).toEqual(
        [],
      );
    });
  });
});

describe("NotificationsService email gate", () => {
  const employee = {
    id: "emp-1",
    userId: "user-1",
    companyEmail: "employee@example.com",
    firstName: "Ada",
    lastName: "Lovelace",
  };

  function buildService(prefsRow: NotificationPreference | null) {
    const repository = {
      findEmployeeWithUserById: jest.fn().mockResolvedValue(employee),
      create: jest.fn().mockResolvedValue({
        id: "notif-1",
        recipientId: "emp-1",
        type: "ONBOARDING_STATUS",
        subject: "Document needs to be re-uploaded",
        body: "...",
        linkUrl: "/employee/onboarding",
        isRead: false,
        isPinned: false,
        pinnedAt: null,
        createdAt: new Date("2026-06-25T00:00:00.000Z"),
      }),
    };
    const inAppChannel = { deliver: jest.fn() };
    const emailService = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const preferencesRepository = {
      findByEmployeeId: jest.fn().mockResolvedValue(prefsRow),
    };
    const service = new NotificationsService(
      repository as never,
      inAppChannel as never,
      emailService as never,
      preferencesRepository as never,
    );
    return { service, repository, inAppChannel, emailService };
  }

  it("suppresses the email but keeps the in-app notification when email is off", async () => {
    const { service, repository, inAppChannel, emailService } = buildService(
      buildRow({ onboardingEmail: false }),
    );

    await service.notifyEmployeeDocumentRejected("emp-1", "NBI Clearance", "Too blurry.");

    expect(repository.create).toHaveBeenCalledTimes(1); // in-app row still created
    expect(inAppChannel.deliver).toHaveBeenCalledTimes(1);
    expect(emailService.sendEmail).not.toHaveBeenCalled(); // email gated off
  });

  it("sends the email when onboarding email is on", async () => {
    const { service, emailService } = buildService(
      buildRow({ onboardingEmail: true }),
    );

    await service.notifyEmployeeDocumentRejected("emp-1", "NBI Clearance", "Too blurry.");

    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
  });
});
