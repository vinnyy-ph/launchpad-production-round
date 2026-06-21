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

### Reporting tree (5 levels)

`CEO → C-suite → dept head (VP) → team lead → IC`

- Every team member's `supervisorId` = their team lead.
- Each team lead reports to the department head.
- Each department head reports to the matching C-level.
- C-levels report to the CEO.
- Team-less depts (IT, Executive): members report to the dept head / CEO directly.

### Executive department (10)

CEO (root) + CTO (Loreto) + 8 generated C-levels: CPO, CFO, COO, CGO, CCO, CDO, CISO,
Chief of Staff. Department → C-level reporting lines:

- Engineering, IT → CTO (Loreto)
- Product → CPO · Design → CDO · Finance → CFO · Operations → COO
- Customer Support → CCO · Growth → CGO
- People → **reports to CEO directly** (headed by Darben)

### Real-account placement (these count toward the 300)

| Account | Login email (unchanged) | Display name | Dept / Team | Role | Reports to |
|---|---|---|---|---|---|
| CEO | allenkurtds.dev@gmail.com | **Rafael Bautista** | Executive | EMPLOYEE | — (root) |
| CTO | loretorussellkelvinanthony@gmail.com | Loreto Russell | Executive | ADMIN | CEO |
| Demo lead | vnferrer.work@gmail.com | Vn Ferrer | Engineering / **Frontend (lead)** | EMPLOYEE | VP Engineering |
| Lead | theaverah@gmail.com | Thea Verah | Product / **Product Management (lead)** | EMPLOYEE | CPO |
| HR head | darbenlamonte@gmail.com | Darben Lamonte | People (head) | HR | CEO |
| HR | thea_sumagang@dlsu.edu.ph | Thea Sumagang | People / HR Operations | HR | Darben |
| Sysadmin | ashasce@gmail.com | Asha Ce | IT | ADMIN | IT Manager → CTO |
| Intern | ximen91101@gmail.com | **Angelo Galang** | Design / UX Design (member) | EMPLOYEE | **CEO (direct)** |

**Login emails and `companyEmail` for the real accounts stay exactly as they are today** —
only the two display names change (Kurt Ds → Rafael Bautista; Ximen Galang → Angelo Galang).
Ximen/Angelo is a UX Design *team member* but reports straight to the CEO (intentional
special case — gives a CEO→intern eval loop between two login-capable accounts).

## Generated Employees (292 = 300 − 8 real)

- **Names**: built from the provided Filipino first-name / last-name arrays, stored in a new
  `names.ts`. Generation is **deterministic** via a small seeded PRNG so re-seeding produces
  stable data (titles, distribution, picks).
- **Emails**: `firstname.lastname@dgtechnologies.com`, slugified — lowercase, strip spaces and
  periods, drop honorific prefixes (`Ma.`, `Sta.`), take the first first-name token + full last
  name (e.g. "Ma. Theresa Dela Cruz" → `theresa.delacruz@dgtechnologies.com`). Collisions get a
  numeric suffix (`.2`, `.3`). `companyEmail` = same value.
- **Distribution**: each team is filled to its exact headcount; the count of any real account
  already placed in a team/dept is subtracted from the generated target (e.g. Frontend = 32 ⇒
  Vn as lead + 31 generated). Team-less depts (IT, Executive) filled directly.
- **Leads & heads**: teams without a real-account lead get one generated employee promoted to
  `Team.leaderId`. Each department gets one generated VP head (except where a real account is the
  head, e.g. People→Darben). Team-less depts get a generated head/manager (e.g. IT Manager).
- **Job titles**: derived per team with a seniority spread (Lead / Senior / Mid / Junior), e.g.
  "Senior Frontend Engineer", "QA Engineer", "Recruiter", "Accountant".
- **Statuses**: most `ACTIVE`; a small number seeded as `ONBOARDING`, `OFFBOARDING`, `INACTIVE`
  for directory realism.

## Surveys & Evaluations (real-account-focused)

### Evaluations — full state matrix, centered on Vn & Thea V

Reviewer = direct supervisor throughout (matches app rules).

- **As reviewer** — Vn → Frontend reports, Thea V → PM reports, each produces:
  one **draft** (ongoing), one **sent-pending-ack**, one **sent-acknowledged**, one
  **deemed-acknowledged** ("expired").
- **As reviewee** — Vn & Thea V each receive: one **pending** (actionable in their inbox) +
  one **past acknowledged** from their supervisor. Darben → Thea S, IT Manager → Asha, and
  **CEO (Rafael) → Ximen/Angelo** each get a sent evaluation (Ximen's exercises the CEO→intern
  loop).
- **Light scatter**: a few generated dept heads review a few of their reports, so the directory
  isn't empty. Volume stays modest (≈25–40 evaluations total).

### Surveys — every lifecycle / visibility / anonymity variant

1. **Closed, non-anonymous, company-wide** (creator: Darben) — the "completed" survey;
   ~70% of all active employees respond → rich aggregate charts. All real accounts answered.
2. **Active, anonymous, weekly recurring, `HR_ROOT_ONLY`** (creator: Darben) — one past
   **closed** occurrence (full anonymous responses with `employeeId=null` + supervisor/team
   snapshots) + one **current open** occurrence (real accounts have answered, plus a per-occurrence
   `SurveyAudienceMember` snapshot).
3. **Active, non-anonymous, `SPECIFIC_TEAMS` / `TEAM_BASED`** (creator: **Vn**) targeting the
   Frontend/Engineering team — demonstrates a team lead as survey creator.
4. **Closed, anonymous, one-time** — an "expired" survey for completeness.

Each real account ends up with: answered surveys (populates "My Answers"), at least one open
survey awaiting their response (populates their to-do), and — for Vn — a created survey.

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
3. The 8 real accounts retain their original login emails; the two renamed accounts show the new
   display names; Ximen/Angelo's `supervisorId` = CEO.
4. Logging in as each real account surfaces populated, navigable data: evaluations in every state
   (as reviewer and reviewee where applicable), answered surveys, and at least one open survey.
5. Company-wide survey shows realistic aggregate charts (~70% response rate); anonymous-survey
   responses have `employeeId=null` with populated supervisor/team snapshots.
6. Re-running the seed is deterministic (stable names/emails/distribution).
7. `tsc` over the seed files passes (the expanded `SeededUsers` type is consumed without errors).
