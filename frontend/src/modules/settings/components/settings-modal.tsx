"use client";

import { Bell, UserRound } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/ui";
import { UserAvatar } from "@/shared/ui/primitives/user-avatar";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { useSettingsModal, type SettingsTab } from "../stores/use-settings-modal";
import { MyProfileTab } from "./my-profile-tab";
import { NotificationsTab } from "./notifications-tab";

const ROLE_ACRONYMS = new Set(["ADMIN", "HR"]);

function formatRole(role: string): string {
  const upper = role.toUpperCase();
  if (ROLE_ACRONYMS.has(upper)) return upper;
  return upper.charAt(0) + upper.slice(1).toLowerCase();
}

const NAV: { value: SettingsTab; label: string; icon: typeof UserRound }[] = [
  { value: "profile", label: "My profile", icon: UserRound },
  { value: "notifications", label: "Notifications", icon: Bell },
];

/**
 * App-wide Settings modal opened from the topbar account menu. A two-pane layout
 * (mirrors the HR employee-details modal): a left sidebar with the user's identity and
 * tab navigation, and a scrollable content pane that shows the active tab. Each tab owns
 * its own data, states, and sticky save/discard footer.
 */
export function SettingsModal() {
  const { appUser } = useAuth();
  const { open, tab, setTab, close } = useSettingsModal();

  const displayName = appUser?.displayName ?? appUser?.email ?? "Account";
  const roleLabel = appUser?.role ? formatRole(appUser.role) : "";
  const initials = appUser?.displayName
    ? appUser.displayName
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (appUser?.email?.[0] ?? "?").toUpperCase();

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : close())}>
      <DialogContent className="grid h-[88vh] w-[94vw] max-w-[1160px] grid-rows-[minmax(0,1fr)] origin-center gap-0 overflow-hidden p-0 sm:rounded-xl [&>button]:z-30 [&>button]:p-1 [&>button]:text-[color:var(--text-secondary)]">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Edit your profile and manage your notification preferences.
        </DialogDescription>

        <div className="flex h-full min-h-0 flex-col bg-white sm:grid sm:grid-cols-[260px_minmax(0,1fr)] sm:grid-rows-1">
          {/* Sidebar — identity + tab navigation */}
          <aside className="hidden min-h-0 flex-col border-r border-[color:var(--border-primary)] bg-white sm:flex">
            <div className="border-b border-[color:var(--border-primary)] px-6 py-6 text-center">
              <UserAvatar
                src={appUser?.avatarUrl}
                fallback={initials}
                className="mx-auto h-16 w-16 select-none"
                fallbackClassName="text-lg font-bold text-white"
                fallbackStyle={{
                  background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))",
                }}
              />
              <h2 className="mt-4 truncate text-sm font-bold text-[color:var(--text-primary)]">
                {displayName}
              </h2>
              {roleLabel && (
                <p className="mt-1 truncate text-xs text-[color:var(--text-tertiary)]">
                  {roleLabel}
                </p>
              )}
            </div>

            <nav
              className="flex flex-1 flex-col items-stretch gap-0.5 py-4 pr-3 text-sm"
              aria-label="Settings sections"
            >
              {NAV.map((item) => {
                const isActive = tab === item.value;
                const Icon = item.icon;
                return (
                  <button
                    key={item.value}
                    type="button"
                    aria-current={isActive ? "true" : undefined}
                    onClick={() => setTab(item.value)}
                    className={`relative flex items-center gap-2.5 py-2 pl-6 pr-3 text-left transition-colors ${
                      isActive
                        ? "font-bold text-[color:var(--text-primary)]"
                        : "font-medium text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
                    }`}
                  >
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute left-3 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full"
                        style={{
                          background:
                            "linear-gradient(180deg, var(--brand-peach), var(--brand-pink))",
                        }}
                      />
                    )}
                    <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Mobile tab switcher */}
          <div className="flex border-b border-[color:var(--border-primary)] bg-white sm:hidden">
            {NAV.map((item) => {
              const isActive = tab === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setTab(item.value)}
                  aria-current={isActive ? "true" : undefined}
                  className={`flex-1 border-b-2 py-3 text-sm transition-colors ${
                    isActive
                      ? "border-[color:var(--brand-pink)] font-bold text-[color:var(--text-primary)]"
                      : "border-transparent font-medium text-[color:var(--text-secondary)]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Content pane — both tabs stay mounted so unsaved edits survive a tab switch */}
          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-white">
            <div className={tab === "profile" ? undefined : "hidden"}>
              <MyProfileTab />
            </div>
            <div className={tab === "notifications" ? undefined : "hidden"}>
              <NotificationsTab />
            </div>
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}
