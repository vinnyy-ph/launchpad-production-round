// Single source of truth for the app-shell sidebar navigation.
// The sidebar (visible sections per role) and the topbar (breadcrumb) both read
// from here, so there is exactly one place that knows the nav structure.
//
// The sidebar is role-driven and additive: a user sees the UNION of every section
// whose role lane they hold, always rendered in the fixed stacking order
// General → My Team → Organization → Admin. Every authenticated user is a base
// employee, so General is always present. Role lanes map onto the DB-backed AppUser
// (single `role` enum + derived `isSupervisor`) — the role model itself is owned by
// people-management-engineer.

import type { FC, SVGProps } from "react";
import {
  LayoutAlt01,
  BarChartSquare02,
  Grid01,
  UserSquare,
  ClipboardCheck,
  Users01,
  Dataflow03,
  MessageSquare01,
  UsersPlus,
  Building01,
} from "@untitledui/icons";
import type { AppUser } from "@/modules/auth/types/auth.types";

/** Untitled UI icon component shape — `size` + standard SVG props; stroke uses currentColor. */
export type NavIcon = FC<SVGProps<SVGSVGElement> & { size?: number; color?: string }>;

/** Workspace label shown in the sidebar card. */
export const WORKSPACE_NAME = "DG Technologies";

/** The four role lanes that unlock sections. Additive — a user can hold any combination. */
export type NavRole = "employee" | "supervisor" | "hr" | "admin";

export interface NavItem {
  /** Stable id; also the key used for active validation and the header map. */
  id: string;
  label: string;
  icon: NavIcon;
  href: string;
  /** Optional pending-count pill (e.g. unsigned clearances). Unset = no pill. */
  badge?: number;
}

export interface NavSection {
  /** The role lane that unlocks this section. */
  role: NavRole;
  title: string;
  items: NavItem[];
}

/**
 * Sidebar sections in fixed stacking order: General → My Team → Organization → Admin.
 * Four sections, one per role lane.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    role: "employee",
    title: "General",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutAlt01, href: "/" },
      { id: "performance", label: "Performance", icon: BarChartSquare02, href: "/employee/surveys" },
    ],
  },
  {
    role: "supervisor",
    title: "My Team",
    items: [
      { id: "overview", label: "Overview", icon: Grid01, href: "/supervisor/reports" },
      { id: "roster", label: "Roster", icon: UserSquare, href: "/supervisor/roster" },
      { id: "evaluations", label: "Evaluations", icon: ClipboardCheck, href: "/supervisor/evaluations" },
    ],
  },
  {
    role: "hr",
    title: "Organization",
    items: [
      { id: "people", label: "People", icon: Users01, href: "/hr/directory" },
      { id: "departments", label: "Departments", icon: Building01, href: "/hr/departments" },
      { id: "orgchart", label: "Structure", icon: Dataflow03, href: "/hr/teams" },
      { id: "surveys", label: "Surveys", icon: MessageSquare01, href: "/hr/surveys" },
    ],
  },
  {
    role: "admin",
    title: "Admin",
    items: [{ id: "users", label: "Users", icon: UsersPlus, href: "/admin/users" }],
  },
];

/** Per-nav-item content header: { title, subtitle }, with `{workspaceName}` interpolated. */
export const SCREEN_HEADERS: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Your day at a glance across {workspaceName}." },
  performance: { title: "Performance", subtitle: "Your performance evaluations and pulse surveys." },
  overview: { title: "Team overview", subtitle: "How your direct reports are tracking." },
  roster: { title: "Roster", subtitle: "Everyone who reports to you." },
  evaluations: { title: "Evaluations", subtitle: "Write and track reviews for the people you manage." },
  people: { title: "People", subtitle: "The {workspaceName} employee directory." },
  departments: { title: "Departments", subtitle: "Organizational departments at {workspaceName}." },
  orgchart: { title: "Structure", subtitle: "Reporting lines and team structure." },
  surveys: { title: "Surveys", subtitle: "Engagement and pulse surveys." },
  users: { title: "Users", subtitle: "Accounts, roles, and access." },
};

/**
 * Breadcrumbs for routes that exist but are NOT sidebar items (employee self-service,
 * HR sub-workflows, supervisor status). They are reached via notifications, banners, and
 * in-page links rather than the role-additive sidebar; this keeps their topbar chrome.
 */
const EXTRA_CRUMBS: Record<string, string[]> = {
  "/employee/profile": ["My profile"],
  "/employee/onboarding": ["My onboarding"],
  "/employee/clearance": ["My clearances"],
  "/offboarding": ["My offboarding"],
  "/hr/onboarding": ["Organization", "Onboarding"],
  "/hr/offboarding": ["Organization", "Offboarding"],
  "/supervisor/status": ["My Team", "Hierarchy status"],
};

/** Does this user hold the given role lane? `employee` is the base every authed user has. */
export function hasNavRole(user: AppUser | null | undefined, role: NavRole): boolean {
  if (!user) return false;
  switch (role) {
    case "employee":
      return true;
    case "supervisor":
      return user.isSupervisor;
    case "hr":
      return user.role === "HR";
    case "admin":
      return user.role === "ADMIN";
  }
}

/** The sections this user can see, in fixed stacking order. Empty when unauthenticated. */
export function visibleSections(user: AppUser | null | undefined): NavSection[] {
  return NAV_SECTIONS.filter((section) => hasNavRole(user, section.role));
}

/**
 * Resolve a pathname to its sidebar section + item: exact match first, then the longest
 * href prefix (so detail routes resolve to their parent). Root `/` only matches exactly.
 */
export function findNav(pathname: string): { section: NavSection; item: NavItem } | null {
  let best: { section: NavSection; item: NavItem; len: number } | null = null;
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      const exact = pathname === item.href;
      const prefix = item.href !== "/" && pathname.startsWith(item.href);
      if (!exact && !prefix) continue;
      const len = exact ? Infinity : item.href.length;
      if (!best || len > best.len) best = { section, item, len };
    }
  }
  return best ? { section: best.section, item: best.item } : null;
}

/**
 * Breadcrumb trail for a pathname: `[item]` for the General section, `[section, item]`
 * for other sidebar sections, then the non-sidebar `EXTRA_CRUMBS`. Empty when nothing matches.
 */
export function breadcrumbForPath(pathname: string): string[] {
  const match = findNav(pathname);
  if (match) {
    return match.section.title === "General"
      ? [match.item.label]
      : [match.section.title, match.item.label];
  }
  if (EXTRA_CRUMBS[pathname]) return EXTRA_CRUMBS[pathname];
  const key = Object.keys(EXTRA_CRUMBS)
    .sort((a, b) => b.length - a.length)
    .find((k) => pathname.startsWith(k));
  return key ? EXTRA_CRUMBS[key] : [];
}
