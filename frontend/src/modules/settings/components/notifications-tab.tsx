"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Bell, Check, Mail } from "lucide-react";

import { Button, Switch } from "@/shared/ui";
import { Skeleton } from "@/shared/ui/primitives/skeleton";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/modules/notifications/hooks/use-notification-preferences";
import type {
  NotificationPreferences,
  NotificationPreferencesUpdate,
} from "@/modules/notifications/types/notification-preferences.types";

type InAppField =
  | "surveysInApp"
  | "evaluationsInApp"
  | "onboardingInApp"
  | "offboardingInApp";
type EmailField =
  | "surveysEmail"
  | "evaluationsEmail"
  | "onboardingEmail"
  | "offboardingEmail";

interface CategoryRow {
  key: string;
  label: string;
  description: string;
  inAppField: InAppField;
  /** In-app delivery can't be turned off (acknowledgement notices). */
  inAppLocked?: boolean;
  emailField: EmailField;
  /** No email is sent for this category today, so the email toggle is disabled. */
  emailUnavailable?: boolean;
}

const CATEGORIES: CategoryRow[] = [
  {
    key: "surveys",
    label: "Surveys & Pulses",
    description: "New pulse surveys, reminders, and shared results.",
    inAppField: "surveysInApp",
    emailField: "surveysEmail",
  },
  {
    key: "evaluations",
    label: "Evaluations",
    description: "New evaluations and acknowledgement reminders.",
    inAppField: "evaluationsInApp",
    inAppLocked: true,
    emailField: "evaluationsEmail",
  },
  {
    key: "onboarding",
    label: "Onboarding",
    description: "Onboarding invites, status updates, and document reviews.",
    inAppField: "onboardingInApp",
    emailField: "onboardingEmail",
  },
  {
    key: "offboarding",
    label: "Offboarding & Clearance",
    description: "Offboarding updates and clearance signature requests.",
    inAppField: "offboardingInApp",
    emailField: "offboardingEmail",
    emailUnavailable: true,
  },
];

const EDITABLE_FIELDS: (keyof NotificationPreferencesUpdate)[] = [
  "surveysInApp",
  "surveysEmail",
  "evaluationsEmail",
  "onboardingInApp",
  "onboardingEmail",
  "offboardingInApp",
  "pauseAllEmail",
];

function pickEditable(prefs: NotificationPreferences): NotificationPreferencesUpdate {
  const out: NotificationPreferencesUpdate = {};
  for (const field of EDITABLE_FIELDS) {
    out[field] = prefs[field];
  }
  return out;
}

// ─── Toggle control ──────────────────────────────────────────────────────────────

function ToggleControl({
  label,
  checked,
  disabled,
  locked,
  caption,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  locked?: boolean;
  caption?: string;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <div className="flex w-[112px] flex-col items-start gap-1">
      <Switch
        checked={checked}
        disabled={disabled || locked}
        onCheckedChange={onChange}
        aria-label={`${label} notifications`}
      />
      {caption && (
        <span className="text-[11px] leading-tight text-[color:var(--text-tertiary)]">{caption}</span>
      )}
    </div>
  );
}

// ─── Tab ────────────────────────────────────────────────────────────────────────

/**
 * Per-category notification preferences: an in-app and an email toggle per category,
 * plus a master "pause all email" switch. Evaluations in-app is locked on (acknowledgement
 * notices), and Offboarding & Clearance has no email channel. Saving goes through
 * PATCH /api/v1/notifications/preferences; the server enforces every toggle.
 */
export function NotificationsTab() {
  const { preferences, loading, error, reload } = useNotificationPreferences();
  const { update, saving } = useUpdateNotificationPreferences();

  const [draft, setDraft] = useState<NotificationPreferences | null>(null);
  const [baseline, setBaseline] = useState<NotificationPreferences | null>(null);

  useEffect(() => {
    if (preferences) {
      setDraft(preferences);
      setBaseline(preferences);
    }
  }, [preferences]);

  const dirty = useMemo(
    () => Boolean(draft && baseline && JSON.stringify(draft) !== JSON.stringify(baseline)),
    [draft, baseline],
  );

  function setField(field: keyof NotificationPreferences, value: boolean) {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  }

  async function handleSave() {
    if (!draft) return;
    try {
      await update(pickEditable(draft));
      setBaseline(draft);
      toast.success("Notification settings saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save your settings.");
    }
  }

  // ── States ──
  if (loading || (!draft && !error)) {
    return (
      <div className="space-y-4 px-8 py-8">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error || !draft) {
    return (
      <div className="px-8 py-8">
        <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4">
          <AlertCircle size={16} className="flex-shrink-0 text-[#D92D20]" />
          <span className="flex-1 text-sm text-[color:var(--text-secondary)]">
            {error ?? "Could not load your notification settings."}
          </span>
          <Button variant="secondary" size="sm" onClick={() => void reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const emailPaused = draft.pauseAllEmail;

  return (
    <>
      <header className="sticky top-0 z-10 flex min-h-[64px] items-center border-b border-[color:var(--border-primary)] bg-white px-8 pr-16">
        <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Notifications</h2>
      </header>

      <div className="space-y-6 px-8 py-8">
        <p className="text-sm text-[color:var(--text-secondary)]">
          Choose how you want to be notified. In-app notifications appear in the bell;
          email is sent to your company address.
        </p>

        {/* Master: pause all email */}
        <div className="flex items-center justify-between gap-4 rounded-xl border border-[color:var(--border-primary)] bg-white px-5 py-4">
          <div className="flex items-start gap-3">
            <Mail size={18} className="mt-0.5 flex-shrink-0 text-[color:var(--text-secondary)]" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">Pause all email</p>
              <p className="text-xs text-[color:var(--text-tertiary)]">
                Stop every email notification. In-app notifications are unaffected.
              </p>
            </div>
          </div>
          <Switch
            checked={emailPaused}
            onCheckedChange={(value) => setField("pauseAllEmail", value)}
            aria-label="Pause all email"
          />
        </div>

        {/* Per-category toggles */}
        <div className="overflow-hidden rounded-xl border border-[color:var(--border-primary)] bg-white">
          {/* Column headers (desktop) */}
          <div className="hidden items-center gap-4 border-b border-[color:var(--border-primary)] px-5 py-2.5 sm:flex">
            <div className="flex-1 text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-tertiary)]">
              Notification type
            </div>
            <div className="flex gap-0">
              <span className="w-[112px] text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-tertiary)]">
                In-app
              </span>
              <span className="w-[112px] text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-tertiary)]">
                Email
              </span>
            </div>
          </div>

          {CATEGORIES.map((category, index) => {
            const emailDisabled = category.emailUnavailable || emailPaused;
            return (
              <div
                key={category.key}
                className={`flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center ${
                  index > 0 ? "border-t border-[color:var(--border-primary)]" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                    {category.label}
                  </p>
                  <p className="text-xs text-[color:var(--text-tertiary)]">{category.description}</p>
                </div>
                <div className="flex gap-0">
                  <ToggleControl
                    label="In-app"
                    checked={draft[category.inAppField]}
                    locked={category.inAppLocked}
                    caption={category.inAppLocked ? "Always on" : undefined}
                    onChange={
                      category.inAppLocked
                        ? undefined
                        : (value) => setField(category.inAppField, value)
                    }
                  />
                  <ToggleControl
                    label="Email"
                    checked={!emailDisabled && draft[category.emailField]}
                    disabled={emailDisabled}
                    caption={
                      category.emailUnavailable
                        ? "No email"
                        : emailPaused
                          ? "Paused"
                          : undefined
                    }
                    onChange={
                      category.emailUnavailable
                        ? undefined
                        : (value) => setField(category.emailField, value)
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-start gap-2 text-xs text-[color:var(--text-tertiary)]">
          <Bell size={13} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span>
            Evaluation acknowledgement notices are always delivered in-app so you never miss a
            deadline.
          </span>
        </div>
      </div>

      {/* Sticky save/discard footer — only when there are unsaved changes */}
      {dirty && (
        <footer className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-[color:var(--border-primary)] bg-white px-8 py-4">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={saving}
            onClick={() => baseline && setDraft(baseline)}
          >
            Discard
          </Button>
          <Button type="button" size="sm" loading={saving} onClick={() => void handleSave()}>
            {!saving && <Check aria-hidden="true" />} {saving ? "Saving…" : "Save changes"}
          </Button>
        </footer>
      )}
    </>
  );
}
