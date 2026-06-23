# Performance Module — Text Input Validation & XSS Hardening

**Date:** 2026-06-23
**Status:** Approved

## Problem / Why

The performance module's create/update survey and create/update evaluation
endpoints accept free-text fields with **no length caps and no content
validation** — they only check that values are typed as strings.

Unvalidated free-text fields today:

- **Survey:** `name`, `questionText`, `scaleMinLabel`, `scaleMaxLabel`, and
  question `options[]` (the option array currently passes through without even
  per-element type/length checks).
- **Evaluation:** `evaluation`, `recommendation`, `highlights[]`, `lowlights[]`.

### Current XSS posture

- **Frontend (primary defense):** Next.js/React auto-escapes interpolated text
  in JSX. The only `dangerouslySetInnerHTML` is in `chart.tsx`, fed by
  controlled theme config (not user input) — safe. The React app is therefore
  largely protected by default escaping.
- **Backend CSP:** Helmet is configured in `app.ts`, but `scriptSrc` includes
  `'unsafe-inline'` (materially weakens CSP) and the CSP is applied to the JSON
  API, not the Next.js app that renders HTML — so it adds little real XSS
  protection.
- **The actual exposure:** the same stored text is re-rendered in **non-React
  contexts** — HTML email templates (raw HTML strings) and AI insight prompts.
  React escaping does not protect those. Unsanitized stored text is a
  stored-XSS / HTML-injection vector the moment it leaves React, and unbounded
  length is a DB-bloat / layout-break / cost (DoS) problem.

**Conclusion:** validate and normalize at the API trust boundary rather than
trusting every downstream consumer to escape correctly. Defense in depth.

## Decisions

- **Strategy:** reject (do not strip/sanitize) + length caps. Store text
  verbatim; rely on context-aware escaping at each output. No new dependency.
  Avoids silently mangling legitimate content (e.g. `a < b`).
- **Frontend:** zod schemas as the single source of truth, validated via
  `safeParse` against the existing `useState` forms. **No react-hook-form
  refactor** — the performance forms (`survey-builder.tsx`,
  `review-evaluation-dialog.tsx`) use `useState`, and converting a 1,656-line
  component to RHF would be a large, non-surgical change.
- **Tests:** validation-focused supertest tests in the existing
  `src/tests/surveys` and `src/tests/evaluations` suites.

## Design

### 1. Shared backend helper (new)

`backend/src/core/validation/text-input.ts`:

- `assertSafeText(value: string, field: string, maxLen: number): void` — throws
  on:
  - length > `maxLen`
  - tag-like content: matches `/<[a-zA-Z!/]/` (blocks `<script`, `<img …`,
    `</div>`, `<!--`; allows `a < b`, `5 > 3`, `<3`)
  - disallowed control chars: `/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/`
    (tab/newline/CR allowed)
- Error message suffixes are stable and matchable:
  - length → `"<field> must be <N> characters or fewer"`
  - content → `"<field> must not contain HTML or control characters"`

### 2. Backend wiring

- **Surveys** (`surveys.validation.ts`): apply to `name`, `questionText`,
  `scaleMinLabel`, `scaleMaxLabel`, and **each `options[]` element** (also fixes
  the missing per-element validation) in both `parseCreateBody` and
  `parseUpdateBody`. Limits in `surveys.constants.ts`.
- **Evaluations** (`evaluations.validation.ts`): apply to `evaluation`,
  `recommendation`, each `highlights[]`/`lowlights[]` item in both
  `parseCreateBody` and `parseUpdateBody`. Limits in `evaluations.constants.ts`.
- **Controller error mapping:** extend `isValidationError()` in both
  `evaluations.controller.ts` and `surveys.controller.ts` to recognize the new
  message suffixes (`"characters or fewer"`, `"must not contain"`, `options`)
  so they map to HTTP 400 instead of falling through to 500.

### 3. Length limits

| Field | Max |
|---|---|
| Survey `name` | 200 |
| `questionText` | 500 |
| `scaleMinLabel` / `scaleMaxLabel` | 100 |
| question `option` (each) | 200 |
| Evaluation `evaluation` / `recommendation` | 5000 |
| `highlights` / `lowlights` (each item) | 1000 |

### 4. Frontend (zod, no RHF)

- New `survey-form.schema.ts` and `evaluation-form.schema.ts` mirroring backend
  limits + the same tag/control-char refine.
- Validate via `safeParse` on submit and per-field onChange against the existing
  `useState` forms; surface inline errors; add `maxLength` to inputs.

### 5. Backend tests (supertest)

Add to `src/tests/surveys` and `src/tests/evaluations`:

- Over-length input → 400.
- HTML/script payloads (`<script>alert(1)</script>`, `<img src=x onerror=…>`)
  → 400 on every covered field.
- Per-element `options` / `highlights` / `lowlights` rejection.
- Benign edge cases (`a < b`) → still pass.
- Valid input → still succeeds (regression guard).

## Out of scope

- Helmet CSP `'unsafe-inline'` hardening.
- Email-template output escaping.

Both are real follow-ups but separate from this change.
