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
  Settings01,
  LogOut01,
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
  /**
   * Optional per-item gate evaluated on top of the section's role lane. When set, the item
   * is shown only if it returns true (e.g. the employee's own Offboarding tab appears only
   * while their status is OFFBOARDING). Unset = always shown for the role.
   */
  visible?: (user: AppUser) => boolean;
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
      { id: "teams", label: "Teams", icon: Users01, href: "/employee/teams" },
      {
        id: "offboarding",
        label: "Offboarding",
        icon: LogOut01,
        href: "/offboarding",
        // Personal offboarding only exists once HR has initiated it for this employee.
        visible: (user) => user.employeeStatus === "OFFBOARDING",
      },
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
      { id: "orgchart", label: "Structure", icon: Dataflow03, href: "/hr/teams" },
      { id: "surveys", label: "Surveys", icon: MessageSquare01, href: "/hr/surveys" },
      { id: "hr-evaluations", label: "Evaluations", icon: ClipboardCheck, href: "/hr/evaluations" },
      { id: "configurations", label: "Configurations", icon: Settings01, href: "/hr/configurations" },
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
  teams: { title: "Teams", subtitle: "Teams you belong to at {workspaceName}." },
  offboarding: {
    title: "My offboarding",
    subtitle: "Track your offboarding status and clearance progress.",
  },
  overview: { title: "Team overview", subtitle: "How your direct reports are tracking." },
  roster: { title: "Roster", subtitle: "Everyone who reports to you." },
  evaluations: { title: "Evaluations", subtitle: "Write and track evaluations for the people you manage." },
  people: { title: "People", subtitle: "The {workspaceName} employee directory." },
  orgchart: { title: "Structure", subtitle: "Reporting lines and team structure." },
  surveys: { title: "Surveys", subtitle: "Engagement and pulse surveys." },
  "hr-evaluations": {
    title: "Evaluations",
    subtitle: "Every sent performance evaluation across {workspaceName}.",
  },
  configurations: {
    title: "Configurations",
    subtitle: "Organization-wide setup for {workspaceName}.",
  },
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
  "/supervisor/status": ["My Team", "Hierarchy status"],
};

/**
 * Sub-tabs of the People directory. They have no sidebar item of their own, so `findNav`
 * resolves their routes to "People"; the breadcrumb appends them explicitly. The list views
 * are reached via the `?tab=` query on `/hr/directory`, while the detail pages live under the
 * `/hr/directory/<tab>/...` path — so each is matched by either its `tab` query or path `prefix`.
 */
const DIRECTORY_SUBTABS: { tab: string; prefix: string; label: string; href: string }[] = [
  {
    tab: "onboarding",
    prefix: "/hr/directory/onboarding",
    label: "Onboarding",
    href: "/hr/directory?tab=onboarding",
  },
  {
    tab: "offboarding",
    prefix: "/hr/directory/offboarding",
    label: "Offboarding",
    href: "/hr/directory?tab=offboarding",
  },
];

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

/**
 * The sections (and items) this user can see, in fixed stacking order. A section is included
 * when the user holds its role lane; within it, items with a `visible` gate are filtered by it.
 * Sections left with no visible items are dropped. Empty when unauthenticated.
 */
export function visibleSections(user: AppUser | null | undefined): NavSection[] {
  if (!user) return [];

  return NAV_SECTIONS.filter((section) => hasNavRole(user, section.role))
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.visible?.(user) ?? true),
    }))
    .filter((section) => section.items.length > 0);
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

/** A single breadcrumb segment. `href` is set only when the crumb maps to a real page. */
export interface BreadcrumbCrumb {
  label: string;
  href?: string;
}

/** Wraps an EXTRA_CRUMBS label list, linking only the leaf to its route. */
function extraCrumbsToTrail(labels: string[], href: string): BreadcrumbCrumb[] {
  return labels.map((label, index) =>
    index === labels.length - 1 ? { label, href } : { label },
  );
}

/**
 * Breadcrumb trail for a pathname: `[item]` for the General section, `[section, item]`
 * for other sidebar sections, then the non-sidebar `EXTRA_CRUMBS`. Empty when nothing matches.
 * Section-title crumbs are not navigable (no `href`); page crumbs carry their route.
 */
export function breadcrumbForPath(pathname: string, tab?: string | null): BreadcrumbCrumb[] {
  const match = findNav(pathname);
  if (match) {
    const item: BreadcrumbCrumb = { label: match.item.label, href: match.item.href };
    const base: BreadcrumbCrumb[] =
      match.section.title === "General" ? [item] : [{ label: match.section.title }, item];
    // The People directory's Onboarding/Offboarding sub-tabs have no nav item, so add their
    // crumb here (clickable back to the tab). Match the list view by its `?tab=` query or the
    // detail pages by their path prefix.
    if (match.item.href === "/hr/directory") {
      const sub = DIRECTORY_SUBTABS.find((s) => tab === s.tab || pathname.startsWith(s.prefix));
      if (sub) base.push({ label: sub.label, href: sub.href });
    }
    return base;
  }
  // The shared non-HR survey-results route (/surveys/:id/results) has no sidebar item,
  // so give it a clickable Performance parent; the page appends the survey name via
  // usePageBreadcrumb. (The HR route /hr/surveys/:id/results resolves through findNav above.)
  if (/^\/surveys\/[^/]+\/results$/.test(pathname)) {
    return [{ label: "Performance", href: "/employee/surveys" }];
  }
  if (EXTRA_CRUMBS[pathname]) return extraCrumbsToTrail(EXTRA_CRUMBS[pathname], pathname);
  const key = Object.keys(EXTRA_CRUMBS)
    .sort((a, b) => b.length - a.length)
    .find((k) => pathname.startsWith(k));
  return key ? extraCrumbsToTrail(EXTRA_CRUMBS[key], key) : [];
}
