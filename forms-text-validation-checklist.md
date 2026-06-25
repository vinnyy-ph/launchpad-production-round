# Forms Text Validation Audit Checklist

Use this document to bring every free-text form in line with the **gold-standard** validation used in department and team forms: profanity screening, XSS/HTML blocking, and **user-friendly** error messages (not technical strings like *"must not contain HTML or special characters"*).

Work through the checklist **one item at a time**. Check the box when the fix is merged and you have run the manual tests for that item.

---

## How to read this doc

### What “done” looks like

Each text field should run validation in this order:

1. **Profanity** — `validatePeopleNameLanguage` (or `validatePeopleFieldText`, which includes it)
2. **XSS + length** — `validatePeopleText` / `containsUnsafeText` / `safeText` (zod)
3. **Friendly copy** — `mapPeopleFieldTextError(technicalError, "Please enter a valid …")` so users never see raw XSS messages

**Reference implementation:** `frontend/src/modules/people/departments/components/department-form-dialog.tsx`

```ts
import {
  PEOPLE_TEXT_LIMITS,
  validatePeopleFieldText,
  mapPeopleFieldTextError,
} from "@/modules/people/people-text";

function validateDepartmentName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Department name is required.";

  return (
    mapPeopleFieldTextError(
      validatePeopleFieldText(trimmed, "Department name", PEOPLE_TEXT_LIMITS.DEPARTMENT_NAME),
      "Please enter a valid department name.",
    ) ?? null
  );
}
```

**Shared helpers:** `frontend/src/modules/people/people-text.ts`  
**Backend XSS mirror (no profanity on server today):** `backend/src/core/validation/text-input.ts` → `assertSafeText`

### Important limitation

**Profanity screening is frontend-only.** The backend enforces XSS/length via `assertSafeText` but does not block profanity. Client-side fixes are the primary defense for offensive language.

### Standard test payloads

Use these on every checklist item:


| Payload                     | Purpose                    | Expected when fixed                                        |
| --------------------------- | -------------------------- | ---------------------------------------------------------- |
| `Maria Santos`              | Baseline valid             | No error                                                   |
| `a < b`                     | Safe comparison (not HTML) | No error                                                   |
| `<script>alert(1)</script>` | XSS attempt                | Friendly invalid-text message (not a technical XSS string) |
| `test fuck test`            | Direct profanity           | *"Please remove any offensive or inappropriate language."* |
| `sh1t`                      | Obfuscated profanity       | Same profanity message                                     |


### How to test each item

1. Start the app: `npm run dev` (frontend `http://localhost:3000`, API `http://localhost:3001`)
2. Sign in with the role noted in the checklist item
3. Open the screen and form listed
4. Type each test payload into the field(s)
5. Confirm the **inline field error** matches the “After fix” column
6. Confirm **Save / Submit** stays disabled or shows the error (submit must not succeed)
7. For backend items (B1, B2): repeat via Swagger at `http://localhost:3001/docs` or curl after the API change

---

## Already complete (no work needed)

These forms already block profanity and show friendly XSS errors (some use `mapPeopleFieldTextError`; others fold XSS into a generic “invalid format” message — both are acceptable).


| Form                                                | File                                                                              | Route / how to open                          |
| --------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------- |
| Add / rename department                             | `frontend/src/modules/people/departments/components/department-form-dialog.tsx`   | HR → Directory → Departments tab             |
| Create team                                         | `frontend/src/modules/people/teams/components/create-team-dialog.tsx`             | HR → Teams → Add team                        |
| Rename team                                         | `frontend/src/modules/people/teams/components/team-details-view.tsx`              | HR/Supervisor → Teams → team detail → rename |
| Onboarding doc + custom field labels                | `frontend/src/modules/people/onboarding/components/onboarding-setup-panel.tsx`    | HR → Onboarding setup                        |
| Clearance template version                          | `frontend/src/modules/people/offboarding/components/clearance-version-dialog.tsx` | HR → Offboarding → Clearances                |
| HR employee details modal                           | `frontend/src/modules/people/employees/components/employee-details-modal.tsx`     | HR → Directory → click employee              |
| Employee onboarding profile + custom fields         | `frontend/src/screens/employee/onboarding.page.tsx`                               | Employee → Onboarding                        |
| HR add employee (names, emails, job title, address) | `frontend/src/modules/people/onboarding/components/add-employee-dialog.tsx`       | HR → Directory → Add employee                |


**Out of scope:** Search/filter inputs (`SearchInput`, directory filters, combobox search) — not persisted. Dev kit page (`frontend/src/app/(dev)/kit/page.tsx`) — not production.

---

## Frontend checklist

### 1. Edit my profile

- [ ] **Done**


|            |                                                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **File**   | `frontend/src/modules/people/employees/components/edit-my-profile-dialog.tsx`                                                         |
| **Route**  | `/employee/profile` → Edit profile                                                                                                    |
| **Role**   | Employee                                                                                                                              |
| **Fields** | First / middle / last name, personal email, street address, city, province, country, emergency contact name, emergency contact number |


**Current gap:** Uses `validatePeopleText` only. No profanity check. XSS failures are folded into generic format messages (acceptable for XSS) but profanity passes through.


| Scenario                 | Before (today)                                    | After fix                                                  |
| ------------------------ | ------------------------------------------------- | ---------------------------------------------------------- |
| Profanity in first name  | May save / no profanity error                     | *"Please remove any offensive or inappropriate language."* |
| XSS in address           | Generic: *"Please enter a valid street address…"* | Same friendly message (keep)                               |
| Valid `a < b` in address | Should pass                                       | Should pass                                                |


**Fix sketch:** Import `validatePeopleNameLanguage` or switch fields to `validatePeopleFieldText` + `mapPeopleFieldTextError` with existing `PROFILE_FIELD_MESSAGES` fallbacks.

**Manual test steps**

1. Sign in as an employee with an active profile
2. Go to **Profile** → **Edit profile**
3. In **First name**, type `test fuck test` → expect profanity error under field; Save blocked
4. In **Street address**, type `<script>alert(1)</script>` → expect friendly address error; Save blocked
5. In **City**, type `Makati` → no error
6. Save with all valid values → success toast

---

### 2. Admin invite user

- [x] **Done**


|            |                                                                  |
| ---------- | ---------------------------------------------------------------- |
| **File**   | `frontend/src/screens/admin/users.page.tsx` (`InviteUserDialog`) |
| **Route**  | `/admin/users` → Invite user                                     |
| **Role**   | Admin                                                            |
| **Fields** | First name, last name, email                                     |


**Current gap:** `validatePeopleText` only — no profanity; XSS folded into `ADD_USER_FIELD_MESSAGES`.


| Scenario                | Before                                                           | After fix                                   |
| ----------------------- | ---------------------------------------------------------------- | ------------------------------------------- |
| Profanity in first name | Generic: *"Please enter a valid first name using letters only."* | Profanity message first                     |
| XSS in email            | Generic email error                                              | Friendly email error (unchanged wording OK) |


**Fix sketch:** Mirror `department-form-dialog.tsx` — `validatePeopleFieldText` + `mapPeopleFieldTextError` per field.

**Manual test steps**

1. Sign in as Admin
2. Go to **Users** → **Invite user**
3. First name: `sh1t` → profanity error; Invite blocked
4. Email: `bad<script>@test.com` → friendly email error; Invite blocked
5. Valid invite → success

---

### 3. HR employee profile inline edit

- [x] **Done**


|            |                                                                  |
| ---------- | ---------------------------------------------------------------- |
| **File**   | `frontend/src/screens/hr/employee-profile.page.tsx`              |
| **Route**  | `/hr/directory/[id]` → pencil icon → edit job title / department |
| **Role**   | HR                                                               |
| **Fields** | Job title, department (free text)                                |


**Current gap:** `validatePeopleText` only. Department uses `mapPeopleFieldTextError` for XSS but neither field checks profanity.


| Scenario                | Before                | After fix             |
| ----------------------- | --------------------- | --------------------- |
| Profanity in job title  | May save              | Profanity message     |
| XSS in department       | Friendly dept message | Keep friendly message |
| Profanity in department | May save              | Profanity message     |


**Fix sketch:** Replace `validatePeopleText` with `validatePeopleFieldText` + `mapPeopleFieldTextError` for both fields.

**Manual test steps**

1. Sign in as HR
2. Open any employee from **Directory**
3. Click edit → change **Job title** to `f*ck` → profanity error on save
4. Change **Department** to `<img src=x>` → friendly department error
5. Valid values → **Profile updated** toast

---

### 4. HR add employee — location fields

- [x] **Done**


|            |                                                                             |
| ---------- | --------------------------------------------------------------------------- |
| **File**   | `frontend/src/modules/people/onboarding/components/add-employee-dialog.tsx` |
| **Route**  | `/hr/directory` → Add employee → Optional details (city, province, country) |
| **Role**   | HR                                                                          |
| **Fields** | City, province, country                                                     |


**Current gap:** Uses `validatePeopleFieldText` (profanity OK) but **without** `mapPeopleFieldTextError` — XSS shows technical message like *"City must not contain HTML or special characters."*


| Scenario          | Before               | After fix                                             |
| ----------------- | -------------------- | ----------------------------------------------------- |
| XSS in city       | Technical XSS string | Friendly message, e.g. *"Please enter a valid city."* |
| Profanity in city | Profanity message    | Unchanged                                             |


**Fix sketch:** Add `city` / `province` / `country` entries to `ADD_EMPLOYEE_FIELD_MESSAGES`, then wrap location validation:

```ts
mapPeopleFieldTextError(
  validatePeopleFieldText(value, "City", PEOPLE_TEXT_LIMITS.LOCATION),
  ADD_EMPLOYEE_FIELD_MESSAGES.city,
)
```

**Manual test steps**

1. HR → **Directory** → **Add employee**
2. Fill required fields with valid data
3. Expand optional address → **City**: `<script>x</script>` → friendly error (not technical)
4. **City**: `sh1t` → profanity error
5. Valid city/province/country → onboarding starts successfully

---

### 5. Clearance sign / reject notes

- [ ] **Done**


|            |                                                                                      |
| ---------- | ------------------------------------------------------------------------------------ |
| **File**   | `frontend/src/modules/people/offboarding/components/assigned-clearances-section.tsx` |
| **Route**  | `/employee/clearance` or Home dashboard clearance section                            |
| **Role**   | Employee (signatory)                                                                 |
| **Fields** | Optional sign note, required reject reason                                           |


**Current gap:** `validatePeopleText` only — technical XSS message in UI/toast; no profanity. Backend already uses `assertSafeText` on notes (`backend/src/modules/people/offboarding/clearance/clearance.validation.ts`).


| Scenario               | Before                                                            | After fix           |
| ---------------------- | ----------------------------------------------------------------- | ------------------- |
| XSS in reject reason   | *"Rejection reason must not contain HTML or special characters."* | Friendly note error |
| Profanity in sign note | May submit                                                        | Profanity message   |


**Fix sketch:** `validatePeopleFieldText` + `mapPeopleFieldTextError` with fallbacks like *"Please enter a valid note using letters, numbers, spaces, and common punctuation only."*

**Manual test steps**

1. Sign in as employee who has a pending clearance to sign
2. Open clearance from **Home** or **Clearance**
3. **Reject** → reason `<script>alert(1)</script>` → inline friendly error; confirm disabled
4. **Reject** → reason `test fuck test` → profanity error
5. **Sign** with optional note containing profanity → blocked
6. Valid reject reason → success toast

---

### 6. Reject onboarding document

- [x] **Done**


|            |                                                                                          |
| ---------- | ---------------------------------------------------------------------------------------- |
| **File**   | `frontend/src/modules/people/onboarding/components/documents/reject-document-dialog.tsx` |
| **Route**  | `/hr/onboarding/[id]` → Reject on a document                                             |
| **Role**   | HR                                                                                       |
| **Fields** | Rejection reason                                                                         |


**Current gap:** Friendly XSS via `containsUnsafeText` + regex (`REJECTION_NOTE_MESSAGES.content`). **No profanity** check. Backend has `assertSafeText` on `rejectionNote`.


| Scenario            | Before                   | After fix         |
| ------------------- | ------------------------ | ----------------- |
| Profanity in reason | May submit               | Profanity message |
| XSS in reason       | Friendly content message | Unchanged         |


**Fix sketch:** Run `validatePeopleNameLanguage(trimmed)` before existing checks; return `PEOPLE_NAME_LANGUAGE_MESSAGE` when set.

**Manual test steps**

1. HR → open an onboarding case with a pending document
2. Click **Reject** on a submission
3. Reason: `Please fix this sh1t scan` → profanity error; Reject disabled
4. Reason: `<script>alert(1)</script>` → existing friendly content error
5. Valid reason → document rejected

---

### 7. Take pulse survey (employee answers)

- [x] **Done**


|            |                                                                                                                                         |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Files**  | `frontend/src/modules/performance/surveys/components/take-survey-dialog.tsx`, `questions/short-answer.tsx`, `questions/long-answer.tsx` |
| **Route**  | `/employee/surveys` → Take survey                                                                                                       |
| **Role**   | Employee                                                                                                                                |
| **Fields** | SHORT_ANSWER and LONG_ANSWER question responses                                                                                         |


**Current gap:** **No text validation** — only “required question” checks. Backend also lacks `assertSafeText` on `answerText` (see **B1**).


| Scenario              | Before         | After fix                                 |
| --------------------- | -------------- | ----------------------------------------- |
| XSS in answer         | May submit     | Inline error per question; submit blocked |
| Profanity in answer   | May submit     | Profanity message                         |
| Empty required answer | Required nudge | Unchanged                                 |


**Fix sketch:** In `take-survey-dialog.tsx` `validate()`, for SHORT_ANSWER/LONG_ANSWER values run `validatePeopleFieldText` (or `safeText` + profanity) and set per-question errors. Pair with backend **B1**.

**Manual test steps**

1. HR: create/activate a pulse survey with one short-answer and one long-answer question
2. Employee → **Surveys** → take the survey
3. Short answer: `<script>x</script>` → error under question
4. Long answer: `this is fucking terrible` → profanity error
5. Valid answers → submit succeeds
6. After **B1**: bypass UI with Swagger POST respond — API returns 400 for XSS

---

### 8. Survey builder (HR)

- [x] **Done**


|            |                                                                                                           |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| **Files**  | `frontend/src/modules/performance/surveys/components/survey-builder.tsx`, `schemas/survey-form.schema.ts` |
| **Route**  | `/hr/surveys` → Create / edit survey                                                                      |
| **Role**   | HR                                                                                                        |
| **Fields** | Survey name, question text, multiple-choice options, scale min/max labels                                 |


**Current gap:** Zod `safeText` — XSS with **technical** messages (*"Name must not contain HTML or special characters."*); no profanity. Backend `surveys.validation.ts` already uses `assertSafeText`.


| Scenario                   | Before                | After fix           |
| -------------------------- | --------------------- | ------------------- |
| XSS in survey name         | Technical zod message | Friendly name error |
| Profanity in question text | May save              | Profanity message   |


**Fix sketch:** After `safeParse`, map errors through `mapPeopleFieldTextError`; add profanity via `validatePeopleNameLanguage` on text fields, or use `validatePeopleFieldText` in the builder's validate function.

**Manual test steps**

1. HR → **Surveys** → **Create survey**
2. Name: `<script>alert(1)</script>` → friendly error on save
3. Add short-answer question; text: `What the fuck?` → profanity error
4. Valid survey → saves as draft

---

### 9. Supervisor evaluation editor

- [x] **Done**


|            |                                                                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Files**  | `frontend/src/screens/supervisor/evaluations.page.tsx` (`EvaluationEditorDialog`), `modules/performance/evaluations/schemas/evaluation-form.schema.ts` |
| **Route**  | `/supervisor/evaluations` → New / edit evaluation                                                                                                      |
| **Role**   | Supervisor                                                                                                                                             |
| **Fields** | Overall summary, recommendation, highlights[], lowlights[]                                                                                             |


**Current gap:** `evaluationTextSchema` / `safeText` — technical XSS messages; no profanity. Backend `evaluations.validation.ts` already uses `assertSafeText`.


| Scenario               | Before                | After fix              |
| ---------------------- | --------------------- | ---------------------- |
| XSS in overall summary | Technical zod message | Friendly summary error |
| Profanity in highlight | May save draft/send   | Profanity message      |


**Fix sketch:** In `textErrors()`, map zod issues through friendly fallbacks; add profanity check on each free-text field before or after zod parse.

**Manual test steps**

1. Supervisor → **Evaluations** → create evaluation for a report
2. Overall summary: `<script>x</script>` → error under summary field
3. Highlight: `sh1t performance` → profanity error
4. Valid text → save draft succeeds

---

### 10. HR correct invitation email

- [x] **Done**


|            |                                                                                        |
| ---------- | -------------------------------------------------------------------------------------- |
| **File**   | `frontend/src/screens/hr/onboarding-detail.page.tsx` (Correct invitation email dialog) |
| **Route**  | `/hr/onboarding/[id]` → Correct invitation email                                       |
| **Role**   | HR                                                                                     |
| **Fields** | Work email                                                                             |


**Current gap:** Email format regex only (`EMAIL_RE`) — no `validatePeopleText` / profanity / XSS checks. Backend `invitation.validation.ts` also lacks `assertSafeText` (see **B4**).


| Scenario                | Before                     | After fix                         |
| ----------------------- | -------------------------- | --------------------------------- |
| XSS in email            | May submit if regex passes | Friendly email error              |
| Profanity in local part | May submit                 | Profanity or friendly email error |


**Fix sketch:** Use `validatePeopleFieldText` + `mapPeopleFieldTextError` with *"Enter a valid email address."* fallback. Pair with **B4**.

**Manual test steps**

1. HR → open an onboarding case with a pending invitation
2. **Correct invitation email** → email: `bad<script>@test.com` → inline error; Update blocked
3. Email: `fuck@example.com` → profanity or friendly error
4. Valid email → invitation updated and resent

---

### 11. HR share small-team survey note

- [x] **Done**


|            |                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------ |
| **File**   | `frontend/src/modules/performance/surveys/components/survey-results.tsx` (`SmallTeamSharePanel`) |
| **Route**  | `/hr/surveys` → survey results → small anonymous team share panel                                |
| **Role**   | HR                                                                                               |
| **Fields** | Message to supervisor (max 2000 chars)                                                           |


**Current gap:** **Length only** on client — no XSS or profanity. Backend `share.service.ts` checks length only (see **B2**).


| Scenario             | Before   | After fix                  |
| -------------------- | -------- | -------------------------- |
| XSS in message       | May send | Inline error; send blocked |
| Profanity in message | May send | Profanity message          |


**Fix sketch:** Before confirm dialog, run `validatePeopleFieldText(trimmed, "Message", 2000)` + `mapPeopleFieldTextError` with a supervisor-note fallback.

**Manual test steps**

1. HR → survey with a completed occurrence and a team with < 3 responses (anonymous)
2. Open results → find **Share with the team's supervisor** panel
3. Message: `<script>alert(1)</script>` → inline error; Send blocked
4. Message: `team morale is sh1t` → profanity error
5. Valid professional note → send succeeds
6. After **B2**: API rejects XSS if UI bypassed

---

## Backend checklist

Pair backend work with the matching frontend item so API and UI stay aligned.

### B1. Pulse survey response `answerText`

- [x] **Done** (pair with frontend **#7**)


|              |                                                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Files**    | `backend/src/modules/performance/surveys/rules/answer-validation.ts`, `backend/src/modules/performance/surveys/responses/responses.validation.ts` |
| **Endpoint** | `POST /api/v1/pulse/occurrences/:occurrenceId/respond`                                                                                            |
| **Gap**      | `answerText` validated for presence/shape only — no `assertSafeText`                                                                              |


**Fix sketch:** In `answer-validation.ts` SHORT_ANSWER/LONG_ANSWER branch, call `assertSafeText(answerText.trim(), "answerText", LIMIT)` with an appropriate max length constant.

**API test (Swagger or curl)**

1. Employee bearer token
2. POST respond with `answerText: "<script>alert(1)</script>"` → **400** with stable validation message
3. POST with `answerText: "Honest feedback"` → **200/201**

---

### B2. Share small-team results `message`

- [x] **Done** (pair with frontend **#11**)


|              |                                                                    |
| ------------ | ------------------------------------------------------------------ |
| **File**     | `backend/src/modules/performance/surveys/results/share.service.ts` |
| **Endpoint** | `POST /api/v1/pulse/surveys/:id/results/share`                     |
| **Gap**      | Length check only — no `assertSafeText` on HR note                 |


**Fix sketch:** After length checks in `shareSmallTeamResults`, add `assertSafeText(note, "message", SURVEY_TEXT_LIMITS.SHARE_MESSAGE)`.

**API test**

1. HR bearer token
2. POST share with `message` containing `<script>x</script>` → **400**
3. Valid message → **200**

---

### B3. Clearance sign/reject notes (backend already OK)

- [x] **No backend work** — `clearance.validation.ts` already calls `assertSafeText` on notes. Only frontend **#5** needs changes.

---

### B4. Update invitation email

- [x] **Done** (pair with frontend **#10**)


|              |                                                                             |
| ------------ | --------------------------------------------------------------------------- |
| **File**     | `backend/src/modules/people/onboarding/invitation/invitation.validation.ts` |
| **Endpoint** | `PATCH /api/v1/onboarding/invitations/:invitationId/email` (or equivalent)  |
| **Gap**      | Email format regex only — no `assertSafeText`                               |


**Fix sketch:** After format check in `parseUpdateEmailBody`, add `assertSafeText(email, "email", PEOPLE_TEXT_LIMITS.EMAIL)`.

**API test**

1. HR bearer token
2. PATCH with `email: "x<script>@test.com"` → **400**
3. Valid email → **200**

---

## Suggested fix order

1. People forms: **#1 → #2 → #3 → #4 → #5 → #6 → #10 + B4** (smallest, same helpers)
2. Performance forms: **#7 + B1**, **#8**, **#9**, **#11 + B2**
3. Run `npm test -w frontend -- people-text` after helper changes
4. Run `npm test -w backend` after B1/B2

---

## Coverage notes (audit cross-check)

All production `Input` / `Textarea` forms were reviewed. Mapping:


| Component                                              | Status                                                     |
| ------------------------------------------------------ | ---------------------------------------------------------- |
| `department-form-dialog.tsx`                           | Complete                                                   |
| `create-team-dialog.tsx` / `team-details-view.tsx`     | Complete                                                   |
| `onboarding-setup-panel.tsx` / `custom-field-form.tsx` | Complete (validation in parent)                            |
| `clearance-version-dialog.tsx`                         | Complete                                                   |
| `employee-details-modal.tsx`                           | Complete                                                   |
| `onboarding.page.tsx`                                  | Complete                                                   |
| `add-employee-dialog.tsx`                              | Partial → **#4**                                           |
| `edit-my-profile-dialog.tsx` / `ph-address-fields.tsx` | Gap → **#1**                                               |
| `users.page.tsx` InviteUserDialog                      | Gap → **#2**                                               |
| `employee-profile.page.tsx`                            | Gap → **#3**                                               |
| `assigned-clearances-section.tsx`                      | Gap → **#5**                                               |
| `reject-document-dialog.tsx`                           | Gap → **#6**                                               |
| `onboarding-detail.page.tsx` (correct invite email)    | Gap → **#10**                                              |
| `take-survey-dialog.tsx` + short/long answer           | Gap → **#7**                                               |
| `survey-builder.tsx`                                   | Gap → **#8**                                               |
| `supervisor/evaluations.page.tsx`                      | Gap → **#9**                                               |
| `survey-results.tsx` share panel                       | Gap → **#11**                                              |
| `search-input.tsx`, phone inputs, combobox search      | Out of scope                                               |
| `initiate-offboarding-dialog.tsx`                      | No free-text fields                                        |
| `bulk-upload-dropzone.tsx`                             | CSV → server preview validates via `onboarding.validation` |
| `(dev)/kit/page.tsx`                                   | Dev only                                                   |


---

*Last audited: 2026-06-25*