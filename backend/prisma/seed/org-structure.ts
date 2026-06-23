// backend/prisma/seed/org-structure.ts

export type LeafDept = { name: string; headcount: number }
export type Group = { group: string; owner: string | null; depts: LeafDept[] }
export type TeamSpec = { name: string; leaderDept: string; mix: { dept: string; count: number }[] }

// Each group is a top-level DB Department (10 total). The entries under `depts` are
// sub-departments used only to wire the in-department reporting tree, lead/IC job titles
// and team membership — they are NOT separate Department rows. Every employee in a group is
// assigned to that group's single DB department, so the org chart shows the CEO connected to
// 10 departments, with the sub-department structure visible as the supervisor hierarchy inside.
//
// First dept in each group is the PRIMARY (its lead heads the group and reports to the owning
// board exec; the other dept leads in the group report to the primary lead).
export const ORG: Group[] = [
  { group: 'Engineering', owner: 'CTO', depts: [
    { name: 'Frontend', headcount: 32 },
    { name: 'Backend', headcount: 38 },
    { name: 'Mobile', headcount: 22 },
    { name: 'QA', headcount: 22 },
    { name: 'Platform & Architecture', headcount: 18 },
  ] },
  { group: 'Product', owner: 'CPO', depts: [
    { name: 'Product Management', headcount: 13 },
    { name: 'Business Analysis', headcount: 7 },
  ] },
  { group: 'Design', owner: 'CPO', depts: [
    { name: 'UX Design', headcount: 11 },
    { name: 'UX Research', headcount: 5 },
  ] },
  { group: 'Customer Support', owner: 'COO', depts: [
    { name: 'Technical Support', headcount: 24 },
    { name: 'Customer Success', headcount: 14 },
  ] },
  { group: 'Operations', owner: 'COO', depts: [
    { name: 'Business Operations', headcount: 10 },
    { name: 'Facilities & Admin', headcount: 6 },
  ] },
  { group: 'Growth', owner: 'CGO', depts: [
    { name: 'Sales', headcount: 18 },
    { name: 'Marketing', headcount: 10 },
  ] },
  { group: 'People', owner: 'CHRO', depts: [
    { name: 'Recruitment', headcount: 6 },
    { name: 'HR Operations', headcount: 7 },
    { name: 'Learning & Development', headcount: 3 },
  ] },
  { group: 'Finance', owner: 'CFO', depts: [
    { name: 'Accounting', headcount: 9 },
    { name: 'Billing & Collections', headcount: 5 },
  ] },
  { group: 'IT', owner: 'CIO', depts: [
    { name: 'IT', headcount: 10 },
  ] },
  { group: 'Executive', owner: null, depts: [
    { name: 'Executive Leadership', headcount: 10 },
  ] },
]

export const TEAMS: TeamSpec[] = [
  { name: 'UX Web', leaderDept: 'UX Design', mix: [{ dept: 'UX Design', count: 6 }] },
  { name: 'UX Mobile', leaderDept: 'UX Design', mix: [{ dept: 'UX Design', count: 5 }] },
  { name: 'Design System', leaderDept: 'UX Design', mix: [{ dept: 'UX Design', count: 3 }, { dept: 'Frontend', count: 3 }] },
  { name: 'QA Automation', leaderDept: 'QA', mix: [{ dept: 'QA', count: 8 }] },
  { name: 'Web Performance', leaderDept: 'Frontend', mix: [{ dept: 'Frontend', count: 5 }] },
  { name: 'Patient App', leaderDept: 'Product Management', mix: [
    { dept: 'Mobile', count: 5 }, { dept: 'Frontend', count: 3 }, { dept: 'UX Design', count: 1 },
    { dept: 'Product Management', count: 1 }, { dept: 'QA', count: 2 },
  ] },
  { name: 'Provider Portal', leaderDept: 'Product Management', mix: [
    { dept: 'Backend', count: 5 }, { dept: 'Frontend', count: 3 }, { dept: 'UX Design', count: 1 },
    { dept: 'Product Management', count: 1 }, { dept: 'QA', count: 2 },
  ] },
  { name: 'Security & Compliance', leaderDept: 'Platform & Architecture', mix: [
    { dept: 'Platform & Architecture', count: 3 }, { dept: 'IT', count: 2 }, { dept: 'Backend', count: 1 },
  ] },
  { name: 'Research Pod', leaderDept: 'UX Research', mix: [{ dept: 'UX Research', count: 2 }] },
]

/** Sub-departments across all groups (used for reporting-tree wiring, leads and team mixes). */
export function allDepts(): LeafDept[] {
  return ORG.flatMap((g) => g.depts)
}
/** The DB department name for a group (the Executive group's department is "Executive Leadership"). */
export function deptNameForGroup(g: Group): string {
  return g.group === 'Executive' ? 'Executive Leadership' : g.group
}
/** The 10 top-level departments that become DB Department rows, with summed headcount. */
export function topDepartments(): LeafDept[] {
  return ORG.map((g) => ({ name: deptNameForGroup(g), headcount: g.depts.reduce((n, d) => n + d.headcount, 0) }))
}
export function totalHeadcount(): number {
  return allDepts().reduce((n, d) => n + d.headcount, 0)
}
export function teamSize(t: TeamSpec): number {
  return t.mix.reduce((n, m) => n + m.count, 0)
}
export function validateOrg(): void {
  if (totalHeadcount() !== 300) throw new Error(`Org total headcount is ${totalHeadcount()}, expected 300`)
  if (topDepartments().length !== 10) throw new Error(`Expected 10 departments, got ${topDepartments().length}`)
  if (allDepts().length !== 22) throw new Error(`Expected 22 sub-departments, got ${allDepts().length}`)
}
