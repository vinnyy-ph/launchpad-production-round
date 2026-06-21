# 300-Employee Realistic Seed Data — Design

**Date:** 2026-06-21
**Branch:** `feature/seed-300-employee-realistic-data`
**Scope:** Local DB only (production seeding is a later, separate effort).

## Goal

Scale the existing Prisma seeders in `backend/prisma/seed/` from ~20 employees to a realistic
**300-employee** company: 22 departments (the partition), 9 cross-functional teams, a reporting
tree rooted at the CEO, Filipino-named generated employees, with the 8 real (login-capable)
accounts as the executive board and surveys/evaluations centered on them.

## Background / Constraints (from codebase exploration)

- Seeders live in `backend/prisma/seed/` (`index.ts` orchestrator + per-domain files), wired via
  `prisma.config.ts` → `db:seed` (`ts-node prisma/seed/index.ts`). Seeding uses the `PrismaPg`
  adapter (interactive transactions); the Neon HTTP adapter does not support them.
- **Auth is Firebase Google OAuth — no passwords.** Only accounts with a real Google identity can
  log in. The 8 real accounts have real emails; the generated `@dgtechnologies.com` accounts
  **cannot log in** and exist purely for org-chart fill and aggregate survey/eval data. This is
  why surveys/evals center on the real accounts.
- **Schema facts that shape the design:**
  - `Department` is **flat** (no parent/child) and has soft-delete `deletedAt`; `name` unique. The
    org chart groups employees by **exact department name**; the directory is a flat list.
  - `Team` has a single `leaderId` (an Employee) + members via `TeamMember` (join row holds only
    `joinedAt`; **no per-member role / `is_leader`**). The team leader is **also** a `TeamMember`
    row. `SPECIFIC_TEAMS` survey audiences resolve to all active `TeamMember`s (leader included).
  - `Employee.supervisorId` is self-referential and models the reporting tree. The `SUPERVISOR`
    role is **derived** from having direct reports — NOT in the `Role` enum (`ADMIN | HR | EMPLOYEE`).
  - `Employee` requires `userId`, `companyEmail` (unique), `firstName`, `lastName`, `status`.
    `departmentId`/`supervisorId` optional. Creation order: `User` first, then `Employee`.
  - **Evaluations**: reviewer → reviewee, `grade` Int 1–5, `periodStart/End`. States: draft
    (`isSent:false`) → sent (`sentAt`, `ackDeadline = sentAt + 7d`) → acknowledged
    (`EvaluationAcknowledgement.acknowledgedAt`) → deemed-acknowledged (`isDeemedAck:true`,
    window lapsed = "expired"). App rule: reviewer = reviewee's **direct supervisor**.
    `supportingDocUrls` is a **String[]**.
  - **Surveys**: draft (`isActive:false`, no occurrences) → active → inactive. Per-occurrence
    `isClosed`. `isAnonymous:true` ⇒ `SurveyResponse.employeeId = null` but
    `respondentSupervisorId` + `respondentTeamIds` snapshots are still populated. `SurveyCompletion`
    always written with the real `employeeId`. There is an **under-3 privacy rule**: results for a
    group with fewer than 3 respondents are hidden from supervisors and stay with HR.
    `AudienceType`: `EVERYONE | SUPERVISOR_BASED | SPECIFIC_TEAMS`.
    `SurveyVisibility`: `EVERYONE | SUPERVISOR_BASED | TEAM_BASED | HR_ROOT_ONLY | SPECIFIC_TEAMS`.

## Org Structure — Departments (22 leaf, the partition)

Every employee belongs to **exactly one** department. Departments are the leaf sub-departments
(the flat `Department` rows); the top-level "group" labels below exist only for reporting/ownership
wiring, not as DB rows. Counts sum to **300**.

| Group (owner) | Department (DB row) | HC |
|---|---|---|
| Engineering (CTO) | Frontend | 32 |
| | Backend | 38 |
| | Mobile | 22 |
| | QA | 22 |
| | Platform & Architecture | 18 |
| Product (CPO) | Product Management | 13 |
| | Business Analysis | 7 |
| Design (CPO) | UX Design | 11 |
| | UX Research | 5 |
| Customer Support (COO) | Technical Support | 24 |
| | Customer Success | 14 |
| Operations (COO) | Business Operations | 10 |
| | Facilities & Admin | 6 |
| Growth (CGO) | Sales | 18 |
| | Marketing | 10 |
| People (CHRO) | Recruitment | 6 |
| | HR Operations | 7 |
| | Learning & Development | 3 |
| Finance (CFO) | Accounting | 9 |
| | Billing & Collections | 5 |
| IT (CIO) | IT | 10 |
| Executive (board) | Executive Leadership | 10 |

**22 departments, total 300.** The first department listed in each group is its **primary** dept.

### Reporting tree

`CEO → board exec → group head (primary dept lead) → dept lead → IC`

- CEO is root (`supervisorId` = null).
- The 7 other board members + 2 generated support report to the CEO.
- Each leaf department has one lead + (HC − 1) ICs; ICs report to their dept lead.
- The **primary** department's lead in each group reports to the group's owning board exec.
- Non-primary departments' leads in a group report to the **primary dept's lead** (the group head).
- IT (single dept): the IT lead (IT Manager) reports to the CIO.
- Executive Leadership = the board itself (see below).

### Executive Leadership (10) — the 8 real accounts + 2 generated

**All 8 login-capable accounts ARE the executive board**, in the `Executive Leadership` department.
Every account that can log in is a leader with company-wide visibility and a real org beneath them;
CEO↔exec evaluation/survey loops happen between real accounts.

| Login email (unchanged) | Display name | Title | Role | Owns (group → departments) |
|---|---|---|---|---|
| allenkurtds.dev@gmail.com | **Rafael Bautista** | CEO (root) | EMPLOYEE | — (oversees all) |
| loretorussellkelvinanthony@gmail.com | Loreto Russell | CTO | ADMIN | Engineering (5 depts) |
| ashasce@gmail.com | Asha Ce | CIO | ADMIN | IT |
| theaverah@gmail.com | Thea Verah | CPO | EMPLOYEE | Product + Design (4 depts) |
| vnferrer.work@gmail.com | Vn Ferrer | COO | EMPLOYEE | Customer Support + Operations (4 depts) |
| darbenlamonte@gmail.com | Darben Lamonte | CHRO | HR | People (3 depts) |
| thea_sumagang@dlsu.edu.ph | Thea Sumagang | CFO | HR | Finance (2 depts) |
| ximen91101@gmail.com | **Angelo Galang** | CGO | EMPLOYEE | Growth (2 depts) |

Plus **2 generated** Executive Leadership members reporting to the CEO with no owned department:
**Chief of Staff** and **Executive Assistant**. Total = 8 real + 2 generated = 10.

**Login emails, `companyEmail`, and roles for the 8 stay exactly as today.** Only two display names
change: Kurt Ds → **Rafael Bautista**; Ximen Galang → **Angelo Galang**.

When an exec owns two groups (CPO: Product + Design; COO: Customer Support + Operations), each
group's primary dept lead reports to that exec (so the CPO/COO each have two group heads reporting
to them).

## Generated Employees (292 = 300 − 8 real)

- **Names**: from the provided Filipino first/last-name arrays in a new `names.ts`. Deterministic
  via a seeded PRNG so re-seeding is stable.
- **Emails**: `firstname.lastname@dgtechnologies.com`, slugified (lowercase, strip spaces/periods,
  drop honorific prefixes `Ma.`/`Sta.`, first first-name token + last name; non-ASCII stripped),
  deduped with numeric suffixes. `companyEmail` = same.
- **Distribution**: the 21 non-Executive leaf departments are **fully generated**, filled to their
  exact HC. Executive Leadership holds the 2 generated support roles (the other 8 are real).
- **Leads**: every leaf department gets one generated lead (the dept's most senior, reports per the
  tree above). IT's lead is titled "IT Manager".
- **Job titles**: per department with a seniority spread (Lead / Senior / Mid / Junior),
  e.g. "Senior Frontend Engineer", "QA Engineer", "Recruiter", "Accountant".
- **Statuses**: most `ACTIVE`; a few seeded `ONBOARDING` / `OFFBOARDING` / `INACTIVE` for realism.

## Teams (9, cross-functional, overlapping membership)

Teams are **not** the partition — they group employees across departments. Each team has a name, a
`leaderId` (the leader is also a member row), and members pulled from the departments below.
Memberships overlap (a person can be on several teams) and do **not** sum to 300. Members are picked
deterministically from each source department (round-robin cursor, wrapping — which naturally
produces the intended overlap where memberships exceed a department's size).

| Team | Members | Leader (source dept) | Member mix (dept × count, leader included) |
|---|---|---|---|
| UX Web | 6 | Senior UX designer (UX Design) | UX Design ×6 |
| UX Mobile | 5 | Senior UX designer (UX Design) | UX Design ×5 |
| Design System | 6 | UX designer (UX Design) | UX Design ×3 + Frontend ×3 |
| QA Automation | 8 | Senior QA engineer (QA) | QA ×8 |
| Web Performance | 5 | Senior frontend engineer (Frontend) | Frontend ×5 |
| Patient App | 12 | Product manager (Product Management) | Mobile ×5 + Frontend ×3 + UX Design ×1 + Product Management ×1 + QA ×2 |
| Provider Portal | 12 | Product manager (Product Management) | Backend ×5 + Frontend ×3 + UX Design ×1 + Product Management ×1 + QA ×2 |
| Security & Compliance | 6 | Platform & Architecture lead (Platform & Architecture) | Platform & Architecture ×3 + IT ×2 + Backend ×1 |
| Research Pod | 2 | UX researcher (UX Research) | UX Research ×2 |

Notes:
- UX Web (6) + UX Mobile (5) together partition the 11 UX Designers; Design System / Patient App /
  Provider Portal reuse some of them (the intended overlap).
- **Research Pod is deliberately 2 people** — it gives the under-3 survey privacy rule a real team
  to trigger on.
- The leader for each team is the first member taken from its leader source department, set as
  `Team.leaderId` AND included as a `TeamMember`.
- The mixes only pull from Engineering/Design/Product/QA/IT departments, so Support/Ops/Finance/Exec
  are naturally off the product teams (matching the brief's realism note).

## Surveys & Evaluations (real-account-focused)

### Evaluations — board-centered state matrix (reviewer = direct supervisor)

- **CEO → each of the 7 other board members** (all real-account-to-real-account). Across the 7, one
  of each state so every variant is demoable from a login-capable account: one **draft**, two
  **sent-pending-ack**, two **sent-acknowledged**, one **deemed-acknowledged** ("expired"), and one
  more acknowledged. Gives each exec a populated inbox and the CEO a full outbox.
- **Each board member → the primary dept lead they supervise** (generated). Mix of states; gives
  every exec an outbox with a real subordinate.
- **Light scatter**: 3 generated dept leads review their first IC, so the directory isn't empty.
  Volume ≈ 25–40 evaluations total.

### Surveys — every lifecycle / visibility / anonymity variant (5 surveys)

1. **Closed, non-anonymous, company-wide** (creator CHRO) — "completed"; ~70% of active employees
   respond → rich aggregate charts. All board members answered.
2. **Active, anonymous, weekly recurring, `HR_ROOT_ONLY`** (creator CHRO) — one past **closed**
   occurrence (anonymous: `employeeId=null` + snapshots) + one **current open** occurrence (board
   members answered; `SurveyAudienceMember` snapshot for all active).
3. **Active, non-anonymous, `SPECIFIC_TEAMS` / `TEAM_BASED`** (creator COO Vn) targeting the
   **Patient App** team — board member as creator, team-scoped visibility.
4. **Closed, anonymous, one-time** ("expired") — for completeness.
5. **Active, non-anonymous, `SPECIFIC_TEAMS` / `TEAM_BASED`** targeting **Research Pod (2 people)**
   with 2 responses — exercises the **under-3 privacy rule** (results hidden from supervisor, kept
   with HR).

Each board member ends with: answered surveys ("My Answers"), at least one open survey awaiting
response (their to-do), and — for COO Vn and CHRO Darben — a created survey.

## Code Structure

Keep the modular `backend/prisma/seed/` layout.

**New files:**
- `org-structure.ts` — declarative groups → leaf departments (with HC + owning board title + primary
  flag), the team specs (name + leader source dept + member mix), and validators.
- `names.ts` — Filipino name arrays + name/email generators + seeded PRNG.

**Rewritten files:**
- `users.ts` — create 22 departments; create the 8 real board accounts (renamed/placed) + 2 generated
  support; generate the 292 across the 21 non-Exec leaf depts with the reporting tree. Returns
  `SeededUsers` (board handles, `byDept`, `deptLead`, `all`, `generated`, status samples).
- `teams.ts` — create the 9 cross-functional teams with leaders + overlapping memberships drawn from
  `byDept`.
- `evaluations.ts` — board-centered state matrix + light scatter; fix stale `supportingDocUrl` →
  `supportingDocUrls` (array).
- `surveys.ts` — the 5 surveys above with realistic volume; fix the latent `placeholders[]` bug.

**Touched to stay compiling:** `onboarding.ts`, `offboarding.ts`, `notifications.ts` (consume the new
`SeededUsers`); `index.ts` (only if return shapes change).

## Success Criteria

1. `npm run db:seed` completes against local `launchpad-pg` Postgres without error.
2. DB has exactly **300 employees / 300 users**, **22 departments**, **9 teams**; every leaf-dept
   headcount matches the table; the reporting tree is rooted at a single CEO (one null supervisor).
3. The 8 real accounts retain their login emails + roles; all 8 are in `Executive Leadership`; the
   two renamed accounts show new display names; the CEO's `supervisorId` is null and every other
   board member reports to the CEO.
4. Team membership counts match the 9-team table; the leader of each team is also a member row;
   Research Pod has exactly 2 members.
5. Logging in as each board member surfaces populated data: evaluations as reviewee (from CEO) and as
   reviewer (of a primary dept lead) across states; answered surveys; ≥1 open survey.
6. Company-wide survey shows realistic aggregates (~70%); anonymous responses have `employeeId=null`
   with populated snapshots; the Research Pod survey has <3 respondents (privacy-rule demo).
7. Re-running the seed is deterministic (stable names/emails/distribution/memberships).
8. `npx tsc -p tsconfig.seed.json` passes across all seed files.
