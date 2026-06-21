# 300-Employee Realistic Seed Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the Prisma seeders in `backend/prisma/seed/` to produce a realistic 300-employee company — 10 departments, 21 teams, a reporting tree rooted at the CEO, Filipino-named generated employees, with the 8 real (login-capable) accounts as the executive board and surveys/evaluations centered on them.

**Architecture:** Two new pure-logic modules (`names.ts` for deterministic name/email generation, `org-structure.ts` for the declarative dept/team table) feed a rewritten `users.ts` that creates departments, the 8 real board accounts, and 292 generated employees wired into a 4-level reporting tree. `teams.ts`, `evaluations.ts`, `surveys.ts` and the three consumer files are rewritten/updated against an expanded `SeededUsers` contract. Pure logic is unit-tested with Jest; DB-effecting seeders are verified by running the seed plus an assertion script.

**Tech Stack:** TypeScript, Prisma 7 (`@prisma/client`), `PrismaPg` adapter (interactive transactions), ts-node, Jest + ts-jest, local Docker Postgres (`launchpad-pg`, `localhost:5432`).

## Global Constraints

- Seed entrypoint is `prisma/seed/index.ts`, run via `npm run db:seed` (wired in `prisma.config.ts`). Seeding uses `PrismaPg` (NOT the Neon HTTP adapter — it has no interactive transactions).
- Create order is always `User` first, then `Employee` (FK `Employee.userId` is required + unique).
- `Employee.supervisorId` is self-referential and nullable; a reviewee's `supervisorId` MUST equal the reviewer's id for every evaluation (app rule — enforce it in seed data even though the DB doesn't).
- `Role` enum = `ADMIN | HR | EMPLOYEE` only. "Supervisor" is derived from having direct reports — never set it as a role.
- `EmployeeStatus` enum = `ONBOARDING | ACTIVE | OFFBOARDING | INACTIVE`.
- `PerformanceEvaluation.supportingDocUrls` is `String[]` (array) — never `supportingDocUrl`.
- `PerformanceEvaluation.grade` is an `Int` 1–5. `ackDeadline = sentAt + 7 days`.
- Anonymous survey responses set `SurveyResponse.employeeId = null` but still populate `respondentSupervisorId` + `respondentTeamIds` snapshots; `SurveyCompletion` is always written with the real `employeeId`.
- The 8 real accounts keep their exact existing login emails and `companyEmail` and roles. Only two display names change: Kurt Ds → **Rafael Bautista**, Ximen Galang → **Angelo Galang**.
- Generated emails: `firstname.lastname@dgtechnologies.com`, slugified + deduped.
- Generation is **deterministic** (seeded PRNG, fixed seed) so re-seeding is stable.
- Total must be exactly **300 employees / 300 users**, **10 departments**, **21 teams**.
- Tests live under `backend/src/` (Jest `roots: ["<rootDir>/src"]`); seed modules are imported into those tests by relative path. Type-check the seed with `npx tsc -p tsconfig.seed.json`.
- Commit messages end with the repo's Co-Authored-By trailer:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

## Org reference data (single source of truth)

Departments (HC) and their teams (HC). Sub-team HCs sum to the department HC.

| Department | HC | Teams |
|---|---|---|
| Engineering | 132 | Frontend 32 · Backend 38 · Mobile 22 · QA 22 · Platform & Architecture 18 |
| Product | 20 | Product Management 13 · Business Analysis 7 |
| Design | 16 | UX Design 11 · UX Research 5 |
| Customer Support | 38 | Technical Support 24 · Customer Success 14 |
| Operations | 16 | Business Operations 10 · Facilities & Admin 6 |
| Growth | 28 | Sales 18 · Marketing 10 |
| People | 16 | Recruitment 6 · HR Operations 7 · Learning & Development 3 |
| Finance | 14 | Accounting 9 · Billing & Collections 5 |
| IT | 10 | (none) |
| Executive | 10 | (none) |

Board (Executive dept, all 8 real + 2 generated):

| Login email | Display name | Title | Role | Owns |
|---|---|---|---|---|
| allenkurtds.dev@gmail.com | Rafael Bautista | CEO (root) | EMPLOYEE | — |
| loretorussellkelvinanthony@gmail.com | Loreto Russell | CTO | ADMIN | Engineering |
| ashasce@gmail.com | Asha Ce | CIO | ADMIN | IT |
| theaverah@gmail.com | Thea Verah | CPO | EMPLOYEE | Product, Design |
| vnferrer.work@gmail.com | Vn Ferrer | COO | EMPLOYEE | Operations, Customer Support |
| darbenlamonte@gmail.com | Darben Lamonte | CHRO | HR | People |
| thea_sumagang@dlsu.edu.ph | Thea Sumagang | CFO | HR | Finance |
| ximen91101@gmail.com | Angelo Galang | CGO | EMPLOYEE | Growth |

Plus 2 generated Executive members (Chief of Staff, Executive Assistant) reporting to the CEO.

Reporting: CEO is root; the 7 other board members + 2 support report to the CEO. Each owned department's **primary team lead** (the first team listed for that dept) reports to the owning board member; that dept's other team leads report to the primary lead; ICs report to their own team lead. IT (team-less): a generated IT Manager reports to the CIO; the 8 IT ICs report to the IT Manager.

---

### Task 1: Name & email generation (`names.ts`)

**Files:**
- Create: `backend/prisma/seed/names.ts`
- Test: `backend/src/tests/seed/names.test.ts`

**Interfaces:**
- Produces:
  - `mulberry32(seed: number): () => number` — deterministic PRNG in [0,1).
  - `slugifyEmailLocal(firstName: string, lastName: string): string` — e.g. `("Ma. Theresa","Dela Cruz") => "theresa.delacruz"`.
  - `createPeopleGenerator(seed?: number): () => { firstName: string; lastName: string; email: string }` — each call returns a unique-email person; `email` is `${slug}@dgtechnologies.com` with `.2`, `.3`… on collision.
  - `FIRST_NAMES: string[]`, `LAST_NAMES: string[]`.

- [ ] **Step 1: Write the failing test**

```ts
// backend/src/tests/seed/names.test.ts
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
    const a = [g1(), g1(), g1()]
    const b = [g2(), g2(), g2()]
    expect(a).toEqual(b)
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

// Filipino first names (paste the full array provided in the spec discussion).
export const FIRST_NAMES: string[] = [
  'John Michael', 'Mary Grace', 'Mark Anthony', 'Maria Cristina', 'Christian Jay',
  // … paste the COMPLETE commonFirstNames array from the user's message here …
  'Virginia', 'William', 'Zion', 'Ariel', 'Beatriz', 'Claudio',
]

// Filipino last names (paste the full array provided in the spec discussion).
export const LAST_NAMES: string[] = [
  'Dela Cruz', 'Delos Santos', 'De Guzman', 'Del Rosario', 'De Leon',
  // … paste the COMPLETE commonLastNames array from the user's message here …
  'Tagle', 'Tanjuatco', 'Tarlac', 'Teodoro',
]

const HONORIFIC = /^(ma|sta|sto)\.?$/i

/** Deterministic PRNG in [0,1). Same seed → same sequence. */
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

/** First meaningful token of the first name + last name, slugified. */
export function slugifyEmailLocal(firstName: string, lastName: string): string {
  const firstToken =
    firstName.split(/\s+/).find((tok) => !HONORIFIC.test(tok)) ?? firstName
  const first = firstToken.toLowerCase().replace(/[^a-z0-9]/g, '')
  const last = lastName.toLowerCase().replace(/[^a-z0-9]/g, '')
  return `${first}.${last}`
}

/**
 * Returns a generator yielding people with unique @dgtechnologies.com emails.
 * Deterministic for a fixed seed.
 */
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

> NOTE for the implementer: copy the **complete** `commonFirstNames` and `commonLastNames`
> arrays verbatim from the spec discussion / user message into `FIRST_NAMES` and `LAST_NAMES`.
> The abbreviated `…` above is a placeholder for the full lists only — do not ship the ellipsis.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && npx jest src/tests/seed/names.test.ts`
Expected: PASS (all cases).

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
  - `type TeamSpec = { name: string; headcount: number }`
  - `type DeptSpec = { name: string; headcount: number; teams: TeamSpec[] }`
  - `ORG: DeptSpec[]` — the 10 departments above, teams in listed order (first team = primary).
  - `DEPT_OWNER: Record<string, string>` — department name → owning board title (`'CTO'`, `'CIO'`, `'CPO'`, `'COO'`, `'CHRO'`, `'CFO'`, `'CGO'`). Executive is not a key.
  - `totalHeadcount(): number`
  - `validateOrg(): void` — throws if total ≠ 300 or any dept with teams whose team HCs ≠ dept HC.

- [ ] **Step 1: Write the failing test**

```ts
// backend/src/tests/seed/org-structure.test.ts
import { ORG, DEPT_OWNER, totalHeadcount, validateOrg } from '../../../prisma/seed/org-structure'

describe('org structure', () => {
  it('totals 300 employees', () => {
    expect(totalHeadcount()).toBe(300)
  })
  it('every department with teams has team HCs summing to the department HC', () => {
    for (const dept of ORG) {
      if (dept.teams.length === 0) continue
      const sum = dept.teams.reduce((n, t) => n + t.headcount, 0)
      expect(sum).toBe(dept.headcount)
    }
  })
  it('has exactly 10 departments and 21 teams', () => {
    expect(ORG.length).toBe(10)
    expect(ORG.reduce((n, d) => n + d.teams.length, 0)).toBe(21)
  })
  it('maps every owned (non-Executive) department to a board title', () => {
    for (const dept of ORG) {
      if (dept.name === 'Executive') continue
      expect(DEPT_OWNER[dept.name]).toBeTruthy()
    }
  })
  it('validateOrg does not throw', () => {
    expect(() => validateOrg()).not.toThrow()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && npx jest src/tests/seed/org-structure.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `org-structure.ts`**

```ts
// backend/prisma/seed/org-structure.ts

export type TeamSpec = { name: string; headcount: number }
export type DeptSpec = { name: string; headcount: number; teams: TeamSpec[] }

// Teams are listed primary-first: the first team's lead doubles as department head.
export const ORG: DeptSpec[] = [
  {
    name: 'Engineering',
    headcount: 132,
    teams: [
      { name: 'Frontend', headcount: 32 },
      { name: 'Backend', headcount: 38 },
      { name: 'Mobile', headcount: 22 },
      { name: 'QA', headcount: 22 },
      { name: 'Platform & Architecture', headcount: 18 },
    ],
  },
  {
    name: 'Product',
    headcount: 20,
    teams: [
      { name: 'Product Management', headcount: 13 },
      { name: 'Business Analysis', headcount: 7 },
    ],
  },
  {
    name: 'Design',
    headcount: 16,
    teams: [
      { name: 'UX Design', headcount: 11 },
      { name: 'UX Research', headcount: 5 },
    ],
  },
  {
    name: 'Customer Support',
    headcount: 38,
    teams: [
      { name: 'Technical Support', headcount: 24 },
      { name: 'Customer Success', headcount: 14 },
    ],
  },
  {
    name: 'Operations',
    headcount: 16,
    teams: [
      { name: 'Business Operations', headcount: 10 },
      { name: 'Facilities & Admin', headcount: 6 },
    ],
  },
  {
    name: 'Growth',
    headcount: 28,
    teams: [
      { name: 'Sales', headcount: 18 },
      { name: 'Marketing', headcount: 10 },
    ],
  },
  {
    name: 'People',
    headcount: 16,
    teams: [
      { name: 'Recruitment', headcount: 6 },
      { name: 'HR Operations', headcount: 7 },
      { name: 'Learning & Development', headcount: 3 },
    ],
  },
  {
    name: 'Finance',
    headcount: 14,
    teams: [
      { name: 'Accounting', headcount: 9 },
      { name: 'Billing & Collections', headcount: 5 },
    ],
  },
  { name: 'IT', headcount: 10, teams: [] },
  { name: 'Executive', headcount: 10, teams: [] },
]

// Department → owning board title. Executive has no owner (its members ARE the board).
export const DEPT_OWNER: Record<string, string> = {
  Engineering: 'CTO',
  IT: 'CIO',
  Product: 'CPO',
  Design: 'CPO',
  Operations: 'COO',
  'Customer Support': 'COO',
  People: 'CHRO',
  Finance: 'CFO',
  Growth: 'CGO',
}

export function totalHeadcount(): number {
  return ORG.reduce((n, d) => n + d.headcount, 0)
}

export function validateOrg(): void {
  if (totalHeadcount() !== 300) {
    throw new Error(`Org total headcount is ${totalHeadcount()}, expected 300`)
  }
  for (const dept of ORG) {
    if (dept.teams.length === 0) continue
    const sum = dept.teams.reduce((n, t) => n + t.headcount, 0)
    if (sum !== dept.headcount) {
      throw new Error(`${dept.name} teams sum to ${sum}, expected ${dept.headcount}`)
    }
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && npx jest src/tests/seed/org-structure.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/seed/org-structure.ts backend/src/tests/seed/org-structure.test.ts
git commit -m "feat(seed): declarative org structure (10 depts, 21 teams)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Rewrite `users.ts` — departments, board, generated employees

**Files:**
- Modify (full rewrite): `backend/prisma/seed/users.ts`

**Interfaces:**
- Consumes: `createPeopleGenerator` (Task 1); `ORG`, `DEPT_OWNER`, `validateOrg` (Task 2).
- Produces:

```ts
export type SeededUsers = {
  // real, login-capable board accounts (handle = stable code identifier)
  ceo: Employee        // Rafael Bautista (root)
  cto: Employee        // Loreto Russell
  cio: Employee        // Asha Ce
  cpo: Employee        // Thea Verah
  coo: Employee        // Vn Ferrer
  chro: Employee       // Darben Lamonte
  cfo: Employee        // Thea Sumagang
  cgo: Employee        // Angelo Galang
  board: Employee[]    // the 8 above, CEO first

  all: Employee[]                        // all 300
  generated: Employee[]                  // the 292
  byDept: Record<string, Employee[]>     // dept name → members (incl. board owner is NOT a member; see note)
  byTeam: Record<string, Employee[]>     // team name → members incl. lead
  teamLead: Record<string, Employee>     // team name → lead employee
  onboardingSample: Employee             // a generated ONBOARDING employee
  offboardingSample: Employee            // a generated OFFBOARDING employee
}

export async function seedUsers(prisma: PrismaClient): Promise<SeededUsers>
```

> Note: `byDept[deptName]` holds the employees whose `departmentId` is that department (the 9
> non-Exec departments are fully generated; Executive holds the 10 board+support). Board members
> own departments but are themselves in the Executive department.

**Implementation notes (algorithm):**
1. `validateOrg()` first (fail fast).
2. Create the 10 departments; keep `deptId[name]`.
3. Create the CEO (Rafael Bautista), then the 7 other board accounts (each `supervisorId = ceo.id`), all in the Executive department, using the exact emails/roles from the board table. Two display names are new (Rafael Bautista, Angelo Galang); the rest keep current names.
4. Create the 2 generated Executive support roles (Chief of Staff, Executive Assistant), `supervisorId = ceo.id`, Executive dept.
5. For each owned department, resolve the owning board member via `DEPT_OWNER` (a title→board map). Build it tier by tier so supervisors exist before reports:
   - **Primary team** (first in `dept.teams`): create its lead (generated) with `supervisorId = owner.id`, then its ICs with `supervisorId = lead.id`.
   - **Other teams**: create each lead with `supervisorId = primaryLead.id`, then ICs with `supervisorId = thatLead.id`.
   - Fill each team to its exact `headcount` (lead counts as 1).
6. **IT** (team-less, owner CIO Asha): create an IT Manager (generated, `supervisorId = cio.id`); fill the remaining 9 (IT HC 10 − manager) as ICs with `supervisorId = itManager.id`. (Asha herself is the board owner in Executive, not an IT-dept member — IT's 10 are all generated.)
7. Tag a few generated employees with non-ACTIVE statuses: pick the first generated IC in `Recruitment` as `onboardingSample` (status `ONBOARDING`), the first in `Customer Success` as `offboardingSample` (status `OFFBOARDING`), and set one Backend IC `INACTIVE`. Everyone else `ACTIVE`. Board members are `ACTIVE`.
8. Assemble and return `SeededUsers`.

- [ ] **Step 1: Write the seed-assertion check script (the "test")**

Create `backend/prisma/seed/checks.ts` — a standalone verifier run after seeding. It is part of the deliverable but is NOT imported by `index.ts`.

```ts
// backend/prisma/seed/checks.ts
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { ORG } from './org-structure'

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
  eq('departments', await prisma.department.count(), 10)
  eq('teams', await prisma.team.count(), 21)

  // exactly one root (CEO), no other null supervisors
  const roots = await prisma.employee.count({ where: { supervisorId: null } })
  eq('root employees (supervisorId null)', roots, 1)

  // per-department headcounts
  for (const dept of ORG) {
    const d = await prisma.department.findUnique({ where: { name: dept.name } })
    if (!d) { errors.push(`missing department ${dept.name}`); continue }
    const c = await prisma.employee.count({ where: { departmentId: d.id } })
    eq(`dept ${dept.name} headcount`, c, dept.headcount)
  }

  // per-team membership counts
  for (const dept of ORG) {
    for (const t of dept.teams) {
      const team = await prisma.team.findFirst({ where: { name: t.name } })
      if (!team) { errors.push(`missing team ${t.name}`); continue }
      const c = await prisma.teamMember.count({ where: { teamId: team.id } })
      eq(`team ${t.name} members`, c, t.headcount)
    }
  }

  // the 8 real accounts exist with their exact login emails and are in Executive
  const exec = await prisma.department.findUnique({ where: { name: 'Executive' } })
  const realEmails = [
    'allenkurtds.dev@gmail.com', 'loretorussellkelvinanthony@gmail.com',
    'ashasce@gmail.com', 'theaverah@gmail.com', 'vnferrer.work@gmail.com',
    'darbenlamonte@gmail.com', 'thea_sumagang@dlsu.edu.ph', 'ximen91101@gmail.com',
  ]
  for (const email of realEmails) {
    const u = await prisma.user.findUnique({ where: { email }, include: { employee: true } })
    if (!u || !u.employee) { errors.push(`missing real account ${email}`); continue }
    if (u.employee.departmentId !== exec?.id) errors.push(`${email} not in Executive`)
  }

  // determinism + reachability is covered by re-run; report results
  if (errors.length) {
    console.error('SEED CHECK FAILED:\n' + errors.join('\n'))
    process.exit(1)
  }
  console.log('SEED CHECK PASSED ✔')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Rewrite `users.ts`**

Replace the entire file. Use this structure (helpers + tiered creation). Fill team ICs via a single `fillTeam` helper so headcounts come straight from `ORG`.

```ts
// backend/prisma/seed/users.ts
import { PrismaClient, Employee, EmployeeStatus, Role } from '@prisma/client'
import { ORG, DEPT_OWNER, validateOrg } from './org-structure'
import { createPeopleGenerator } from './names'

export type SeededUsers = {
  ceo: Employee; cto: Employee; cio: Employee; cpo: Employee
  coo: Employee; chro: Employee; cfo: Employee; cgo: Employee
  board: Employee[]
  all: Employee[]
  generated: Employee[]
  byDept: Record<string, Employee[]>
  byTeam: Record<string, Employee[]>
  teamLead: Record<string, Employee>
  onboardingSample: Employee
  offboardingSample: Employee
}

const nextPerson = createPeopleGenerator(20260621) // fixed seed → deterministic

const PROVINCE = 'Metro Manila'
const COUNTRY = 'Philippines'

async function createEmployee(
  prisma: PrismaClient,
  opts: {
    email: string
    companyEmail?: string
    firstName: string
    lastName: string
    jobTitle: string
    role?: Role
    departmentId: string
    supervisorId?: string
    status?: EmployeeStatus
  },
): Promise<Employee> {
  const user = await prisma.user.create({
    data: { email: opts.email, role: opts.role ?? 'EMPLOYEE' },
  })
  return prisma.employee.create({
    data: {
      user: { connect: { id: user.id } },
      companyEmail: opts.companyEmail ?? opts.email,
      firstName: opts.firstName,
      lastName: opts.lastName,
      jobTitle: opts.jobTitle,
      department: { connect: { id: opts.departmentId } },
      ...(opts.supervisorId ? { supervisor: { connect: { id: opts.supervisorId } } } : {}),
      status: opts.status ?? 'ACTIVE',
      address: {
        create: { address: 'DG Technologies HQ', city: 'Makati', province: PROVINCE, country: COUNTRY },
      },
      emergencyContact: {
        create: { emergencyContactName: 'Emergency Contact', emergencyContactNumber: '+63 917 000 0000' },
      },
    },
  })
}

// Seniority-aware title for a generated IC/lead given a team and whether they lead it.
function titleFor(team: string, isLead: boolean, rng: () => number): string {
  if (isLead) return `${team} Lead`
  const tiers = ['Senior ', '', 'Junior ', 'Associate ']
  const tier = tiers[Math.floor(rng() * tiers.length)]
  return `${tier}${team} Specialist`.replace(/\s+/g, ' ').trim()
}

export async function seedUsers(prisma: PrismaClient): Promise<SeededUsers> {
  validateOrg()
  const localRng = (() => { let s = 99; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff } })()

  // 1. Departments
  const deptId: Record<string, string> = {}
  for (const d of ORG) {
    const row = await prisma.department.create({ data: { name: d.name } })
    deptId[d.name] = row.id
  }
  const exec = deptId['Executive']

  const all: Employee[] = []
  const generated: Employee[] = []
  const byDept: Record<string, Employee[]> = {}
  const byTeam: Record<string, Employee[]> = {}
  const teamLead: Record<string, Employee> = {}
  for (const d of ORG) byDept[d.name] = []
  const track = (e: Employee, dept: string, isGenerated: boolean) => {
    all.push(e); byDept[dept].push(e); if (isGenerated) generated.push(e)
  }

  // 2. Board (real accounts). CEO first (root).
  const ceo = await createEmployee(prisma, { email: 'allenkurtds.dev@gmail.com', firstName: 'Rafael', lastName: 'Bautista', jobTitle: 'CEO', role: 'EMPLOYEE', departmentId: exec })
  track(ceo, 'Executive', false)

  const board: Array<{ key: string; email: string; firstName: string; lastName: string; title: string; role: Role }> = [
    { key: 'cto', email: 'loretorussellkelvinanthony@gmail.com', firstName: 'Loreto', lastName: 'Russell', title: 'CTO', role: 'ADMIN' },
    { key: 'cio', email: 'ashasce@gmail.com', firstName: 'Asha', lastName: 'Ce', title: 'CIO', role: 'ADMIN' },
    { key: 'cpo', email: 'theaverah@gmail.com', firstName: 'Thea', lastName: 'Verah', title: 'CPO', role: 'EMPLOYEE' },
    { key: 'coo', email: 'vnferrer.work@gmail.com', firstName: 'Vn', lastName: 'Ferrer', title: 'COO', role: 'EMPLOYEE' },
    { key: 'chro', email: 'darbenlamonte@gmail.com', firstName: 'Darben', lastName: 'Lamonte', title: 'CHRO', role: 'HR' },
    { key: 'cfo', email: 'thea_sumagang@dlsu.edu.ph', firstName: 'Thea', lastName: 'Sumagang', title: 'CFO', role: 'HR' },
    { key: 'cgo', email: 'ximen91101@gmail.com', firstName: 'Angelo', lastName: 'Galang', title: 'CGO', role: 'EMPLOYEE' },
  ]
  const byTitle: Record<string, Employee> = {}
  for (const b of board) {
    const e = await createEmployee(prisma, { email: b.email, firstName: b.firstName, lastName: b.lastName, jobTitle: b.title, role: b.role, departmentId: exec, supervisorId: ceo.id })
    byTitle[b.title] = e
    track(e, 'Executive', false)
  }

  // 3. Two generated Executive support roles → CEO
  for (const title of ['Chief of Staff', 'Executive Assistant']) {
    const p = nextPerson()
    const e = await createEmployee(prisma, { email: p.email, firstName: p.firstName, lastName: p.lastName, jobTitle: title, departmentId: exec, supervisorId: ceo.id })
    track(e, 'Executive', true)
  }

  // helper: create N ICs for a team under a given supervisor
  const fillTeamICs = async (deptName: string, teamName: string, count: number, supervisorId: string) => {
    for (let i = 0; i < count; i++) {
      const p = nextPerson()
      const e = await createEmployee(prisma, { email: p.email, firstName: p.firstName, lastName: p.lastName, jobTitle: titleFor(teamName, false, localRng), departmentId: deptId[deptName], supervisorId })
      byTeam[teamName].push(e); track(e, deptName, true)
    }
  }

  // 4. Owned departments (the 9 non-Executive)
  for (const dept of ORG) {
    if (dept.name === 'Executive') continue
    if (dept.teams.length === 0) continue // IT handled separately
    const owner = byTitle[DEPT_OWNER[dept.name]]
    let primaryLead: Employee | null = null
    for (let ti = 0; ti < dept.teams.length; ti++) {
      const t = dept.teams[ti]
      byTeam[t.name] = byTeam[t.name] ?? []
      const isPrimary = ti === 0
      const p = nextPerson()
      const lead = await createEmployee(prisma, {
        email: p.email, firstName: p.firstName, lastName: p.lastName,
        jobTitle: titleFor(t.name, true, localRng),
        departmentId: deptId[dept.name],
        supervisorId: isPrimary ? owner.id : (primaryLead as Employee).id,
      })
      byTeam[t.name].push(lead); teamLead[t.name] = lead; track(lead, dept.name, true)
      if (isPrimary) primaryLead = lead
      await fillTeamICs(dept.name, t.name, t.headcount - 1, lead.id)
    }
  }

  // 5. IT (team-less): IT Manager → CIO, ICs → IT Manager
  {
    const cio = byTitle['CIO']
    const m = nextPerson()
    const itManager = await createEmployee(prisma, { email: m.email, firstName: m.firstName, lastName: m.lastName, jobTitle: 'IT Manager', departmentId: deptId['IT'], supervisorId: cio.id })
    track(itManager, 'IT', true)
    const itHc = ORG.find((d) => d.name === 'IT')!.headcount
    for (let i = 0; i < itHc - 1; i++) {
      const p = nextPerson()
      const e = await createEmployee(prisma, { email: p.email, firstName: p.firstName, lastName: p.lastName, jobTitle: 'IT Support Specialist', departmentId: deptId['IT'], supervisorId: itManager.id })
      track(e, 'IT', true)
    }
  }

  // 6. Status samples (must be generated employees)
  const onboardingSample = byTeam['Recruitment'][1] // first IC after the lead
  const offboardingSample = byTeam['Customer Success'][1]
  const inactive = byTeam['Backend'][1]
  await prisma.employee.update({ where: { id: onboardingSample.id }, data: { status: 'ONBOARDING' } })
  await prisma.employee.update({ where: { id: offboardingSample.id }, data: { status: 'OFFBOARDING' } })
  await prisma.employee.update({ where: { id: inactive.id }, data: { status: 'INACTIVE' } })
  onboardingSample.status = 'ONBOARDING'
  offboardingSample.status = 'OFFBOARDING'

  return {
    ceo,
    cto: byTitle['CTO'], cio: byTitle['CIO'], cpo: byTitle['CPO'], coo: byTitle['COO'],
    chro: byTitle['CHRO'], cfo: byTitle['CFO'], cgo: byTitle['CGO'],
    board: [ceo, byTitle['CTO'], byTitle['CIO'], byTitle['CPO'], byTitle['COO'], byTitle['CHRO'], byTitle['CFO'], byTitle['CGO']],
    all, generated, byDept, byTeam, teamLead, onboardingSample, offboardingSample,
  }
}
```

> The `prisma.employee.update` calls here run inside the seed (PrismaPg adapter) where interactive
> transactions are supported, so `update` is fine (unlike the Neon HTTP note in `index.ts`).

- [ ] **Step 3: Type-check the seed**

Run: `cd backend && npx tsc -p tsconfig.seed.json`
Expected: errors only in `teams.ts`/`evaluations.ts`/`surveys.ts`/`onboarding.ts`/`offboarding.ts`/`notifications.ts` that still reference the OLD `SeededUsers` shape (those are fixed in later tasks). `users.ts`, `names.ts`, `org-structure.ts` must type-check clean.

> Because `index.ts` imports the other seeders, a full seed run will not work until Tasks 4–8
> land. Verification of `users.ts` in isolation is the `tsc` check above plus the Jest tests from
> Tasks 1–2. The DB-level `checks.ts` runs in Task 9 after the full pipeline compiles.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/seed/users.ts backend/prisma/seed/checks.ts
git commit -m "feat(seed): rewrite users.ts for 300-employee board-led org

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Rewrite `teams.ts` — 21 teams + memberships

**Files:**
- Modify (full rewrite): `backend/prisma/seed/teams.ts`

**Interfaces:**
- Consumes: `SeededUsers.byTeam`, `SeededUsers.teamLead` (Task 3); `ORG` (Task 2).
- Produces: `seedTeams(prisma, users): Promise<void>` — creates one `Team` per team in `ORG` (21 total) with `leaderId = teamLead[name].id`, and a `TeamMember` row for every employee in `byTeam[name]`.

- [ ] **Step 1: Rewrite `teams.ts`**

```ts
// backend/prisma/seed/teams.ts
import { PrismaClient } from '@prisma/client'
import { SeededUsers } from './users'
import { ORG } from './org-structure'

export async function seedTeams(prisma: PrismaClient, users: SeededUsers): Promise<void> {
  for (const dept of ORG) {
    for (const t of dept.teams) {
      const lead = users.teamLead[t.name]
      const members = users.byTeam[t.name] ?? []
      const team = await prisma.team.create({ data: { name: t.name, leaderId: lead.id } })
      for (const emp of members) {
        await prisma.teamMember.create({ data: { teamId: team.id, employeeId: emp.id } })
      }
    }
  }
}
```

- [ ] **Step 2: Type-check**

Run: `cd backend && npx tsc -p tsconfig.seed.json`
Expected: `teams.ts` no longer errors; remaining errors only in evaluations/surveys/onboarding/offboarding/notifications.

- [ ] **Step 3: Commit**

```bash
git add backend/prisma/seed/teams.ts
git commit -m "feat(seed): create 21 teams with leads and memberships

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

Change only the references that used the old shape. Replace line 5 and the HR reviewer reference:

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
```ts
// signatories / requests: replace users.kurt → users.ceo, users.theaV → users.coo,
// users.darben → users.chro  (the offboarded employee is in Customer Support, owned by COO Vn)
```
Concretely: every `users.kurt` → `users.ceo`; every `users.theaV` → `users.coo`; every `users.darben` → `users.chro`.

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
- Consumes: `SeededUsers` (`ceo`, `cto`, `cio`, `cpo`, `coo`, `chro`, `cfo`, `cgo`, `board`, `teamLead`, `byTeam`).
- Produces: `seedEvaluations(prisma, users): Promise<SeededEvaluations>` where
  `SeededEvaluations = { pendingAck: { evaluationId: string; revieweeId: string }[] }` (unchanged shape — `notifications.ts` depends on it).

**Data plan (reviewer = direct supervisor in every row):**
- **CEO → each of the 7 other board members** (CEO is their supervisor). Assign states across them:
  - CTO (Loreto): sent + acknowledged
  - CIO (Asha): sent + pending  → push to `pendingAck`
  - CPO (Thea V): sent + acknowledged
  - COO (Vn): sent + pending → `pendingAck`
  - CHRO (Darben): draft (`isSent:false`)
  - CFO (Thea S): sent + deemed-acknowledged (`isDeemedAck:true`)
  - CGO (Angelo): sent + acknowledged
- **Each board member → their department's primary team lead** (generated; that lead's supervisor is the board member). One eval each, varied states (sent+pending for CTO→Engineering lead pushes to `pendingAck`; others a mix of draft/acknowledged).
- **Light scatter**: 3 generated team leads each review the first IC on their team (sent + acknowledged), so the directory isn't empty.

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
    reviewer: Employee,
    reviewee: Employee,
    state: State,
    grade: number,
    sentAt: Date,
    content: { highlights: string[]; lowlights: string[]; evaluation: string; recommendation: string },
  ): Promise<void> {
    const isSent = state !== 'draft'
    const evaluation = await prisma.performanceEvaluation.create({
      data: {
        reviewerId: reviewer.id,
        revieweeId: reviewee.id,
        ...PERIOD_Q1_2026,
        grade,
        highlights: content.highlights,
        lowlights: content.lowlights,
        evaluation: content.evaluation,
        recommendation: content.recommendation,
        supportingDocUrls: [], // String[] per schema
        isSent,
        ...(isSent ? { sentAt, ackDeadline: ackDeadlineFrom(sentAt) } : {}),
      },
    })
    if (state === 'pending') {
      pendingAck.push({ evaluationId: evaluation.id, revieweeId: reviewee.id })
    } else if (state === 'acknowledged') {
      await prisma.evaluationAcknowledgement.create({
        data: { evaluationId: evaluation.id, employeeId: reviewee.id, isDeemedAck: false, acknowledgedAt: new Date(sentAt.getTime() + 2 * 86400000) },
      })
    } else if (state === 'deemed') {
      await prisma.evaluationAcknowledgement.create({
        data: { evaluationId: evaluation.id, employeeId: reviewee.id, isDeemedAck: true, acknowledgedAt: ackDeadlineFrom(sentAt) },
      })
    }
  }

  const C = (role: string) => ({
    highlights: [`Strong leadership of the ${role} org this quarter`, 'Drove cross-functional alignment on company priorities'],
    lowlights: ['Spread thin across competing initiatives'],
    evaluation: `Solid quarter leading ${role}. Delivery and stakeholder management were strong; protecting focus is the main growth area.`,
    recommendation: `Delegate one workstream next quarter and own the ${role} strategy review end to end.`,
  })

  // CEO → board members
  await evaluate(users.ceo, users.cto, 'acknowledged', 4, new Date('2026-06-01'), C('Engineering'))
  await evaluate(users.ceo, users.cio, 'pending', 4, new Date('2026-06-14'), C('IT'))
  await evaluate(users.ceo, users.cpo, 'acknowledged', 5, new Date('2026-06-01'), C('Product & Design'))
  await evaluate(users.ceo, users.coo, 'pending', 4, new Date('2026-06-16'), C('Operations'))
  await evaluate(users.ceo, users.chro, 'draft', 4, new Date('2026-06-16'), C('People'))
  await evaluate(users.ceo, users.cfo, 'deemed', 3, new Date('2026-05-20'), C('Finance'))
  await evaluate(users.ceo, users.cgo, 'acknowledged', 4, new Date('2026-06-01'), C('Growth'))

  // Each board member → their department's primary team lead
  const ownerToPrimaryTeam: Array<[Employee, string]> = [
    [users.cto, 'Frontend'],
    [users.cpo, 'Product Management'],
    [users.coo, 'Business Operations'],
    [users.chro, 'Recruitment'],
    [users.cfo, 'Accounting'],
    [users.cgo, 'Sales'],
  ]
  const states: State[] = ['pending', 'acknowledged', 'draft', 'acknowledged', 'deemed', 'pending']
  ownerToPrimaryTeam.forEach(() => {}) // noop to keep arrays paired below
  for (let i = 0; i < ownerToPrimaryTeam.length; i++) {
    const [owner, team] = ownerToPrimaryTeam[i]
    const lead = users.teamLead[team]
    await evaluate(owner, lead, states[i], 4, new Date('2026-06-05'), {
      highlights: [`Kept ${team} delivering on schedule`, 'Strong team mentorship'],
      lowlights: ['Documentation could be more consistent'],
      evaluation: `${team} stayed productive this quarter under solid leadership.`,
      recommendation: `Lead the ${team} process-improvement initiative next quarter.`,
    })
  }

  // Light scatter: 3 generated team leads review their first IC
  for (const team of ['Backend', 'Technical Support', 'Marketing']) {
    const lead = users.teamLead[team]
    const members = users.byTeam[team] ?? []
    const ic = members.find((m) => m.id !== lead.id)
    if (ic) {
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

> Remove the stray `ownerToPrimaryTeam.forEach(() => {})` noop line if your linter flags it; it
> has no effect and exists only to keep the paired arrays adjacent in the plan text.

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

### Task 7: Rewrite `surveys.ts` — four surveys with realistic volume

**Files:**
- Modify (full rewrite): `backend/prisma/seed/surveys.ts`

**Interfaces:**
- Consumes: `SeededUsers` (`chro`, `coo`, `board`, `all`, `byTeam`, `teamLead`).
- Produces: `seedSurveys(prisma, users): Promise<SeededSurveys>` where
  `SeededSurveys = { survey1Id: string; survey2Id: string; survey2CurrentOccId: string; survey3Id: string }` (unchanged shape — `notifications.ts` depends on `survey2Id`).

**Data plan:**
1. **Q2 Engagement Check** — `ONE_TIME`, closed, non-anonymous, `SUPERVISOR_BASED`. Creator CHRO. One closed occurrence. **~70% of active employees respond** (iterate `users.all` filtered `ACTIVE`, take 70% deterministically — every employee whose index % 10 < 7). 5 questions (reuse the existing question set). Each respondent gets a `SurveyResponse` (with `employeeId`), one `SurveyAnswer` per question (varied by index), and a `SurveyCompletion`.
2. **Weekly Pulse** — `WEEKLY`, active, **anonymous**, `HR_ROOT_ONLY`. Creator CHRO. Reminder config DAILY. Occurrence 1 closed (anonymous responses: `employeeId=null` + snapshots, completions written with real id). Occurrence 2 open; the 8 board members answer it; `SurveyAudienceMember` snapshot for all active employees.
3. **Engineering Team Health** — `MONTHLY`, active, non-anonymous, `SPECIFIC_TEAMS`/`TEAM_BASED`. Creator **COO Vn**. Audience config = Frontend team. Open occurrence; Frontend members respond; audience-member snapshot = Frontend members.
4. **Onboarding Experience** — `ONE_TIME`, closed (inactive), **anonymous**, `HR_ROOT_ONLY` — an "expired" survey. Creator CHRO. One closed occurrence with a handful of anonymous responses.

The snapshot helper and answer-writing loop mirror the existing file (fix the `placeholders[]` bug by iterating real employee lists).

- [ ] **Step 1: Rewrite `surveys.ts`**

```ts
// backend/prisma/seed/surveys.ts
import { PrismaClient, Employee, Prisma } from '@prisma/client'
import { SeededUsers } from './users'

export type SeededSurveys = {
  survey1Id: string
  survey2Id: string
  survey2CurrentOccId: string
  survey3Id: string
}

type AnswerInput = { text?: string; data?: Prisma.InputJsonValue }

export async function seedSurveys(prisma: PrismaClient, users: SeededUsers): Promise<SeededSurveys> {
  async function snapshot(emp: Employee) {
    const tms = await prisma.teamMember.findMany({ where: { employeeId: emp.id } })
    return { respondentSupervisorId: emp.supervisorId, respondentTeamIds: tms.map((t) => t.teamId) }
  }
  const activeAll = users.all.filter((e) => e.status === 'ACTIVE')

  // ── Survey 1: Q2 Engagement Check — ONE_TIME, closed, non-anonymous ──
  const survey1 = await prisma.pulseSurvey.create({
    data: {
      createdBy: users.chro.id, name: 'Q2 Engagement Check', recurringType: 'ONE_TIME',
      audienceType: 'EVERYONE', isAnonymous: false, visibility: 'SUPERVISOR_BASED', isActive: false,
      releaseDate: new Date('2026-05-15'), deadline: new Date('2026-06-08'),
    },
  })
  const s1q = await Promise.all([
    prisma.surveyQuestion.create({ data: { surveyId: survey1.id, type: 'LINEAR_SCALE', questionText: 'How satisfied are you with your current workload?', isRequired: true, scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Not satisfied', scaleMaxLabel: 'Very satisfied', orderIndex: 1 } }),
    prisma.surveyQuestion.create({ data: { surveyId: survey1.id, type: 'SHORT_ANSWER', questionText: "What's one thing we could improve as a team?", isRequired: true, orderIndex: 2 } }),
    prisma.surveyQuestion.create({ data: { surveyId: survey1.id, type: 'MULTIPLE_CHOICE', questionText: 'How would you rate overall team communication?', options: ['Poor', 'Fair', 'Good', 'Excellent'], isRequired: true, orderIndex: 3 } }),
  ])
  const s1Occ = await prisma.surveyOccurrence.create({
    data: { surveyId: survey1.id, occurrenceNumber: 1, releaseDate: new Date('2026-05-15'), deadline: new Date('2026-06-08'), isClosed: true },
  })
  // ~70% respond: deterministic by index
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
    data: {
      createdBy: users.chro.id, name: 'Weekly Pulse', recurringType: 'WEEKLY', audienceType: 'EVERYONE',
      isAnonymous: true, visibility: 'HR_ROOT_ONLY', isActive: true,
      releaseDate: new Date('2026-06-01'), deadline: new Date('2026-06-22'),
    },
  })
  await prisma.surveyReminderConfig.create({ data: { surveyId: survey2.id, frequency: 'DAILY' } })
  const s2q1 = await prisma.surveyQuestion.create({ data: { surveyId: survey2.id, type: 'LINEAR_SCALE', questionText: 'How would you rate your energy and focus this week?', isRequired: true, scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Drained', scaleMaxLabel: 'Energized', orderIndex: 1 } })
  const s2q2 = await prisma.surveyQuestion.create({ data: { surveyId: survey2.id, type: 'SHORT_ANSWER', questionText: 'Any blockers to flag anonymously?', isRequired: false, orderIndex: 2 } })

  // Occurrence 1 — closed, anonymous responses from a 40-person slice
  const s2Past = await prisma.surveyOccurrence.create({ data: { surveyId: survey2.id, occurrenceNumber: 1, releaseDate: new Date('2026-06-01'), deadline: new Date('2026-06-07'), isClosed: true } })
  for (const emp of activeAll.slice(0, 40)) {
    const snap = await snapshot(emp)
    const resp = await prisma.surveyResponse.create({ data: { occurrenceId: s2Past.id, employeeId: null, ...snap } })
    await prisma.surveyAnswer.create({ data: { responseId: resp.id, questionId: s2q1.id, answerData: 4 } })
    await prisma.surveyAnswer.create({ data: { responseId: resp.id, questionId: s2q2.id, answerText: 'No major blockers.' } })
    await prisma.surveyCompletion.create({ data: { occurrenceId: s2Past.id, employeeId: emp.id } })
  }
  // Occurrence 2 — open; the 8 board members answer anonymously
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

  // ── Survey 3: Engineering Team Health — MONTHLY, active, non-anonymous, TEAM_BASED ──
  const survey3 = await prisma.pulseSurvey.create({
    data: {
      createdBy: users.coo.id, name: 'Engineering Team Health', recurringType: 'MONTHLY', audienceType: 'SPECIFIC_TEAMS',
      isAnonymous: false, visibility: 'TEAM_BASED', isActive: true,
      releaseDate: new Date('2026-06-01'), deadline: new Date('2026-06-30'),
    },
  })
  const frontend = await prisma.team.findFirst({ where: { name: 'Frontend' } })
  if (frontend) await prisma.surveyAudienceConfig.create({ data: { surveyId: survey3.id, teamId: frontend.id } })
  const s3q1 = await prisma.surveyQuestion.create({ data: { surveyId: survey3.id, type: 'LINEAR_SCALE', questionText: 'How aligned are we on our sprint goals?', isRequired: true, scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Misaligned', scaleMaxLabel: 'Fully aligned', orderIndex: 1 } })
  const s3Occ = await prisma.surveyOccurrence.create({ data: { surveyId: survey3.id, occurrenceNumber: 1, releaseDate: new Date('2026-06-01'), deadline: new Date('2026-06-30'), isClosed: false } })
  const frontendMembers = users.byTeam['Frontend'] ?? []
  for (const emp of frontendMembers.slice(0, 12)) {
    const resp = await prisma.surveyResponse.create({ data: { occurrenceId: s3Occ.id, employeeId: emp.id } })
    await prisma.surveyAnswer.create({ data: { responseId: resp.id, questionId: s3q1.id, answerData: 4 } })
    await prisma.surveyCompletion.create({ data: { occurrenceId: s3Occ.id, employeeId: emp.id } })
  }
  for (const emp of frontendMembers) {
    await prisma.surveyAudienceMember.create({ data: { occurrenceId: s3Occ.id, employeeId: emp.id } })
  }

  // ── Survey 4: Onboarding Experience — ONE_TIME, closed (expired), anonymous ──
  const survey4 = await prisma.pulseSurvey.create({
    data: {
      createdBy: users.chro.id, name: 'Onboarding Experience', recurringType: 'ONE_TIME', audienceType: 'EVERYONE',
      isAnonymous: true, visibility: 'HR_ROOT_ONLY', isActive: false,
      releaseDate: new Date('2026-04-01'), deadline: new Date('2026-04-21'),
    },
  })
  const s4q1 = await prisma.surveyQuestion.create({ data: { surveyId: survey4.id, type: 'LINEAR_SCALE', questionText: 'How smooth was your onboarding?', isRequired: true, scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Rough', scaleMaxLabel: 'Seamless', orderIndex: 1 } })
  const s4Occ = await prisma.surveyOccurrence.create({ data: { surveyId: survey4.id, occurrenceNumber: 1, releaseDate: new Date('2026-04-01'), deadline: new Date('2026-04-21'), isClosed: true } })
  for (const emp of activeAll.slice(40, 60)) {
    const snap = await snapshot(emp)
    const resp = await prisma.surveyResponse.create({ data: { occurrenceId: s4Occ.id, employeeId: null, ...snap } })
    await prisma.surveyAnswer.create({ data: { responseId: resp.id, questionId: s4q1.id, answerData: 4 } })
    await prisma.surveyCompletion.create({ data: { occurrenceId: s4Occ.id, employeeId: emp.id } })
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
git commit -m "feat(seed): four pulse surveys with realistic response volume

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Update `notifications.ts` to the new `SeededUsers`

**Files:**
- Modify: `backend/prisma/seed/notifications.ts`

**Interfaces:**
- Consumes: `users.all`, `surveys.survey2Id`, `evaluations.pendingAck`.

- [ ] **Step 1: Update the active-audience line**

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
Expected: logs through "Seed complete." with no error; process exits 0.

- [ ] **Step 3: Run the assertion checks**

Run: `cd backend && npx ts-node --project tsconfig.seed.json --transpile-only prisma/seed/checks.ts`
Expected: `SEED CHECK PASSED ✔` (300 users/employees, 10 depts, 21 teams, 1 root, every dept + team headcount exact, 8 real accounts in Executive).

- [ ] **Step 4: Verify determinism (re-seed → identical names/emails)**

Run:
```bash
cd backend && psql "$DIRECT_URL" -t -c "select md5(string_agg(\"companyEmail\", ',' order by \"companyEmail\")) from employees;" > /tmp/seed-hash-1.txt
npm run db:seed >/dev/null
psql "$DIRECT_URL" -t -c "select md5(string_agg(\"companyEmail\", ',' order by \"companyEmail\")) from employees;" > /tmp/seed-hash-2.txt
diff /tmp/seed-hash-1.txt /tmp/seed-hash-2.txt && echo "DETERMINISTIC ✔"
```
Expected: `DETERMINISTIC ✔` (identical hashes). If `psql` is unavailable, instead re-run `checks.ts` after a second seed and confirm it still passes.

- [ ] **Step 5: Run the full backend test suite (no regressions)**

Run: `cd backend && npm test`
Expected: PASS, including the new `src/tests/seed/*.test.ts`.

- [ ] **Step 6: Commit any verification fixups**

Only if Steps 2–5 surfaced fixes (e.g. a headcount off-by-one). Commit them with a clear message, then re-run Steps 2–5 until all pass.

```bash
git add -A
git commit -m "fix(seed): <specific fix from verification>

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review (completed during planning)

**Spec coverage:**
- Org structure (10 depts / 21 teams / headcounts) → Tasks 2, 3, 4 + `checks.ts`.
- 4-level reporting tree rooted at CEO → Task 3 (tiered creation) + `checks.ts` (1 root).
- 8 real accounts as board, exact emails/roles, two renames → Task 3 + `checks.ts`.
- 292 deterministic Filipino-named generated employees + email rule → Tasks 1, 3.
- Evaluation state matrix centered on board, reviewer = supervisor → Task 6.
- Four survey variants (anonymous/closed/active/team-based) + ~70% volume → Task 7.
- Consumers kept compiling (onboarding/offboarding/notifications) → Tasks 5, 8.
- Bug fixes (`supportingDocUrl` → `supportingDocUrls`; `placeholders[]`) → Tasks 6, 7.
- Determinism + counts + login emails (success criteria) → Task 9.

**Placeholder scan:** The only `…` is the explicit instruction in Task 1 to paste the full
name arrays from the user's message (called out as a NOTE, not a code gap). No TODO/TBD.

**Type consistency:** `SeededUsers` (Task 3) is consumed with matching field names in Tasks
4–8 (`byTeam`, `teamLead`, `board`, `all`, `ceo`/`cto`/…/`cgo`, `onboardingSample`,
`offboardingSample`). `SeededEvaluations.pendingAck` and `SeededSurveys.survey2Id` keep their
original shapes, so `notifications.ts` stays compatible.
