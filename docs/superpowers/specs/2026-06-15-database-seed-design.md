# Database Seed — Design Spec
Date: 2026-06-15

## Overview

A full demo-ready seed for the Launchpad ERP backend. Covers every model in the schema with realistic, ample data. Designed to be run before Demo Day and safe to re-run (idempotent via wipe-then-reseed).

---

## Directory Structure

```
backend/prisma/seed/
  index.ts          ← orchestrator; clears DB, calls seeders in dependency order
  users.ts          ← User + Employee records, org tree, status mix
  teams.ts          ← Team + TeamMember
  onboarding.ts     ← OnboardingTemplate + OnboardingRecord + documents + custom fields
  offboarding.ts    ← ClearanceTemplate + ClearanceSignatory + OffboardingRecord
  surveys.ts        ← PulseSurvey + SurveyOccurrence + SurveyQuestion + SurveyAudienceConfig + SurveyReminderConfig + SurveyResponse + SurveyAnswer
  evaluations.ts    ← PerformanceEvaluation + EvaluationAcknowledgement
  notifications.ts  ← Notification feed entries
```

`backend/package.json` gains:
```json
"prisma": {
  "seed": "ts-node prisma/seed/index.ts"
}
```

---

## Running

```bash
npx prisma db seed
# or directly:
npx ts-node prisma/seed/index.ts
```

---

## Orchestration Pattern

```ts
// index.ts
async function main() {
  await clearAll(prisma)          // wipe tables in reverse-dependency order
  const users = await seedUsers(prisma)
  const teams = await seedTeams(prisma, users)
  await seedOnboarding(prisma, users)
  await seedOffboarding(prisma, users)
  await seedSurveys(prisma, users)
  await seedEvaluations(prisma, users)
  await seedNotifications(prisma, users)
}
```

Each seeder exports a single function `seed*(prisma, deps?)`. IDs are never hardcoded — each seeder returns its created records so downstream seeders can reference them by ID.

---

## Data Layout

### Users & Employees

| Email | Role | Employee Status | Notes |
|---|---|---|---|
| allenkurtds.dev@gmail.com | ADMIN | ACTIVE | Root node, no supervisor |
| vnferrer.work@gmail.com | SUPERVISOR | ACTIVE | Leads Team Alpha |
| theaverah@gmail.com | SUPERVISOR | ACTIVE | Leads Team Beta |
| darbenlamonte@gmail.com | HR | ACTIVE | Reports to Kurt |
| loretorussellkelvinanthony@gmail.com | HR | ACTIVE | Reports to Kurt |
| employee.placeholder1@gmail.com | EMPLOYEE | ACTIVE | Reports to Vn |
| employee.placeholder2@gmail.com | EMPLOYEE | ACTIVE | Reports to Vn |
| employee.placeholder3@gmail.com | EMPLOYEE | ACTIVE | Reports to Vn |
| employee.placeholder4@gmail.com | EMPLOYEE | ONBOARDING | Reports to Vn |
| employee.placeholder5@gmail.com | EMPLOYEE | INACTIVE | Reports to Vn — login blocked demo |
| employee.placeholder6@gmail.com | EMPLOYEE | ACTIVE | Reports to Thea |
| employee.placeholder7@gmail.com | EMPLOYEE | ACTIVE | Reports to Thea |
| employee.placeholder8@gmail.com | EMPLOYEE | ACTIVE | Reports to Thea |
| employee.placeholder9@gmail.com | EMPLOYEE | ACTIVE | Reports to Thea |
| employee.placeholder10@gmail.com | EMPLOYEE | OFFBOARDING | Reports to Thea |

**Org tree:**
```
Kurt (ADMIN)
├── Vn (SUPERVISOR) → placeholders 1–5
├── Thea (SUPERVISOR) → placeholders 6–10
├── Darben (HR)
└── Loreto (HR)
```

### Teams

| Team | Leader | Members |
|---|---|---|
| Team Alpha | Vn | placeholders 1–5 |
| Team Beta | Thea | placeholders 6–10 |

### Onboarding

- 1 default `OnboardingTemplate` ("Standard Onboarding")
  - Documents: Government ID (required), Employment Contract (required)
  - Custom field: Shirt Size (required)
- `OnboardingRecord` for placeholder4 (`isComplete: false`)
  - Document submissions: Government ID pending, Employment Contract not yet submitted
  - Custom field value: not yet filled

### Offboarding

- 1 default `ClearanceTemplate` ("Standard Clearance")
  - Signatories: Kurt (order 1), Vn (order 2)
- `OffboardingRecord` for placeholder10
  - Status: IN_PROGRESS
  - Signature requests: Kurt = SIGNED, Vn = PENDING

### Pulse Surveys

Both surveys created by Darben (HR).

**Survey 1 — "Q2 Engagement Check"**
- Type: ONE_TIME, closed (`isClosed: true`)
- Audience: EVERYONE
- Anonymous: false
- Visibility: SUPERVISOR_BASED
- Questions (all 5 types):
  - "How satisfied are you with your workload?" (LINEAR_SCALE, 1–5)
  - "What's one thing we could improve?" (SHORT_ANSWER)
  - "Describe your biggest challenge this quarter." (LONG_ANSWER)
  - "Which team events did you attend?" (CHECKBOX, options: Town Hall, Team Lunch, Training)
  - "How would you rate team communication?" (MULTIPLE_CHOICE, options: Poor / Fair / Good / Excellent)
- Responses: placeholders 1, 2, 3, 6, 7, 8 responded. Placeholders 4, 9, 10 did not (shows non-completion).

**Survey 2 — "Weekly Pulse"**
- Type: WEEKLY, active (`isActive: true`)
- Audience: EVERYONE
- Anonymous: true
- Visibility: HR_ROOT_ONLY
- Reminder: DAILY
- 2 occurrences: one past (closed), one current (open deadline = 7 days from seed date)
- Current occurrence responses: placeholder1, placeholder6 only (< 3 — triggers minimum group size hide for anonymous survey demo)
- ReminderConfig: frequency DAILY

**SurveyAudienceConfig:** EVERYONE type — no supervisor/team config rows needed.

### Performance Evaluations

Each supervisor creates evaluations for their direct reports (ACTIVE only).

**Per supervisor (×2):**
| # | Reviewee | State | Acknowledgement |
|---|---|---|---|
| 1 | placeholder1 (Vn) / placeholder6 (Thea) | Draft (`isSent: false`) | — |
| 2 | placeholder2 (Vn) / placeholder7 (Thea) | Sent | Acknowledged (explicit, `isDeemedAck: false`) |
| 3 | placeholder3 (Vn) / placeholder8 (Thea) | Sent | Pending (no acknowledgement row) |
| 4 | placeholder9 (Thea only) / placeholder1 again | Sent | Deemed acknowledged (`isDeemedAck: true`) |

Evaluation fields: grade 3–5 mix, realistic highlights/lowlights text, evaluation period "Q1 2026", no supportingDocUrl on drafts.

### Notifications

- Each ACTIVE employee: 1 unread IN_APP "New pulse survey available: Weekly Pulse"
- Each employee with a pending acknowledgement (placeholder3, placeholder8): 1 unread IN_APP "Reminder: You have an unacknowledged evaluation"
- Darben + Loreto: 1 read IN_APP "Survey Q2 Engagement Check has closed — results available"
- Mix of read/unread to make the notification center look realistic

---

## Idempotency

`clearAll` in `index.ts` deletes all rows in reverse-dependency order before seeding:

```
notifications → activity_logs → survey_answers → survey_responses →
evaluation_acknowledgements → performance_evaluations →
survey_reminder_configs → survey_audience_configs → survey_occurrences →
pulse_surveys → offboarding_records (+ clearance_signature_requests) →
clearance_signatories → clearance_templates →
onboarding_custom_field_values → onboarding_document_submissions →
onboarding_invitations → onboarding_records →
onboarding_custom_fields → onboarding_documents → onboarding_templates →
bulk_onboarding_jobs → team_members → teams →
employees → users
```

---

## Known Issue (out of scope for seed)

`authenticate.ts` references `firebaseUid` and `name` fields that do not exist on the `User` model. The seed creates users by email only (correct). The auth middleware needs a separate fix before Google SSO login works end-to-end.

---

## Success Criteria

- `npx prisma db seed` completes without error
- All 15 users exist in DB with correct roles and statuses
- Org tree is correct (supervisorId links)
- placeholder5 login is blocked (INACTIVE employee)
- Survey 2 anonymous result hides breakdown (< 3 responses on current occurrence)
- At least one deemed-acknowledged evaluation exists in seed data
- All models have at least one row
