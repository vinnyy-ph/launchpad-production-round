# 300-Employee Realistic Seed Data — Design

**Date:** 2026-06-21
**Branch:** `feature/seed-300-employee-realistic-data`
**Scope:** Local DB only (production seeding is a later, separate effort).

## Goal

Scale the existing Prisma seeders in `backend/prisma/seed/` from ~20 employees to a
realistic **300-employee** company, organized into the org structure below, with
Filipino names, and with **surveys + evaluations focused on the 8 real (login-capable)
accounts** while the generated employees provide realistic aggregate volume.

## Background / Constraints (from codebase exploration)

- Seeders live in `backend/prisma/seed/` (`index.ts` orchestrator + per-domain files),
  wired via `prisma.config.ts` → `db:seed` (`ts-node prisma/seed/index.ts`). Seeding
  uses the `PrismaPg` adapter (interactive transactions); the Neon HTTP adapter does not
  support them.
- **Auth is Firebase Google OAuth — no passwords.** Only accounts with a real Google
  identity can log in. The 8 real accounts have real emails; the generated
  `@dgtechnologies.com` accounts **cannot log in** and exist purely for org-chart fill
  and aggregate survey/eval data. This is why surveys/evals center on the real accounts.
- **Schema facts that shape the design:**
  - `Department` is **flat** (no parent/child) and has soft-delete `deletedAt`; `name` unique.
  - `Team` has a single `leaderId` (an Employee) + members via `TeamMember` (join row holds
    only `joinedAt`; no per-member role).
  - `Employee.supervisorId` is self-referential and models the reporting tree. The
    `SUPERVISOR` role is **derived** from having direct reports — it is NOT in the `Role` enum
    (`ADMIN | HR | EMPLOYEE`).
  - `Employee` requires `userId`, `companyEmail` (unique), `firstName`, `lastName`, `status`.
    `departmentId`/`supervisorId` optional. Creation order: `User` first, then `Employee`.
  - **Evaluations**: reviewer → reviewee, `grade` 1–5, `periodStart/End`. States:
    draft (`isSent:false`) → sent (`isSent:true`, `sentAt`, `ackDeadline = sentAt + 7d`) →
    acknowledged (`EvaluationAcknowledgement.acknowledgedAt` set) →
    deemed-acknowledged (`isDeemedAck:true`, ack window lapsed = "expired").
    App rule: reviewer must be the reviewee's **direct supervisor**. `supportingDocUrls`
    is a **String[]** (array).
  - **Surveys**: draft (`isActive:false`, no occurrences) → active (`isActive:true`, has
    occurrences) → inactive. Per-occurrence `isClosed`. `isAnonymous:true` ⇒
    `SurveyResponse.employeeId = null` but `respondentSupervisorId` + `respondentTeamIds`
    snapshots are still populated for grouping. `SurveyCompletion` tracks *that* an employee
    completed (drives reminders / min-group-size) without linking to content.
    `AudienceType`: `EVERYONE | SUPERVISOR_BASED | SPECIFIC_TEAMS`.
    `SurveyVisibility`: `EVERYONE | SUPERVISOR_BASED | TEAM_BASED | HR_ROOT_ONLY | SPECIFIC_TEAMS`.

## Org Structure (300 people)

**10 Departments** (top-level groups) and **21 Teams** (sub-groups). IT and Executive are
team-less.

| Department | HC | Teams (sub-groups) |
|---|---|---|
| Engineering | 132 | Frontend 32 · Backend 38 · Mobile 22 · QA 22 · Platform & Architecture 18 |
| Product | 20 | Product Management 13 · Business Analysis 7 |
| Design | 16 | UX Design 11 · UX Research 5 |
| Customer Support | 38 | Technical Support 24 · Customer Success 14 |
| Operations | 16 | Business Operations 10 · Facilities & Admin 6 |
| Growth | 28 | Sales 18 · Marketing 10 |
| People | 16 | Recruitment 6 · HR Operations 7 · Learning & Development 3 |
| Finance | 14 | Accounting 9 · Billing & Collections 5 |
| IT | 10 | — |
| Executive | 10 | — |

**Total: 300.** Sub-group headcounts sum exactly to their department totals.

### Reporting tree (4 levels)

`CEO → executive board (C-suite) → team lead → IC`

- The CEO is the org root (`supervisorId` = null).
- All other board members + the 2 generated exec support roles report to the CEO.
- Each non-Executive department is **fully generated** and owned by a board member. The
  department's **primary team lead** (generated) reports to the owning board member; the
  department's other team leads report to that primary lead; ICs report to their own team lead.
  (The `Department` schema has no head field, so the primary team lead doubles as dept head —
  this keeps every department headcount exact, with no phantom "VP" rows.)
- Team-less depts: **IT** — a generated IT Manager reports to the CIO, IT ICs report to the IT
  Manager. **Executive** — see below.

### Executive department (10) — the 8 real accounts + 2 generated support

**All 8 login-capable accounts ARE the executive board.** This is deliberate: every account that
can actually log in is a leader with company-wide visibility and a real org beneath them, and the
CEO↔exec evaluation/survey loops happen between real accounts.

| Account | Login email (unchanged) | Display name | Board title | Role | Owns (departments) |
|---|---|---|---|---|---|
| allenkurtds.dev@gmail.com | **Rafael Bautista** | **CEO** (root) | EMPLOYEE | — (oversees all) |
| loretorussellkelvinanthony@gmail.com | Loreto Russell | **CTO** | ADMIN | Engineering |
| ashasce@gmail.com | Asha Ce | **CIO** | ADMIN | IT |
| theaverah@gmail.com | Thea Verah | **CPO** | EMPLOYEE | Product · Design |
| vnferrer.work@gmail.com | Vn Ferrer | **COO** | EMPLOYEE | Operations · Customer Support |
| darbenlamonte@gmail.com | Darben Lamonte | **CHRO** | HR | People |
| thea_sumagang@dlsu.edu.ph | Thea Sumagang | **CFO** | HR | Finance |
| ximen91101@gmail.com | **Angelo Galang** | **CGO** (Chief Growth Officer) | EMPLOYEE | Growth |

Plus **2 generated** Executive members reporting to the CEO with no department: **Chief of Staff**
and **Executive Assistant**. Executive total = 8 real + 2 generated = 10.

**Login emails and `companyEmail` for the real accounts stay exactly as they are today** — only
the two display names change (Kurt Ds → **Rafael Bautista**; Ximen Galang → **Angelo Galang**).
Roles are unchanged (Loreto/Asha = ADMIN, Darben/Thea S = HR, the rest = EMPLOYEE).

Department → owning board member (the dept's primary generated team lead reports to this person):

- Engineering → CTO (Loreto) · IT → CIO (Asha)
- Product → CPO (Thea V) · Design → CPO (Thea V)
- Operations → COO (Vn) · Customer Support → COO (Vn)
- People → CHRO (Darben) · Finance → CFO (Thea S) · Growth → CGO (Angelo)

## Generated Employees (292 = 300 − 8 real)

- **Names**: built from the provided Filipino first-name / last-name arrays, stored in a new
  `names.ts`. Generation is **deterministic** via a small seeded PRNG so re-seeding produces
  stable data (titles, distribution, picks).
- **Emails**: `firstname.lastname@dgtechnologies.com`, slugified — lowercase, strip spaces and
  periods, drop honorific prefixes (`Ma.`, `Sta.`), take the first first-name token + full last
  name (e.g. "Ma. Theresa Dela Cruz" → `theresa.delacruz@dgtechnologies.com`). Collisions get a
  numeric suffix (`.2`, `.3`). `companyEmail` = same value.
- **Distribution**: the 9 non-Executive departments are **fully generated**, each filled to its
  exact team headcounts. Executive is filled with the 2 generated support roles (the other 8 are
  real). IT (team-less) is filled directly under the IT Manager.
- **Leads & heads**: every team gets one generated employee promoted to `Team.leaderId`. Each
  department's primary team lead doubles as dept head and reports to the owning board member;
  the other team leads report to that primary lead. IT gets a generated IT Manager (reports to
  the CIO, Asha).
- **Job titles**: derived per team with a seniority spread (Lead / Senior / Mid / Junior), e.g.
  "Senior Frontend Engineer", "QA Engineer", "Recruiter", "Accountant".
- **Statuses**: most `ACTIVE`; a small number seeded as `ONBOARDING`, `OFFBOARDING`, `INACTIVE`
  for directory realism.

## Surveys & Evaluations (real-account-focused)

### Evaluations — full state matrix, centered on the board (all real accounts)

Reviewer = direct supervisor throughout (matches app rules).

- **CEO → each board member** (all real-account-to-real-account, since the CEO is the direct
  supervisor of every other exec). Across the 7 reports the CEO produces one of each state so
  every variant is demoable from a login-capable account: one **draft** (ongoing), a couple
  **sent-pending-ack** (actionable in the exec's inbox), a couple **sent-acknowledged**, one
  **deemed-acknowledged** ("expired"). This gives each exec a populated inbox and the CEO a full
  outbox.
- **Each board member → their department's primary lead** (generated). Gives every exec an
  outbox with a real subordinate. Mix of states.
- **Light scatter**: a few generated team leads review a few of their own reports, so the
  directory isn't empty. Volume stays modest (≈25–40 evaluations total).

### Surveys — every lifecycle / visibility / anonymity variant

1. **Closed, non-anonymous, company-wide** (creator: CHRO Darben) — the "completed" survey;
   ~70% of all active employees respond → rich aggregate charts. All board members answered.
2. **Active, anonymous, weekly recurring, `HR_ROOT_ONLY`** (creator: CHRO Darben) — one past
   **closed** occurrence (full anonymous responses with `employeeId=null` + supervisor/team
   snapshots) + one **current open** occurrence (board members have answered, plus a per-occurrence
   `SurveyAudienceMember` snapshot).
3. **Active, non-anonymous, `SPECIFIC_TEAMS` / `TEAM_BASED`** (creator: **COO Vn**) targeting an
   Engineering team — demonstrates a board member as survey creator with team-scoped visibility.
4. **Closed, anonymous, one-time** — an "expired" survey for completeness.

Each board member ends up with: answered surveys (populates "My Answers"), at least one open
survey awaiting their response (populates their to-do), and — for Vn and Darben — a created survey.

## Code Structure

Keep the modular `backend/prisma/seed/` layout.

**New files:**
- `org-structure.ts` — declarative spec of departments, teams, headcounts, the exec roster, and
  real-account placement (single source of truth the generator reads).
- `names.ts` — the Filipino first/last-name arrays + name/email generators + the seeded PRNG.

**Rewritten files:**
- `users.ts` — create 10 departments; create the 8 real accounts (renamed/placed per above);
  generate the 292 employees distributed across teams/depts with supervisor wiring. Returns an
  expanded `SeededUsers` (real accounts by handle + generated employees indexed by dept/team and a
  flat list).
- `teams.ts` — create 21 teams with leads + memberships.
- `evaluations.ts` — the real-account-focused state matrix + light scatter; fix the stale
  `supportingDocUrl` → `supportingDocUrls` (array).
- `surveys.ts` — the four surveys above with realistic response volume; fix the latent
  `placeholders[]` bug (undefined reference) → use the generated/real employee lists.

**Touched to stay compiling:**
- `onboarding.ts`, `offboarding.ts`, `notifications.ts` — update to the expanded `SeededUsers`
  type (they consume `users`). Keep behavior equivalent; reference real accounts + a slice of
  generated employees.
- `index.ts` — orchestrator already calls each seeder in dependency order; update only if the
  `SeededUsers`/return shapes change.

## Success Criteria

1. `npm run db:seed` (backend) completes against the local `launchpad-pg` Postgres without error.
2. DB contains exactly **300 employees / 300 users**, **10 departments**, **21 teams**, with team
   headcounts matching the table and the full reporting tree rooted at the CEO (no orphan cycles).
3. The 8 real accounts retain their original login emails and roles; all 8 are in the Executive
   department; the two renamed accounts show the new display names (Rafael Bautista, Angelo
   Galang); the CEO's `supervisorId` is null and every other board member reports to the CEO.
4. Logging in as each board member surfaces populated, navigable data: evaluations as reviewee
   (from the CEO) and as reviewer (of their dept's primary lead), in a spread of states; answered
   surveys; and at least one open survey awaiting response.
5. Company-wide survey shows realistic aggregate charts (~70% response rate); anonymous-survey
   responses have `employeeId=null` with populated supervisor/team snapshots.
6. Re-running the seed is deterministic (stable names/emails/distribution).
7. `tsc` over the seed files passes (the expanded `SeededUsers` type is consumed without errors).
