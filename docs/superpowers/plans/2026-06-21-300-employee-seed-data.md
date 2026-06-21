# 300-Employee Realistic Seed Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the Prisma seeders in `backend/prisma/seed/` to produce a realistic 300-employee company — 22 leaf departments, 9 cross-functional teams, a reporting tree rooted at the CEO, Filipino-named generated employees, with the 8 real (login-capable) accounts as the executive board and surveys/evaluations centered on them.

**Architecture:** Two new pure-logic modules (`names.ts` for deterministic name/email generation, `org-structure.ts` for the declarative department + team data) feed a rewritten `users.ts` that creates 22 departments, the 8 real board accounts, and 292 generated employees wired into the reporting tree. `teams.ts` builds 9 cross-functional teams with overlapping membership. `evaluations.ts`, `surveys.ts`, and the three consumer files are rewritten/updated against an expanded `SeededUsers` contract. Pure logic is unit-tested with Jest; DB-effecting seeders are verified by running the seed plus an assertion script.

**Tech Stack:** TypeScript, Prisma 7 (`@prisma/client`), `PrismaPg` adapter (interactive transactions), ts-node, Jest + ts-jest, local Docker Postgres (`launchpad-pg`, `localhost:5432`).

## Global Constraints

- Seed entrypoint is `prisma/seed/index.ts`, run via `npm run db:seed` (wired in `prisma.config.ts`). Seeding uses `PrismaPg` (NOT the Neon HTTP adapter — no interactive transactions there).
- Create order is always `User` first, then `Employee` (FK `Employee.userId` required + unique).
- A reviewee's `supervisorId` MUST equal the reviewer's id for every evaluation (app rule — enforce in data even though the DB doesn't).
- `Role` enum = `ADMIN | HR | EMPLOYEE`. "Supervisor" is derived from direct reports — never a role.
- `EmployeeStatus` = `ONBOARDING | ACTIVE | OFFBOARDING | INACTIVE`.
- `PerformanceEvaluation.supportingDocUrls` is `String[]` — never `supportingDocUrl`. `grade` is Int 1–5. `ackDeadline = sentAt + 7 days`.
- Anonymous survey responses set `SurveyResponse.employeeId = null` but still populate `respondentSupervisorId` + `respondentTeamIds`; `SurveyCompletion` always uses the real `employeeId`.
- `Team` leadership is `Team.leaderId` only (no `is_leader` on `TeamMember`); the leader is ALSO a `TeamMember` row.
- The 8 real accounts keep their exact existing login emails, `companyEmail`, and roles. Only two display names change: Kurt Ds → **Rafael Bautista**, Ximen Galang → **Angelo Galang**.
- Generated emails: `firstname.lastname@dgtechnologies.com`, slugified + deduped.
- Generation is **deterministic** (seeded PRNG, fixed seed).
- Totals: exactly **300 employees / 300 users**, **22 departments**, **9 teams**.
- Tests live under `backend/src/` (Jest `roots: ["<rootDir>/src"]`); seed modules imported by relative path. Type-check with `npx tsc -p tsconfig.seed.json`.
- Commit messages end with:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

## Reference data (single source of truth)

**Departments (22 leaf), grouped, with owning board title. Counts sum to 300.**

| Group (owner title) | Departments (HC) |
|---|---|
| Engineering (CTO) | Frontend 32, Backend 38, Mobile 22, QA 22, Platform & Architecture 18 |
| Product (CPO) | Product Management 13, Business Analysis 7 |
| Design (CPO) | UX Design 11, UX Research 5 |
| Customer Support (COO) | Technical Support 24, Customer Success 14 |
| Operations (COO) | Business Operations 10, Facilities & Admin 6 |
| Growth (CGO) | Sales 18, Marketing 10 |
| People (CHRO) | Recruitment 6, HR Operations 7, Learning & Development 3 |
| Finance (CFO) | Accounting 9, Billing & Collections 5 |
| IT (CIO) | IT 10 |
| Executive (—) | Executive Leadership 10 |

First dept in each group = **primary** (its lead reports to the owning exec; other dept leads in the group report to the primary lead).

**Board (Executive Leadership; 8 real + 2 generated):**

| Login email | Display name | Title | Role |
|---|---|---|---|
| allenkurtds.dev@gmail.com | Rafael Bautista | CEO (root) | EMPLOYEE |
| loretorussellkelvinanthony@gmail.com | Loreto Russell | CTO | ADMIN |
| ashasce@gmail.com | Asha Ce | CIO | ADMIN |
| theaverah@gmail.com | Thea Verah | CPO | EMPLOYEE |
| vnferrer.work@gmail.com | Vn Ferrer | COO | EMPLOYEE |
| darbenlamonte@gmail.com | Darben Lamonte | CHRO | HR |
| thea_sumagang@dlsu.edu.ph | Thea Sumagang | CFO | HR |
| ximen91101@gmail.com | Angelo Galang | CGO | EMPLOYEE |

+ 2 generated (Chief of Staff, Executive Assistant) reporting to the CEO.

**Teams (9, cross-functional; leader is also a member; mix counts include the leader):**

| Team | Leader source dept | Member mix (dept × count) |
|---|---|---|
| UX Web | UX Design | UX Design ×6 |
| UX Mobile | UX Design | UX Design ×5 |
| Design System | UX Design | UX Design ×3 + Frontend ×3 |
| QA Automation | QA | QA ×8 |
| Web Performance | Frontend | Frontend ×5 |
| Patient App | Product Management | Mobile ×5 + Frontend ×3 + UX Design ×1 + Product Management ×1 + QA ×2 |
| Provider Portal | Product Management | Backend ×5 + Frontend ×3 + UX Design ×1 + Product Management ×1 + QA ×2 |
| Security & Compliance | Platform & Architecture | Platform & Architecture ×3 + IT ×2 + Backend ×1 |
| Research Pod | UX Research | UX Research ×2 |

---

### Task 1: Name & email generation (`names.ts`)

**Files:**
- Create: `backend/prisma/seed/names.ts`
- Test: `backend/src/tests/seed/names.test.ts`

**Interfaces:**
- Produces:
  - `mulberry32(seed: number): () => number`
  - `slugifyEmailLocal(firstName: string, lastName: string): string` — e.g. `("Ma. Theresa","Dela Cruz") => "theresa.delacruz"`.
  - `createPeopleGenerator(seed?: number): () => { firstName: string; lastName: string; email: string }` — unique `@dgtechnologies.com` emails, `.2`/`.3`… on collision.
  - `FIRST_NAMES: string[]`, `LAST_NAMES: string[]`.

- [ ] **Step 1: Write the failing test** `backend/src/tests/seed/names.test.ts`

```ts
import {
  mulberry32,
  slugifyEmailLocal,
  createPeopleGenerator,
} from '../../../prisma/seed/names'

describe('slugifyEmailLocal', () => {
  it('drops honorific prefixes and joins first token + last name', () => {
    expect(slugifyEmailLocal('Ma. Theresa', 'Dela Cruz')).toBe('theresa.delacruz')
  })
  it('lowercases and strips spaces/periods', () => {
    expect(slugifyEmailLocal('John Michael', 'Sta. Ana')).toBe('john.staana')
  })
  it('keeps a plain name intact', () => {
    expect(slugifyEmailLocal('Angelo', 'Galang')).toBe('angelo.galang')
  })
})

describe('mulberry32', () => {
  it('is deterministic for the same seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
})

describe('createPeopleGenerator', () => {
  it('is deterministic for the same seed', () => {
    const g1 = createPeopleGenerator(7)
    const g2 = createPeopleGenerator(7)
    expect([g1(), g1(), g1()]).toEqual([g2(), g2(), g2()])
  })
  it('produces 300 unique emails', () => {
    const g = createPeopleGenerator(1)
    const emails = new Set<string>()
    for (let i = 0; i < 300; i++) emails.add(g().email)
    expect(emails.size).toBe(300)
  })
  it('emails use the dgtechnologies.com domain', () => {
    const g = createPeopleGenerator(1)
    expect(g().email.endsWith('@dgtechnologies.com')).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && npx jest src/tests/seed/names.test.ts`
Expected: FAIL — `Cannot find module '../../../prisma/seed/names'`.

- [ ] **Step 3: Implement `names.ts`**

```ts
// backend/prisma/seed/names.ts

export const FIRST_NAMES: string[] = [
  // … PASTE THE COMPLETE Filipino first-name array here (provided separately) …
]
export const LAST_NAMES: string[] = [
  // … PASTE THE COMPLETE Filipino last-name array here (provided separately) …
]

const HONORIFIC = /^(ma|sta|sto)\.?$/i

export function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return function () {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function slugifyEmailLocal(firstName: string, lastName: string): string {
  const firstToken =
    firstName.split(/\s+/).find((tok) => !HONORIFIC.test(tok)) ?? firstName
  const first = firstToken.toLowerCase().replace(/[^a-z0-9]/g, '')
  const last = lastName.toLowerCase().replace(/[^a-z0-9]/g, '')
  return `${first}.${last}`
}

export function createPeopleGenerator(seed = 1) {
  const rng = mulberry32(seed)
  const used = new Set<string>()
  const pick = (arr: string[]) => arr[Math.floor(rng() * arr.length)]
  return function next(): { firstName: string; lastName: string; email: string } {
    const firstName = pick(FIRST_NAMES)
    const lastName = pick(LAST_NAMES)
    const base = slugifyEmailLocal(firstName, lastName)
    let email = `${base}@dgtechnologies.com`
    let n = 2
    while (used.has(email)) {
      email = `${base}.${n}@dgtechnologies.com`
      n++
    }
    used.add(email)
    return { firstName, lastName, email }
  }
}
```

> The controller provides the COMPLETE `FIRST_NAMES` and `LAST_NAMES` arrays as a separate file to
> paste in verbatim. Do not ship the `…` placeholder.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && npx jest src/tests/seed/names.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/seed/names.ts backend/src/tests/seed/names.test.ts
git commit -m "feat(seed): deterministic Filipino name + email generator

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Declarative org structure (`org-structure.ts`)

**Files:**
- Create: `backend/prisma/seed/org-structure.ts`
- Test: `backend/src/tests/seed/org-structure.test.ts`

**Interfaces:**
- Produces:
  - `type LeafDept = { name: string; headcount: number }`
  - `type Group = { group: string; owner: string | null; depts: LeafDept[] }` (owner = board title, null for Executive)
  - `type TeamSpec = { name: string; leaderDept: string; mix: { dept: string; count: number }[] }`
  - `ORG: Group[]`, `TEAMS: TeamSpec[]`
  - `allDepts(): LeafDept[]` — flat list of all 22 leaf departments
  - `totalHeadcount(): number`
  - `teamSize(t: TeamSpec): number` — sum of mix counts
  - `validateOrg(): void` — throws unless total = 300 and there are 22 departments

- [ ] **Step 1: Write the failing test** `backend/src/tests/seed/org-structure.test.ts`

```ts
import { ORG, TEAMS, allDepts, totalHeadcount, teamSize, validateOrg } from '../../../prisma/seed/org-structure'

describe('org structure', () => {
  it('totals 300 employees', () => {
    expect(totalHeadcount()).toBe(300)
  })
  it('has 22 leaf departments', () => {
    expect(allDepts().length).toBe(22)
  })
  it('department names are unique', () => {
    const names = allDepts().map((d) => d.name)
    expect(new Set(names).size).toBe(names.length)
  })
  it('Executive group owns nothing and holds Executive Leadership (10)', () => {
    const exec = ORG.find((g) => g.group === 'Executive')
    expect(exec?.owner).toBeNull()
    expect(exec?.depts).toEqual([{ name: 'Executive Leadership', headcount: 10 }])
  })
  it('validateOrg does not throw', () => {
    expect(() => validateOrg()).not.toThrow()
  })
  it('has 9 teams with the expected sizes', () => {
    expect(TEAMS.length).toBe(9)
    const sizes = Object.fromEntries(TEAMS.map((t) => [t.name, teamSize(t)]))
    expect(sizes).toEqual({
      'UX Web': 6, 'UX Mobile': 5, 'Design System': 6, 'QA Automation': 8,
      'Web Performance': 5, 'Patient App': 12, 'Provider Portal': 12,
      'Security & Compliance': 6, 'Research Pod': 2,
    })
  })
  it('Research Pod has exactly 2 members (under-3 privacy demo)', () => {
    const rp = TEAMS.find((t) => t.name === 'Research Pod')!
    expect(teamSize(rp)).toBe(2)
  })
  it('every team mix references real department names', () => {
    const deptNames = new Set(allDepts().map((d) => d.name))
    for (const t of TEAMS) {
      expect(deptNames.has(t.leaderDept)).toBe(true)
      for (const m of t.mix) expect(deptNames.has(m.dept)).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && npx jest src/tests/seed/org-structure.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `org-structure.ts`**

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && npx jest src/tests/seed/org-structure.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/seed/org-structure.ts backend/src/tests/seed/org-structure.test.ts
git commit -m "feat(seed): declarative org structure (22 depts, 9 teams)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Rewrite `users.ts` — 22 departments, board, generated employees

**Files:**
- Modify (full rewrite): `backend/prisma/seed/users.ts`
- Create: `backend/prisma/seed/checks.ts` (DB assertion verifier; not imported by `index.ts`)

**Interfaces:**
- Consumes: `createPeopleGenerator` (Task 1); `ORG`, `allDepts`, `validateOrg` (Task 2).
- Produces:

```ts
export type SeededUsers = {
  ceo: Employee; cto: Employee; cio: Employee; cpo: Employee
  coo: Employee; chro: Employee; cfo: Employee; cgo: Employee
  board: Employee[]                      // the 8, CEO first
  all: Employee[]                        // all 300
  generated: Employee[]                  // the 292
  byDept: Record<string, Employee[]>     // leaf dept name → members, lead at index 0
  deptLead: Record<string, Employee>     // leaf dept name → lead employee
  onboardingSample: Employee
  offboardingSample: Employee
}
export async function seedUsers(prisma: PrismaClient): Promise<SeededUsers>
```

**Algorithm (build tier by tier so supervisors exist before reports):**
1. `validateOrg()`.
2. Create 22 departments (from `allDepts()`); keep `deptId[name]`.
3. Create CEO (Rafael Bautista) in Executive Leadership, `supervisorId` null.
4. Create the other 7 board members (exact emails/roles) in Executive Leadership, `supervisorId = ceo.id`. Keep `byTitle[title]`.
5. Create 2 generated Executive Leadership support roles (Chief of Staff, Executive Assistant), `supervisorId = ceo.id`.
6. For each non-Executive group: resolve `owner = byTitle[group.owner]`. For the **primary** dept (index 0): create its lead (`supervisorId = owner.id`), then its ICs (`supervisorId = lead.id`). For each **other** dept: create its lead (`supervisorId = primaryLead.id`), then ICs (`supervisorId = thatLead.id`). Fill each dept to its exact HC (lead counts as 1). IT is a single-dept group → its lead reports to CIO; title the IT lead "IT Manager".
7. Record `byDept[deptName]` (lead first) and `deptLead[deptName]` for every leaf dept.
8. Status samples (generated): `byDept['Recruitment'][1]` → `ONBOARDING` (onboardingSample); `byDept['Customer Success'][1]` → `OFFBOARDING` (offboardingSample); `byDept['Backend'][1]` → `INACTIVE`. Everyone else `ACTIVE`.
9. Return `SeededUsers`.

- [ ] **Step 1: Create the assertion verifier** `backend/prisma/seed/checks.ts`

```ts
// backend/prisma/seed/checks.ts
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { allDepts, TEAMS, teamSize } from './org-structure'

const url = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL required')
const prisma = new PrismaClient({ adapter: new PrismaPg(url) })

async function main() {
  const errors: string[] = []
  const eq = (label: string, got: number, want: number) => {
    if (got !== want) errors.push(`${label}: got ${got}, expected ${want}`)
  }

  eq('users', await prisma.user.count(), 300)
  eq('employees', await prisma.employee.count(), 300)
  eq('departments', await prisma.department.count(), 22)
  eq('teams', await prisma.team.count(), 9)
  eq('root employees (supervisorId null)', await prisma.employee.count({ where: { supervisorId: null } }), 1)

  for (const d of allDepts()) {
    const row = await prisma.department.findUnique({ where: { name: d.name } })
    if (!row) { errors.push(`missing department ${d.name}`); continue }
    eq(`dept ${d.name} headcount`, await prisma.employee.count({ where: { departmentId: row.id } }), d.headcount)
  }

  for (const t of TEAMS) {
    const team = await prisma.team.findFirst({ where: { name: t.name }, include: { members: true } })
    if (!team) { errors.push(`missing team ${t.name}`); continue }
    eq(`team ${t.name} members`, team.members.length, teamSize(t))
    const leaderIsMember = team.members.some((m) => m.employeeId === team.leaderId)
    if (!leaderIsMember) errors.push(`team ${t.name}: leader is not a member row`)
  }

  const exec = await prisma.department.findUnique({ where: { name: 'Executive Leadership' } })
  const realEmails = [
    'allenkurtds.dev@gmail.com', 'loretorussellkelvinanthony@gmail.com', 'ashasce@gmail.com',
    'theaverah@gmail.com', 'vnferrer.work@gmail.com', 'darbenlamonte@gmail.com',
    'thea_sumagang@dlsu.edu.ph', 'ximen91101@gmail.com',
  ]
  for (const email of realEmails) {
    const u = await prisma.user.findUnique({ where: { email }, include: { employee: true } })
    if (!u || !u.employee) { errors.push(`missing real account ${email}`); continue }
    if (u.employee.departmentId !== exec?.id) errors.push(`${email} not in Executive Leadership`)
  }

  if (errors.length) { console.error('SEED CHECK FAILED:\n' + errors.join('\n')); process.exit(1) }
  console.log('SEED CHECK PASSED ✔')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Rewrite `users.ts`** (replace the entire file)

```ts
// backend/prisma/seed/users.ts
import { PrismaClient, Employee, EmployeeStatus, Role } from '@prisma/client'
import { ORG, allDepts, validateOrg } from './org-structure'
import { createPeopleGenerator } from './names'

export type SeededUsers = {
  ceo: Employee; cto: Employee; cio: Employee; cpo: Employee
  coo: Employee; chro: Employee; cfo: Employee; cgo: Employee
  board: Employee[]
  all: Employee[]
  generated: Employee[]
  byDept: Record<string, Employee[]>
  deptLead: Record<string, Employee>
  onboardingSample: Employee
  offboardingSample: Employee
}

const nextPerson = createPeopleGenerator(20260621) // fixed seed → deterministic

async function createEmployee(
  prisma: PrismaClient,
  opts: {
    email: string; firstName: string; lastName: string; jobTitle: string
    role?: Role; departmentId: string; supervisorId?: string; status?: EmployeeStatus
  },
): Promise<Employee> {
  const user = await prisma.user.create({ data: { email: opts.email, role: opts.role ?? 'EMPLOYEE' } })
  return prisma.employee.create({
    data: {
      user: { connect: { id: user.id } },
      companyEmail: opts.email,
      firstName: opts.firstName,
      lastName: opts.lastName,
      jobTitle: opts.jobTitle,
      department: { connect: { id: opts.departmentId } },
      ...(opts.supervisorId ? { supervisor: { connect: { id: opts.supervisorId } } } : {}),
      status: opts.status ?? 'ACTIVE',
      address: { create: { address: 'DG Technologies HQ', city: 'Makati', province: 'Metro Manila', country: 'Philippines' } },
      emergencyContact: { create: { emergencyContactName: 'Emergency Contact', emergencyContactNumber: '+63 917 000 0000' } },
    },
  })
}

export async function seedUsers(prisma: PrismaClient): Promise<SeededUsers> {
  validateOrg()
  // tiny deterministic LCG for seniority tier selection
  let s = 99
  const tierRng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
  const tiers = ['Senior ', '', 'Mid ', 'Junior ']
  const icTitle = (dept: string) => `${tiers[Math.floor(tierRng() * tiers.length)]}${dept} Specialist`.replace(/\s+/g, ' ').trim()
  const leadTitle = (dept: string) => (dept === 'IT' ? 'IT Manager' : `${dept} Lead`)

  // 1–2. Departments
  const deptId: Record<string, string> = {}
  for (const d of allDepts()) {
    const row = await prisma.department.create({ data: { name: d.name } })
    deptId[d.name] = row.id
  }
  const execId = deptId['Executive Leadership']

  const all: Employee[] = []
  const generated: Employee[] = []
  const byDept: Record<string, Employee[]> = {}
  const deptLead: Record<string, Employee> = {}
  for (const d of allDepts()) byDept[d.name] = []
  const track = (e: Employee, dept: string, isGenerated: boolean) => {
    all.push(e); byDept[dept].push(e); if (isGenerated) generated.push(e)
  }

  // 3. CEO (root)
  const ceo = await createEmployee(prisma, { email: 'allenkurtds.dev@gmail.com', firstName: 'Rafael', lastName: 'Bautista', jobTitle: 'CEO', role: 'EMPLOYEE', departmentId: execId })
  track(ceo, 'Executive Leadership', false)

  // 4. Other board members
  const boardSpec: Array<{ title: string; email: string; firstName: string; lastName: string; role: Role }> = [
    { title: 'CTO', email: 'loretorussellkelvinanthony@gmail.com', firstName: 'Loreto', lastName: 'Russell', role: 'ADMIN' },
    { title: 'CIO', email: 'ashasce@gmail.com', firstName: 'Asha', lastName: 'Ce', role: 'ADMIN' },
    { title: 'CPO', email: 'theaverah@gmail.com', firstName: 'Thea', lastName: 'Verah', role: 'EMPLOYEE' },
    { title: 'COO', email: 'vnferrer.work@gmail.com', firstName: 'Vn', lastName: 'Ferrer', role: 'EMPLOYEE' },
    { title: 'CHRO', email: 'darbenlamonte@gmail.com', firstName: 'Darben', lastName: 'Lamonte', role: 'HR' },
    { title: 'CFO', email: 'thea_sumagang@dlsu.edu.ph', firstName: 'Thea', lastName: 'Sumagang', role: 'HR' },
    { title: 'CGO', email: 'ximen91101@gmail.com', firstName: 'Angelo', lastName: 'Galang', role: 'EMPLOYEE' },
  ]
  const byTitle: Record<string, Employee> = {}
  for (const b of boardSpec) {
    const e = await createEmployee(prisma, { email: b.email, firstName: b.firstName, lastName: b.lastName, jobTitle: b.title, role: b.role, departmentId: execId, supervisorId: ceo.id })
    byTitle[b.title] = e
    track(e, 'Executive Leadership', false)
  }

  // 5. Two generated support roles
  for (const title of ['Chief of Staff', 'Executive Assistant']) {
    const p = nextPerson()
    const e = await createEmployee(prisma, { email: p.email, firstName: p.firstName, lastName: p.lastName, jobTitle: title, departmentId: execId, supervisorId: ceo.id })
    track(e, 'Executive Leadership', true)
  }

  const fillICs = async (deptName: string, count: number, supervisorId: string) => {
    for (let i = 0; i < count; i++) {
      const p = nextPerson()
      const e = await createEmployee(prisma, { email: p.email, firstName: p.firstName, lastName: p.lastName, jobTitle: icTitle(deptName), departmentId: deptId[deptName], supervisorId })
      track(e, deptName, true)
    }
  }

  // 6–7. Non-Executive groups
  for (const group of ORG) {
    if (group.group === 'Executive') continue
    const owner = byTitle[group.owner as string]
    let primaryLead: Employee | null = null
    for (let i = 0; i < group.depts.length; i++) {
      const d = group.depts[i]
      const isPrimary = i === 0
      const p = nextPerson()
      const lead = await createEmployee(prisma, {
        email: p.email, firstName: p.firstName, lastName: p.lastName, jobTitle: leadTitle(d.name),
        departmentId: deptId[d.name], supervisorId: isPrimary ? owner.id : (primaryLead as Employee).id,
      })
      track(lead, d.name, true)
      deptLead[d.name] = lead
      if (isPrimary) primaryLead = lead
      await fillICs(d.name, d.headcount - 1, lead.id)
    }
  }

  // 8. Status samples (generated)
  const onboardingSample = byDept['Recruitment'][1]
  const offboardingSample = byDept['Customer Success'][1]
  const inactive = byDept['Backend'][1]
  await prisma.employee.update({ where: { id: onboardingSample.id }, data: { status: 'ONBOARDING' } })
  await prisma.employee.update({ where: { id: offboardingSample.id }, data: { status: 'OFFBOARDING' } })
  await prisma.employee.update({ where: { id: inactive.id }, data: { status: 'INACTIVE' } })
  onboardingSample.status = 'ONBOARDING'; offboardingSample.status = 'OFFBOARDING'; inactive.status = 'INACTIVE'

  return {
    ceo, cto: byTitle['CTO'], cio: byTitle['CIO'], cpo: byTitle['CPO'], coo: byTitle['COO'],
    chro: byTitle['CHRO'], cfo: byTitle['CFO'], cgo: byTitle['CGO'],
    board: [ceo, byTitle['CTO'], byTitle['CIO'], byTitle['CPO'], byTitle['COO'], byTitle['CHRO'], byTitle['CFO'], byTitle['CGO']],
    all, generated, byDept, deptLead, onboardingSample, offboardingSample,
  }
}
```

> The `prisma.employee.update` calls run under the PrismaPg adapter, where interactive transactions
> are supported.

- [ ] **Step 3: Type-check the seed**

Run: `cd backend && npx tsc -p tsconfig.seed.json`
Expected: `users.ts`/`names.ts`/`org-structure.ts`/`checks.ts` clean; remaining errors only in `teams.ts`/`evaluations.ts`/`surveys.ts`/`onboarding.ts`/`offboarding.ts`/`notifications.ts` (old `SeededUsers` shape — fixed in later tasks).

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/seed/users.ts backend/prisma/seed/checks.ts
git commit -m "feat(seed): rewrite users.ts for 22-dept board-led 300-employee org

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Rewrite `teams.ts` — 9 cross-functional teams

**Files:**
- Modify (full rewrite): `backend/prisma/seed/teams.ts`

**Interfaces:**
- Consumes: `SeededUsers.byDept` (Task 3); `TEAMS` (Task 2).
- Produces: `seedTeams(prisma, users): Promise<void>` — creates the 9 teams. For each team: pick members from `byDept` per the mix using a per-department round-robin cursor (wrapping, which yields the intended cross-team overlap); the first member taken from `leaderDept` is the leader (`Team.leaderId`) and is also a `TeamMember`. Members are deduplicated within a team before inserting `TeamMember` rows.

- [ ] **Step 1: Rewrite `teams.ts`**

```ts
// backend/prisma/seed/teams.ts
import { PrismaClient, Employee } from '@prisma/client'
import { SeededUsers } from './users'
import { TEAMS } from './org-structure'

export async function seedTeams(prisma: PrismaClient, users: SeededUsers): Promise<void> {
  // per-department cursor; wraps so memberships exceeding a dept's size overlap across teams
  const cursor: Record<string, number> = {}
  const takeFrom = (dept: string, n: number): Employee[] => {
    const list = users.byDept[dept] ?? []
    if (list.length === 0) return []
    const out: Employee[] = []
    let c = cursor[dept] ?? 0
    for (let i = 0; i < n; i++) { out.push(list[c % list.length]); c++ }
    cursor[dept] = c
    return out
  }

  for (const spec of TEAMS) {
    let leader: Employee | null = null
    const members: Employee[] = []
    for (const m of spec.mix) {
      const picked = takeFrom(m.dept, m.count)
      if (leader === null && m.dept === spec.leaderDept && picked.length > 0) leader = picked[0]
      members.push(...picked)
    }
    if (!leader) throw new Error(`team ${spec.name}: could not resolve a leader from ${spec.leaderDept}`)

    const team = await prisma.team.create({ data: { name: spec.name, leaderId: leader.id } })

    const seen = new Set<string>()
    for (const emp of members) {
      if (seen.has(emp.id)) continue
      seen.add(emp.id)
      await prisma.teamMember.create({ data: { teamId: team.id, employeeId: emp.id } })
    }
  }
}
```

> Within a single team no department is listed twice and every `count` ≤ that department's size, so
> the in-team `seen` dedupe is defensive only; cross-team overlap (e.g. UX Design reused across UX
> Web / Design System / Patient App) is intentional and produced by the wrapping cursor.

- [ ] **Step 2: Type-check**

Run: `cd backend && npx tsc -p tsconfig.seed.json`
Expected: `teams.ts` no longer errors; remaining errors only in evaluations/surveys/onboarding/offboarding/notifications.

- [ ] **Step 3: Commit**

```bash
git add backend/prisma/seed/teams.ts
git commit -m "feat(seed): 9 cross-functional teams with overlapping membership

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Update `onboarding.ts` and `offboarding.ts` to the new `SeededUsers`

**Files:**
- Modify: `backend/prisma/seed/onboarding.ts`
- Modify: `backend/prisma/seed/offboarding.ts`

**Interfaces:**
- Consumes: `users.onboardingSample`, `users.offboardingSample`, `users.chro`, `users.ceo`, `users.coo` (Task 3).

- [ ] **Step 1: Update `onboarding.ts`**

```ts
// was: const casey = users.staff[3]
const casey = users.onboardingSample
```
```ts
// was: reviewerId: users.darben.id,
reviewerId: users.chro.id,
```

- [ ] **Step 2: Update `offboarding.ts`**

```ts
// was: const blake = users.staff[8]
const blake = users.offboardingSample
```
Then replace every `users.kurt` → `users.ceo`; every `users.theaV` → `users.coo`; every `users.darben` → `users.chro`. (The offboarded employee is in Customer Success, owned by COO Vn; executive sign-off is the CEO; HR initiator is the CHRO.)

- [ ] **Step 3: Type-check**

Run: `cd backend && npx tsc -p tsconfig.seed.json`
Expected: `onboarding.ts` + `offboarding.ts` clean; remaining errors only in evaluations/surveys/notifications.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/seed/onboarding.ts backend/prisma/seed/offboarding.ts
git commit -m "chore(seed): adapt onboarding/offboarding to board SeededUsers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Rewrite `evaluations.ts` — board-centered state matrix

**Files:**
- Modify (full rewrite): `backend/prisma/seed/evaluations.ts`

**Interfaces:**
- Consumes: `SeededUsers` (`ceo`, `cto`, `cio`, `cpo`, `coo`, `chro`, `cfo`, `cgo`, `deptLead`, `byDept`).
- Produces: `seedEvaluations(prisma, users): Promise<SeededEvaluations>` where
  `SeededEvaluations = { pendingAck: { evaluationId: string; revieweeId: string }[] }` (unchanged shape — `notifications.ts` depends on it).

**Data plan (reviewer = direct supervisor in every row):**
- **CEO → each of the 7 other board members** (CEO is their supervisor): states —
  CTO acknowledged, CIO pending (→pendingAck), CPO acknowledged, COO pending (→pendingAck),
  CHRO draft, CFO deemed, CGO acknowledged.
- **Each board member → the primary dept lead they supervise**: CTO→`deptLead['Frontend']`,
  CPO→`deptLead['Product Management']`, COO→`deptLead['Technical Support']`,
  CHRO→`deptLead['Recruitment']`, CFO→`deptLead['Accounting']`, CGO→`deptLead['Sales']`,
  CIO→`deptLead['IT']`. Mixed states (one pending → pendingAck).
- **Light scatter**: `deptLead['Backend']`, `deptLead['Technical Support']`, `deptLead['Marketing']`
  each review `byDept[dept][1]` (their first IC), acknowledged.

- [ ] **Step 1: Rewrite `evaluations.ts`**

```ts
// backend/prisma/seed/evaluations.ts
import { PrismaClient, Employee } from '@prisma/client'
import { SeededUsers } from './users'

export type SeededEvaluations = {
  pendingAck: { evaluationId: string; revieweeId: string }[]
}

const PERIOD_Q1_2026 = { periodStart: new Date('2026-01-01'), periodEnd: new Date('2026-03-31') }
const ackDeadlineFrom = (sentAt: Date) => new Date(sentAt.getTime() + 7 * 24 * 60 * 60 * 1000)

type State = 'draft' | 'pending' | 'acknowledged' | 'deemed'

export async function seedEvaluations(prisma: PrismaClient, users: SeededUsers): Promise<SeededEvaluations> {
  const pendingAck: { evaluationId: string; revieweeId: string }[] = []

  async function evaluate(
    reviewer: Employee, reviewee: Employee, state: State, grade: number, sentAt: Date,
    content: { highlights: string[]; lowlights: string[]; evaluation: string; recommendation: string },
  ): Promise<void> {
    const isSent = state !== 'draft'
    const evalRow = await prisma.performanceEvaluation.create({
      data: {
        reviewerId: reviewer.id, revieweeId: reviewee.id, ...PERIOD_Q1_2026, grade,
        highlights: content.highlights, lowlights: content.lowlights,
        evaluation: content.evaluation, recommendation: content.recommendation,
        supportingDocUrls: [], isSent,
        ...(isSent ? { sentAt, ackDeadline: ackDeadlineFrom(sentAt) } : {}),
      },
    })
    if (state === 'pending') {
      pendingAck.push({ evaluationId: evalRow.id, revieweeId: reviewee.id })
    } else if (state === 'acknowledged') {
      await prisma.evaluationAcknowledgement.create({ data: { evaluationId: evalRow.id, employeeId: reviewee.id, isDeemedAck: false, acknowledgedAt: new Date(sentAt.getTime() + 2 * 86400000) } })
    } else if (state === 'deemed') {
      await prisma.evaluationAcknowledgement.create({ data: { evaluationId: evalRow.id, employeeId: reviewee.id, isDeemedAck: true, acknowledgedAt: ackDeadlineFrom(sentAt) } })
    }
  }

  const C = (area: string) => ({
    highlights: [`Strong leadership of the ${area} org this quarter`, 'Drove cross-functional alignment on company priorities'],
    lowlights: ['Spread thin across competing initiatives'],
    evaluation: `Solid quarter leading ${area}. Delivery and stakeholder management were strong; protecting focus is the main growth area.`,
    recommendation: `Delegate one workstream next quarter and own the ${area} strategy review end to end.`,
  })

  // CEO → board members
  await evaluate(users.ceo, users.cto, 'acknowledged', 4, new Date('2026-06-01'), C('Engineering'))
  await evaluate(users.ceo, users.cio, 'pending', 4, new Date('2026-06-14'), C('IT'))
  await evaluate(users.ceo, users.cpo, 'acknowledged', 5, new Date('2026-06-01'), C('Product & Design'))
  await evaluate(users.ceo, users.coo, 'pending', 4, new Date('2026-06-16'), C('Operations & Support'))
  await evaluate(users.ceo, users.chro, 'draft', 4, new Date('2026-06-16'), C('People'))
  await evaluate(users.ceo, users.cfo, 'deemed', 3, new Date('2026-05-20'), C('Finance'))
  await evaluate(users.ceo, users.cgo, 'acknowledged', 4, new Date('2026-06-01'), C('Growth'))

  // Each board member → the primary dept lead they supervise
  const owners: Array<[Employee, string, State]> = [
    [users.cto, 'Frontend', 'pending'],
    [users.cpo, 'Product Management', 'acknowledged'],
    [users.coo, 'Technical Support', 'draft'],
    [users.chro, 'Recruitment', 'acknowledged'],
    [users.cfo, 'Accounting', 'deemed'],
    [users.cgo, 'Sales', 'pending'],
    [users.cio, 'IT', 'acknowledged'],
  ]
  for (const [owner, dept, state] of owners) {
    const lead = users.deptLead[dept]
    await evaluate(owner, lead, state, 4, new Date('2026-06-05'), {
      highlights: [`Kept ${dept} delivering on schedule`, 'Strong team mentorship'],
      lowlights: ['Documentation could be more consistent'],
      evaluation: `${dept} stayed productive this quarter under solid leadership.`,
      recommendation: `Lead the ${dept} process-improvement initiative next quarter.`,
    })
  }

  // Light scatter
  for (const dept of ['Backend', 'Technical Support', 'Marketing']) {
    const lead = users.deptLead[dept]
    const ic = users.byDept[dept]?.[1]
    if (lead && ic) {
      await evaluate(lead, ic, 'acknowledged', 3, new Date('2026-06-03'), {
        highlights: ['Met sprint commitments', 'Reliable contributor'],
        lowlights: ['Could take more initiative on stretch work'],
        evaluation: 'A consistent quarter with room to grow into more ownership.',
        recommendation: 'Take the lead on one cross-team task next quarter.',
      })
    }
  }

  return { pendingAck }
}
```

- [ ] **Step 2: Type-check**

Run: `cd backend && npx tsc -p tsconfig.seed.json`
Expected: `evaluations.ts` clean; remaining errors only in `surveys.ts` and `notifications.ts`.

- [ ] **Step 3: Commit**

```bash
git add backend/prisma/seed/evaluations.ts
git commit -m "feat(seed): board-centered evaluation state matrix

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Rewrite `surveys.ts` — five surveys with realistic volume

**Files:**
- Modify (full rewrite): `backend/prisma/seed/surveys.ts`

**Interfaces:**
- Consumes: `SeededUsers` (`chro`, `coo`, `board`, `all`).
- Produces: `seedSurveys(prisma, users): Promise<SeededSurveys>` where
  `SeededSurveys = { survey1Id: string; survey2Id: string; survey2CurrentOccId: string; survey3Id: string }` (unchanged shape — `notifications.ts` depends on `survey2Id`).

**Data plan:**
1. **Q2 Engagement Check** — `ONE_TIME`, closed, non-anonymous, `SUPERVISOR_BASED`, creator CHRO. ~70% of active employees respond (index `i % 10 < 7`). 3 questions; one `SurveyResponse` + answers + `SurveyCompletion` each.
2. **Weekly Pulse** — `WEEKLY`, active, **anonymous**, `HR_ROOT_ONLY`, creator CHRO. Reminder DAILY. Occurrence 1 closed (40-person anonymous slice: `employeeId=null` + snapshots). Occurrence 2 open; 8 board members answer; `SurveyAudienceMember` snapshot for all active.
3. **Patient App Health** — `MONTHLY`, active, non-anonymous, `SPECIFIC_TEAMS`/`TEAM_BASED`, creator **COO Vn**, audience = the **Patient App** team. Open occurrence; ~8 team members respond; audience snapshot = all Patient App members.
4. **Onboarding Experience** — `ONE_TIME`, closed (inactive), **anonymous**, `HR_ROOT_ONLY` ("expired"), creator CHRO. One closed occurrence, ~20 anonymous responses.
5. **Research Pod Check-in** — `MONTHLY`, active, non-anonymous, `SPECIFIC_TEAMS`/`TEAM_BASED`, creator COO Vn, audience = **Research Pod** (2 people). Open occurrence; both members respond → <3 respondents (under-3 privacy demo). Audience snapshot = the 2 members.

Use the snapshot helper (read team memberships) and iterate real employee lists (this fixes the old `placeholders[]` bug). For team-targeted surveys, look up the team by name and read its `TeamMember`s for both responses and the audience snapshot.

- [ ] **Step 1: Rewrite `surveys.ts`**

```ts
// backend/prisma/seed/surveys.ts
import { PrismaClient, Employee } from '@prisma/client'
import { SeededUsers } from './users'

export type SeededSurveys = {
  survey1Id: string
  survey2Id: string
  survey2CurrentOccId: string
  survey3Id: string
}

export async function seedSurveys(prisma: PrismaClient, users: SeededUsers): Promise<SeededSurveys> {
  async function snapshot(emp: Employee) {
    const tms = await prisma.teamMember.findMany({ where: { employeeId: emp.id } })
    return { respondentSupervisorId: emp.supervisorId, respondentTeamIds: tms.map((t) => t.teamId) }
  }
  async function teamMemberEmployees(teamName: string): Promise<Employee[]> {
    const team = await prisma.team.findFirst({ where: { name: teamName } })
    if (!team) return []
    const tms = await prisma.teamMember.findMany({ where: { teamId: team.id }, include: { employee: true } })
    return tms.map((t) => t.employee)
  }
  const activeAll = users.all.filter((e) => e.status === 'ACTIVE')

  // ── Survey 1: Q2 Engagement Check — ONE_TIME, closed, non-anonymous ──
  const survey1 = await prisma.pulseSurvey.create({
    data: { createdBy: users.chro.id, name: 'Q2 Engagement Check', recurringType: 'ONE_TIME', audienceType: 'EVERYONE', isAnonymous: false, visibility: 'SUPERVISOR_BASED', isActive: false, releaseDate: new Date('2026-05-15'), deadline: new Date('2026-06-08') },
  })
  const s1q = await Promise.all([
    prisma.surveyQuestion.create({ data: { surveyId: survey1.id, type: 'LINEAR_SCALE', questionText: 'How satisfied are you with your current workload?', isRequired: true, scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Not satisfied', scaleMaxLabel: 'Very satisfied', orderIndex: 1 } }),
    prisma.surveyQuestion.create({ data: { surveyId: survey1.id, type: 'SHORT_ANSWER', questionText: "What's one thing we could improve as a team?", isRequired: true, orderIndex: 2 } }),
    prisma.surveyQuestion.create({ data: { surveyId: survey1.id, type: 'MULTIPLE_CHOICE', questionText: 'How would you rate overall team communication?', options: ['Poor', 'Fair', 'Good', 'Excellent'], isRequired: true, orderIndex: 3 } }),
  ])
  const s1Occ = await prisma.surveyOccurrence.create({ data: { surveyId: survey1.id, occurrenceNumber: 1, releaseDate: new Date('2026-05-15'), deadline: new Date('2026-06-08'), isClosed: true } })
  const scaleVals = [3, 4, 5, 4, 2]
  const comms = ['Fair', 'Good', 'Excellent', 'Good']
  for (let i = 0; i < activeAll.length; i++) {
    if (i % 10 >= 7) continue // ~70%
    const emp = activeAll[i]
    const resp = await prisma.surveyResponse.create({ data: { occurrenceId: s1Occ.id, employeeId: emp.id } })
    await prisma.surveyAnswer.create({ data: { responseId: resp.id, questionId: s1q[0].id, answerData: scaleVals[i % scaleVals.length] } })
    await prisma.surveyAnswer.create({ data: { responseId: resp.id, questionId: s1q[1].id, answerText: 'More async communication and clearer priorities.' } })
    await prisma.surveyAnswer.create({ data: { responseId: resp.id, questionId: s1q[2].id, answerData: comms[i % comms.length] } })
    await prisma.surveyCompletion.create({ data: { occurrenceId: s1Occ.id, employeeId: emp.id } })
  }

  // ── Survey 2: Weekly Pulse — WEEKLY, active, anonymous, HR_ROOT_ONLY ──
  const survey2 = await prisma.pulseSurvey.create({
    data: { createdBy: users.chro.id, name: 'Weekly Pulse', recurringType: 'WEEKLY', audienceType: 'EVERYONE', isAnonymous: true, visibility: 'HR_ROOT_ONLY', isActive: true, releaseDate: new Date('2026-06-01'), deadline: new Date('2026-06-22') },
  })
  await prisma.surveyReminderConfig.create({ data: { surveyId: survey2.id, frequency: 'DAILY' } })
  const s2q1 = await prisma.surveyQuestion.create({ data: { surveyId: survey2.id, type: 'LINEAR_SCALE', questionText: 'How would you rate your energy and focus this week?', isRequired: true, scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Drained', scaleMaxLabel: 'Energized', orderIndex: 1 } })
  const s2q2 = await prisma.surveyQuestion.create({ data: { surveyId: survey2.id, type: 'SHORT_ANSWER', questionText: 'Any blockers to flag anonymously?', isRequired: false, orderIndex: 2 } })
  const s2Past = await prisma.surveyOccurrence.create({ data: { surveyId: survey2.id, occurrenceNumber: 1, releaseDate: new Date('2026-06-01'), deadline: new Date('2026-06-07'), isClosed: true } })
  for (const emp of activeAll.slice(0, 40)) {
    const snap = await snapshot(emp)
    const resp = await prisma.surveyResponse.create({ data: { occurrenceId: s2Past.id, employeeId: null, ...snap } })
    await prisma.surveyAnswer.create({ data: { responseId: resp.id, questionId: s2q1.id, answerData: 4 } })
    await prisma.surveyAnswer.create({ data: { responseId: resp.id, questionId: s2q2.id, answerText: 'No major blockers.' } })
    await prisma.surveyCompletion.create({ data: { occurrenceId: s2Past.id, employeeId: emp.id } })
  }
  const s2Current = await prisma.surveyOccurrence.create({ data: { surveyId: survey2.id, occurrenceNumber: 2, releaseDate: new Date('2026-06-08'), deadline: new Date('2026-06-22'), isClosed: false } })
  for (const emp of users.board) {
    const snap = await snapshot(emp)
    const resp = await prisma.surveyResponse.create({ data: { occurrenceId: s2Current.id, employeeId: null, ...snap } })
    await prisma.surveyAnswer.create({ data: { responseId: resp.id, questionId: s2q1.id, answerData: 4 } })
    await prisma.surveyCompletion.create({ data: { occurrenceId: s2Current.id, employeeId: emp.id } })
  }
  for (const emp of activeAll) {
    await prisma.surveyAudienceMember.create({ data: { occurrenceId: s2Current.id, employeeId: emp.id } })
  }

  // ── Survey 3: Patient App Health — MONTHLY, active, non-anonymous, TEAM_BASED ──
  const survey3 = await prisma.pulseSurvey.create({
    data: { createdBy: users.coo.id, name: 'Patient App Health', recurringType: 'MONTHLY', audienceType: 'SPECIFIC_TEAMS', isAnonymous: false, visibility: 'TEAM_BASED', isActive: true, releaseDate: new Date('2026-06-01'), deadline: new Date('2026-06-30') },
  })
  const patientApp = await prisma.team.findFirst({ where: { name: 'Patient App' } })
  if (patientApp) await prisma.surveyAudienceConfig.create({ data: { surveyId: survey3.id, teamId: patientApp.id } })
  const s3q1 = await prisma.surveyQuestion.create({ data: { surveyId: survey3.id, type: 'LINEAR_SCALE', questionText: 'How aligned are we on our sprint goals?', isRequired: true, scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Misaligned', scaleMaxLabel: 'Fully aligned', orderIndex: 1 } })
  const s3Occ = await prisma.surveyOccurrence.create({ data: { surveyId: survey3.id, occurrenceNumber: 1, releaseDate: new Date('2026-06-01'), deadline: new Date('2026-06-30'), isClosed: false } })
  const paMembers = await teamMemberEmployees('Patient App')
  for (const emp of paMembers.slice(0, 8)) {
    const resp = await prisma.surveyResponse.create({ data: { occurrenceId: s3Occ.id, employeeId: emp.id } })
    await prisma.surveyAnswer.create({ data: { responseId: resp.id, questionId: s3q1.id, answerData: 4 } })
    await prisma.surveyCompletion.create({ data: { occurrenceId: s3Occ.id, employeeId: emp.id } })
  }
  for (const emp of paMembers) {
    await prisma.surveyAudienceMember.create({ data: { occurrenceId: s3Occ.id, employeeId: emp.id } })
  }

  // ── Survey 4: Onboarding Experience — ONE_TIME, closed (expired), anonymous ──
  const survey4 = await prisma.pulseSurvey.create({
    data: { createdBy: users.chro.id, name: 'Onboarding Experience', recurringType: 'ONE_TIME', audienceType: 'EVERYONE', isAnonymous: true, visibility: 'HR_ROOT_ONLY', isActive: false, releaseDate: new Date('2026-04-01'), deadline: new Date('2026-04-21') },
  })
  const s4q1 = await prisma.surveyQuestion.create({ data: { surveyId: survey4.id, type: 'LINEAR_SCALE', questionText: 'How smooth was your onboarding?', isRequired: true, scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Rough', scaleMaxLabel: 'Seamless', orderIndex: 1 } })
  const s4Occ = await prisma.surveyOccurrence.create({ data: { surveyId: survey4.id, occurrenceNumber: 1, releaseDate: new Date('2026-04-01'), deadline: new Date('2026-04-21'), isClosed: true } })
  for (const emp of activeAll.slice(40, 60)) {
    const snap = await snapshot(emp)
    const resp = await prisma.surveyResponse.create({ data: { occurrenceId: s4Occ.id, employeeId: null, ...snap } })
    await prisma.surveyAnswer.create({ data: { responseId: resp.id, questionId: s4q1.id, answerData: 4 } })
    await prisma.surveyCompletion.create({ data: { occurrenceId: s4Occ.id, employeeId: emp.id } })
  }

  // ── Survey 5: Research Pod Check-in — TEAM_BASED, 2 respondents (under-3 privacy demo) ──
  const survey5 = await prisma.pulseSurvey.create({
    data: { createdBy: users.coo.id, name: 'Research Pod Check-in', recurringType: 'MONTHLY', audienceType: 'SPECIFIC_TEAMS', isAnonymous: false, visibility: 'TEAM_BASED', isActive: true, releaseDate: new Date('2026-06-01'), deadline: new Date('2026-06-30') },
  })
  const researchPod = await prisma.team.findFirst({ where: { name: 'Research Pod' } })
  if (researchPod) await prisma.surveyAudienceConfig.create({ data: { surveyId: survey5.id, teamId: researchPod.id } })
  const s5q1 = await prisma.surveyQuestion.create({ data: { surveyId: survey5.id, type: 'LINEAR_SCALE', questionText: "How clear are this month's research priorities?", isRequired: true, scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Unclear', scaleMaxLabel: 'Very clear', orderIndex: 1 } })
  const s5Occ = await prisma.surveyOccurrence.create({ data: { surveyId: survey5.id, occurrenceNumber: 1, releaseDate: new Date('2026-06-01'), deadline: new Date('2026-06-30'), isClosed: false } })
  const rpMembers = await teamMemberEmployees('Research Pod')
  for (const emp of rpMembers) {
    const resp = await prisma.surveyResponse.create({ data: { occurrenceId: s5Occ.id, employeeId: emp.id } })
    await prisma.surveyAnswer.create({ data: { responseId: resp.id, questionId: s5q1.id, answerData: 4 } })
    await prisma.surveyCompletion.create({ data: { occurrenceId: s5Occ.id, employeeId: emp.id } })
  }
  for (const emp of rpMembers) {
    await prisma.surveyAudienceMember.create({ data: { occurrenceId: s5Occ.id, employeeId: emp.id } })
  }

  return { survey1Id: survey1.id, survey2Id: survey2.id, survey2CurrentOccId: s2Current.id, survey3Id: survey3.id }
}
```

- [ ] **Step 2: Type-check**

Run: `cd backend && npx tsc -p tsconfig.seed.json`
Expected: `surveys.ts` clean; only `notifications.ts` may still error (old handles).

- [ ] **Step 3: Commit**

```bash
git add backend/prisma/seed/surveys.ts
git commit -m "feat(seed): five pulse surveys incl. under-3 privacy demo

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Update `notifications.ts` to the new `SeededUsers`

**Files:**
- Modify: `backend/prisma/seed/notifications.ts`

**Interfaces:**
- Consumes: `users.all`, `surveys.survey2Id`, `evaluations.pendingAck`.

- [ ] **Step 1: Replace the destructure + active-audience lines**

```ts
// was: const { kurt, loreto, vn, theaV, darben, theaS, asha, ximen, staff } = users
//      const activeAudience = [kurt, loreto, vn, theaV, darben, theaS, asha, ximen, ...staff].filter(...)
const activeAudience = users.all.filter((e) => e.status === 'ACTIVE')
```

The rest of the file (the `for (const ack of evaluations.pendingAck)` loop and notification bodies) is unchanged.

- [ ] **Step 2: Type-check the whole seed**

Run: `cd backend && npx tsc -p tsconfig.seed.json`
Expected: PASS — zero errors across all seed files.

- [ ] **Step 3: Commit**

```bash
git add backend/prisma/seed/notifications.ts
git commit -m "chore(seed): adapt notifications to board SeededUsers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Run the full seed and verify against the local DB

**Files:** none (verification task).

- [ ] **Step 1: Ensure the local DB is running and migrated**

Run:
```bash
docker start launchpad-pg
cd backend && npx prisma migrate deploy
```
Expected: container up; migrations applied (or "No pending migrations").

- [ ] **Step 2: Run the seed**

Run: `cd backend && npm run db:seed`
Expected: logs through "Seed complete." with no error; exit 0.

- [ ] **Step 3: Run the assertion checks**

Run: `cd backend && npx ts-node --project tsconfig.seed.json --transpile-only prisma/seed/checks.ts`
Expected: `SEED CHECK PASSED ✔` (300 users/employees, 22 depts, 9 teams, 1 root, every dept headcount exact, every team membership count exact + leader is a member, Research Pod = 2, 8 real accounts in Executive Leadership).

- [ ] **Step 4: Verify determinism (re-seed → identical names/emails)**

Run:
```bash
cd backend && psql "$DIRECT_URL" -t -c "select md5(string_agg(\"companyEmail\", ',' order by \"companyEmail\")) from employees;" > /tmp/seed-hash-1.txt
npm run db:seed >/dev/null
psql "$DIRECT_URL" -t -c "select md5(string_agg(\"companyEmail\", ',' order by \"companyEmail\")) from employees;" > /tmp/seed-hash-2.txt
diff /tmp/seed-hash-1.txt /tmp/seed-hash-2.txt && echo "DETERMINISTIC ✔"
```
Expected: `DETERMINISTIC ✔`. If `psql` is unavailable, instead re-run `checks.ts` after a second seed and confirm it still passes.

- [ ] **Step 5: Run the full backend test suite (no regressions)**

Run: `cd backend && npm test`
Expected: PASS, including the new `src/tests/seed/*.test.ts`.

- [ ] **Step 6: Commit any verification fixups** (only if Steps 2–5 surfaced fixes)

```bash
git add -A
git commit -m "fix(seed): <specific fix from verification>

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review (completed during planning)

**Spec coverage:**
- 22 leaf departments + counts → Tasks 2, 3 + `checks.ts`.
- Reporting tree (CEO → exec → group head → dept lead → IC) → Task 3 + `checks.ts` (1 root).
- 8 real accounts as board in Executive Leadership, exact emails/roles, two renames → Task 3 + `checks.ts`.
- 292 deterministic Filipino-named generated employees + email rule → Tasks 1, 3.
- 9 cross-functional teams, overlapping membership, leader-is-member → Tasks 2, 4 + `checks.ts`.
- Evaluation state matrix centered on board, reviewer = supervisor → Task 6.
- Five survey variants incl. company-wide ~70%, anonymous, and Research Pod under-3 privacy → Task 7.
- Consumers kept compiling → Tasks 5, 8.
- Bug fixes (`supportingDocUrl` → `supportingDocUrls`; `placeholders[]`) → Tasks 6, 7.
- Determinism + counts + login emails → Task 9.

**Placeholder scan:** Task 1's `…` is the explicit name-array paste (controller provides the data file). No TODO/TBD.

**Type consistency:** `SeededUsers` (Task 3: `ceo/cto/cio/cpo/coo/chro/cfo/cgo`, `board`, `all`, `generated`, `byDept`, `deptLead`, `onboardingSample`, `offboardingSample`) is consumed with matching names in Tasks 4–8. `SeededEvaluations.pendingAck` and `SeededSurveys.survey2Id` keep their original shapes for `notifications.ts`.
