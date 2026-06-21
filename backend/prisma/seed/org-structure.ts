// backend/prisma/seed/org-structure.ts

export type LeafDept = { name: string; headcount: number }
export type Group = { group: string; owner: string | null; depts: LeafDept[] }
export type TeamSpec = { name: string; leaderDept: string; mix: { dept: string; count: number }[] }

// First dept in each group is the PRIMARY (its lead reports to the owning board exec;
// the other dept leads in the group report to the primary lead).
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

export function allDepts(): LeafDept[] {
  return ORG.flatMap((g) => g.depts)
}
export function totalHeadcount(): number {
  return allDepts().reduce((n, d) => n + d.headcount, 0)
}
export function teamSize(t: TeamSpec): number {
  return t.mix.reduce((n, m) => n + m.count, 0)
}
export function validateOrg(): void {
  if (totalHeadcount() !== 300) throw new Error(`Org total headcount is ${totalHeadcount()}, expected 300`)
  if (allDepts().length !== 22) throw new Error(`Expected 22 departments, got ${allDepts().length}`)
}
