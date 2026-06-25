# Hybrid Supporting Docs (File Upload + Validated URL) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a supervisor attach supporting documents to a performance evaluation as either uploaded PDF files (existing) **or** pasted https URLs (new), stored together and capped at 5 total.

**Architecture:** Replace the flat `supportingDocUrls String[]` column with a single JSON column `supportingDocs` holding a typed array of `{ kind: "file" | "link", url, label }`. The controller builds `file` entries from Cloudinary uploads (unchanged) and `link` entries from validated body fields, enforces a combined cap of 5, and persists the merged array. The download endpoint signs `file` entries via Cloudinary and returns `link` entries as-is. The frontend gains a link input beside the existing PDF picker and renders both kinds in one list.

**Tech Stack:** TypeScript, Express, Prisma (PostgreSQL), Cloudinary, React, Jest. URL validation uses the native WHATWG `URL` constructor — **no new dependency**.

## Global Constraints

- Backend directory: `/home/kurtds/dev/work/launchpad-production-round/backend`
- Frontend directory: `/home/kurtds/dev/work/launchpad-production-round/frontend`
- URL rule: accept only well-formed **https** URLs; reject `http:`, `javascript:`, `data:`, `file:`, and malformed input. No host allowlist.
- Limit: **5 supporting docs total** (uploaded files + existing files + pasted links combined).
- File constraints unchanged: PDF only, 10 MB max, signed Cloudinary download.
- Entry shape (the single source of truth, mirrored back and front):
  ```ts
  type SupportingDoc =
    | { kind: "file"; url: string; label: string }  // url = Cloudinary public_id, label = original filename
    | { kind: "link"; url: string; label: string }; // url = normalized https URL, label = display name (defaults to hostname)
  ```
- **Wire contract (multipart, both create and update):**
  - `files` — new PDF uploads (bytes). Existing behavior.
  - `links` — repeated field; each value is a JSON string `{"url":"…","label":"…"}` (label optional). The **full** set of links the evaluation should have.
  - `keepFiles` — repeated field; each value is the **url (Cloudinary public_id)** of an existing *file* doc to retain. URLs only — labels come from the stored record, never the client.
  - `docsManaged` — `"1"` whenever the editor owns the docs section (always, from the editor). Lets *update* distinguish "rebuild docs" (even to empty = cleared) from "docs untouched".
- **Edit semantics:** the editor always sends the complete intended doc set. On **update**, the backend computes the final set as `retained existing file docs (∩ keepFiles, verified against the evaluation's own current docs) + newly uploaded files + links`, capped at 5. This prevents silent loss of already-attached files and blocks a client from injecting a foreign Cloudinary id via `keepFiles`.
- Frontend styling: reuse existing `@/shared/ui` primitives (`Button`, etc.) and the established CSS tokens (`--text-primary`, `--text-tertiary`, `--border-primary`, `--bg-secondary`, `hsl(var(--primary))`, `--color-error-600`). Match the existing `PdfFilePicker` look. Do **not** introduce new colors or component libraries (Jia brandbook compliance).
- **Do not run `git commit`** — per the user's instruction, each task ends at a green build/test, not a commit. The reviewer commits manually.
- Backend verification commands (run from `backend/`): `npm run test` and `npm run build`. Frontend (run from `frontend/`): `npm run test` and `npm run build`.

---

## File Structure

**Backend (create):**
- `src/modules/performance/evaluations/supporting-doc.types.ts` — the `SupportingDoc` union (shared contract) + `validateSupportingLink`.

**Backend (modify):**
- `src/prisma/schema/models/performance-evaluation.prisma` — column swap.
- `prisma/migrations/<ts>_add_supporting_docs_json/migration.sql` — generated + hand-edited backfill.
- `src/modules/performance/evaluations/evaluations.constants.ts` — new error messages.
- `src/modules/performance/evaluations/dto/{create,update}-evaluation-input.dto.ts`, `{create,update}-evaluation-data.dto.ts`, `evaluation-response.dto.ts` — field rename + type.
- `src/modules/performance/evaluations/evaluations.service.ts` — field rename + `toResponse`.
- `src/modules/performance/evaluations/evaluations.repository.ts` — field rename.
- `src/modules/performance/evaluations/evaluations.controller.ts` — build entries, combined cap, kind-aware download.
- `src/modules/performance/evaluations/evaluations.routes.ts` — error mapping (no structural change).

**Backend (tests):**
- `src/modules/performance/evaluations/supporting-doc.types.test.ts` — new, link validation unit tests.
- `src/tests/evaluations/{create,update}-evaluation.test.ts`, `evaluations-test.helpers.ts`, `download-document.test.ts` (new if absent).

**Frontend (modify):**
- `src/modules/performance/evaluations/types/evaluations.types.ts` — `SupportingDoc`, `Evaluation.supportingDocs`, `EvaluationInput.links`.
- `src/modules/performance/evaluations/services/evaluations.service.ts` — FormData `links`, kind-aware open.
- `src/screens/supervisor/evaluations.page.tsx` — `LinkPicker` component + editor wiring + preview render.
- `src/modules/performance/evaluations/components/review-evaluation-dialog.tsx` — render by kind.

---

## Task 1: Schema swap + migration with backfill

**Files:**
- Modify: `backend/src/prisma/schema/models/performance-evaluation.prisma:14`
- Create: `backend/prisma/migrations/<timestamp>_add_supporting_docs_json/migration.sql`

**Interfaces:**
- Produces: a `supportingDocs Json @default("[]")` column on `performance_evaluations`; existing rows backfilled to `{kind:"file"}` entries.

- [ ] **Step 1: Edit the Prisma model**

In `backend/src/prisma/schema/models/performance-evaluation.prisma`, replace line 14:
```prisma
  supportingDocUrls String[]
```
with:
```prisma
  supportingDocs   Json      @default("[]")
```

- [ ] **Step 2: Generate the migration without applying it**

From `backend/`:
```bash
npx prisma migrate dev --name add_supporting_docs_json --create-only
```
Expected: a new folder `prisma/migrations/<timestamp>_add_supporting_docs_json/` containing `migration.sql`.

- [ ] **Step 3: Replace the generated SQL with an additive backfill**

Overwrite that `migration.sql` with (keep the real generated column types if they differ, but this is the intended effect):
```sql
-- Add the new JSON column
ALTER TABLE "performance_evaluations"
  ADD COLUMN "supportingDocs" JSONB NOT NULL DEFAULT '[]';

-- Backfill: each existing Cloudinary public_id becomes a file entry.
-- label = the segment after the last "/" in the public_id.
UPDATE "performance_evaluations" e
SET "supportingDocs" = COALESCE((
  SELECT jsonb_agg(
    jsonb_build_object(
      'kind', 'file',
      'url', u,
      'label', regexp_replace(u, '^.*/', '')
    )
  )
  FROM unnest(e."supportingDocUrls") AS u
), '[]'::jsonb)
WHERE array_length(e."supportingDocUrls", 1) IS NOT NULL;

-- Drop the old column
ALTER TABLE "performance_evaluations" DROP COLUMN "supportingDocUrls";
```

- [ ] **Step 4: Apply the migration and regenerate the client**

From `backend/`:
```bash
npx prisma migrate dev
```
Expected: migration applies cleanly; `PerformanceEvaluation.supportingDocs` is typed as `Prisma.JsonValue` in the generated client.

- [ ] **Step 5: Verify the schema compiles**

From `backend/`:
```bash
npx prisma validate
```
Expected: "The schema is valid 🚀". (Type errors in app code are expected until later tasks — that's fine here.)

---

## Task 2: Shared `SupportingDoc` type, link validation, error constants

**Files:**
- Create: `backend/src/modules/performance/evaluations/supporting-doc.types.ts`
- Create: `backend/src/modules/performance/evaluations/supporting-doc.types.test.ts`
- Modify: `backend/src/modules/performance/evaluations/evaluations.constants.ts`

**Interfaces:**
- Produces:
  - `type SupportingDoc = { kind: "file" | "link"; url: string; label: string }` (discriminated union as in Global Constraints).
  - `validateSupportingLink(rawUrl: string, rawLabel?: string): SupportingDoc` — trims, validates https, returns a `link` entry; throws `Error(EVAL_UPLOAD_ERROR_MESSAGES.INVALID_URL)` on failure.
  - `EVAL_UPLOAD_ERROR_MESSAGES.INVALID_URL` and `.TOO_MANY_DOCS` constants.

- [ ] **Step 1: Add error constants**

In `backend/src/modules/performance/evaluations/evaluations.constants.ts`, extend `EVAL_UPLOAD_ERROR_MESSAGES`:
```ts
export const EVAL_UPLOAD_ERROR_MESSAGES = {
  TOO_MANY_FILES: "Too many files — maximum 5 allowed",
  INVALID_FILE_TYPE: "Only PDF files are allowed",
  FILE_TOO_LARGE: "File size exceeds the 10 MB limit",
  INVALID_URL: "Supporting link must be a valid https URL",
  TOO_MANY_DOCS: "Too many supporting documents — maximum 5 (files + links) allowed",
} as const;
```

- [ ] **Step 2: Write the failing test**

Create `backend/src/modules/performance/evaluations/supporting-doc.types.test.ts`:
```ts
import { validateSupportingLink } from "./supporting-doc.types";
import { EVAL_UPLOAD_ERROR_MESSAGES } from "./evaluations.constants";

describe("validateSupportingLink", () => {
  it("accepts a well-formed https URL and defaults the label to the hostname", () => {
    const doc = validateSupportingLink("https://drive.google.com/file/d/abc/view");
    expect(doc).toEqual({
      kind: "link",
      url: "https://drive.google.com/file/d/abc/view",
      label: "drive.google.com",
    });
  });

  it("uses a provided label when present, trimmed", () => {
    const doc = validateSupportingLink("https://example.com/doc", "  Q2 goals  ");
    expect(doc.label).toBe("Q2 goals");
  });

  it("trims surrounding whitespace from the URL", () => {
    const doc = validateSupportingLink("  https://example.com/doc  ");
    expect(doc.url).toBe("https://example.com/doc");
  });

  it.each([
    ["http://insecure.com", "http scheme"],
    ["javascript:alert(1)", "javascript scheme"],
    ["data:text/html,<script>", "data scheme"],
    ["file:///etc/passwd", "file scheme"],
    ["not a url", "garbage"],
    ["", "empty"],
    ["   ", "whitespace only"],
  ])("rejects %s (%s)", (input) => {
    expect(() => validateSupportingLink(input)).toThrow(EVAL_UPLOAD_ERROR_MESSAGES.INVALID_URL);
  });
});
```

- [ ] **Step 2b: Run it to confirm it fails**

From `backend/`:
```bash
npm run test -- supporting-doc.types
```
Expected: FAIL — `validateSupportingLink` / module not found.

- [ ] **Step 3: Implement the module**

Create `backend/src/modules/performance/evaluations/supporting-doc.types.ts`:
```ts
import { EVAL_UPLOAD_ERROR_MESSAGES } from "./evaluations.constants";

/** A supporting document attached to an evaluation: an uploaded file or a pasted link. */
export type SupportingDoc =
  | { kind: "file"; url: string; label: string }
  | { kind: "link"; url: string; label: string };

/**
 * Validates and normalizes a user-supplied supporting link. Only well-formed https URLs
 * are accepted — this also blocks javascript:/data:/file: schemes and malformed input.
 * The link's display label defaults to the URL hostname when none is provided.
 * Throws Error(EVAL_UPLOAD_ERROR_MESSAGES.INVALID_URL) on any invalid input.
 */
export function validateSupportingLink(rawUrl: string, rawLabel?: string): SupportingDoc {
  const trimmed = (rawUrl ?? "").trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(EVAL_UPLOAD_ERROR_MESSAGES.INVALID_URL);
  }

  if (parsed.protocol !== "https:") {
    throw new Error(EVAL_UPLOAD_ERROR_MESSAGES.INVALID_URL);
  }

  const label = rawLabel?.trim() || parsed.hostname;

  return { kind: "link", url: parsed.toString(), label };
}
```
Note: `new URL("https://example.com/doc")` normalizes to `"https://example.com/doc"` (no trailing slash added to a path). The test's expected values match this.

- [ ] **Step 4: Run the test to confirm it passes**

From `backend/`:
```bash
npm run test -- supporting-doc.types
```
Expected: PASS (all cases).

---

## Task 3: DTOs — rename `supportingDocUrls` → `supportingDocs`

**Files:**
- Modify: `backend/src/modules/performance/evaluations/dto/create-evaluation-input.dto.ts`
- Modify: `backend/src/modules/performance/evaluations/dto/update-evaluation-input.dto.ts`
- Modify: `backend/src/modules/performance/evaluations/dto/create-evaluation-data.dto.ts`
- Modify: `backend/src/modules/performance/evaluations/dto/update-evaluation-data.dto.ts`
- Modify: `backend/src/modules/performance/evaluations/dto/evaluation-response.dto.ts`

**Interfaces:**
- Consumes: `SupportingDoc` from `../supporting-doc.types`.
- Produces: every DTO carries `supportingDocs?: SupportingDoc[]` (response: `supportingDocs: SupportingDoc[]`).

- [ ] **Step 1: Update the two input DTOs**

In `create-evaluation-input.dto.ts` and `update-evaluation-input.dto.ts`, add the import at the top and replace the `supportingDocUrls?: string[];` line:
```ts
import type { SupportingDoc } from "../supporting-doc.types";
```
```ts
  supportingDocs?: SupportingDoc[];
```

- [ ] **Step 2: Update the two data DTOs**

Same edit in `create-evaluation-data.dto.ts` and `update-evaluation-data.dto.ts`: add the import and replace `supportingDocUrls?: string[];` with `supportingDocs?: SupportingDoc[];`.

- [ ] **Step 3: Update the response DTO**

In `evaluation-response.dto.ts`, add the import and replace `supportingDocUrls: string[];` with:
```ts
  supportingDocs: SupportingDoc[];
```

- [ ] **Step 4: Typecheck (will fail downstream — that's expected)**

From `backend/`:
```bash
npx tsc --noEmit
```
Expected: errors remain only in `evaluations.service.ts`, `evaluations.repository.ts`, `evaluations.controller.ts` (next tasks fix them). No errors in the DTO files themselves.

---

## Task 4: Service + repository — field rename and `toResponse`

**Files:**
- Modify: `backend/src/modules/performance/evaluations/evaluations.service.ts:128,211,461`
- Modify: `backend/src/modules/performance/evaluations/evaluations.repository.ts:17,128`

**Interfaces:**
- Consumes: `CreateEvaluationData.supportingDocs`, `UpdateEvaluationData.supportingDocs` (Task 3).
- Produces: service persists/returns `supportingDocs`; repository writes the JSON column.

- [ ] **Step 1: Service `create()` — createData**

In `evaluations.service.ts`, in the `createData` object (around line 128), replace:
```ts
      supportingDocUrls: input.supportingDocUrls ?? [],
```
with:
```ts
      supportingDocs: input.supportingDocs ?? [],
```

- [ ] **Step 2: Service `update()` — transaction send branch**

Around line 211, replace:
```ts
            ...(updateData.supportingDocUrls !== undefined && { supportingDocUrls: updateData.supportingDocUrls }),
```
with:
```ts
            ...(updateData.supportingDocs !== undefined && { supportingDocs: updateData.supportingDocs }),
```

- [ ] **Step 3: Service `toResponse()`**

Around line 461, replace:
```ts
      supportingDocUrls: evaluation.supportingDocUrls,
```
with (cast through the Prisma JSON value to our typed array):
```ts
      supportingDocs: (evaluation.supportingDocs ?? []) as unknown as SupportingDoc[],
```
And add the import near the top of the file:
```ts
import type { SupportingDoc } from "./supporting-doc.types";
```
Note: `EvaluationWithAck` is `PerformanceEvaluation & {...}`, so `evaluation.supportingDocs` is `Prisma.JsonValue`; the cast is the boundary where we trust the stored shape.

- [ ] **Step 4: Repository `create()`**

In `evaluations.repository.ts` around line 17, replace:
```ts
        supportingDocUrls: data.supportingDocUrls ?? [],
```
with:
```ts
        supportingDocs: (data.supportingDocs ?? []) as unknown as Prisma.InputJsonValue,
```
Add the Prisma import if not present:
```ts
import type { Prisma } from "@prisma/client";
```

- [ ] **Step 5: Repository `update()`**

Around line 128, replace:
```ts
        ...(data.supportingDocUrls !== undefined && { supportingDocUrls: data.supportingDocUrls }),
```
with:
```ts
        ...(data.supportingDocs !== undefined && { supportingDocs: data.supportingDocs as unknown as Prisma.InputJsonValue }),
```

- [ ] **Step 6: Typecheck**

From `backend/`:
```bash
npx tsc --noEmit
```
Expected: only `evaluations.controller.ts` still errors (next task). Service and repository are clean.

---

## Task 5: Controller + service — build entries, merge-on-update, combined cap, kind-aware download

**Files:**
- Modify: `backend/src/modules/performance/evaluations/evaluations.controller.ts`
- Modify: `backend/src/modules/performance/evaluations/evaluations.service.ts` (`update` gains a merge param)
- Modify: `backend/src/modules/performance/evaluations/evaluations.routes.ts` (no structural change)

**Interfaces:**
- Consumes: `validateSupportingLink`, `SupportingDoc` (Task 2); `EVAL_UPLOAD_ERROR_MESSAGES.{INVALID_URL,TOO_MANY_DOCS}` (Task 2); service `create` accepting `supportingDocs` (Task 4).
- Produces:
  - `createEvaluation` persists `supportingDocs = uploaded files + links` (cap 5).
  - `EvaluationsService.update(evaluationId, input, userId, docsMerge?)` — new optional 4th param `docsMerge?: { keepUrls: string[]; newDocs: SupportingDoc[] }`. When present, the service rebuilds `supportingDocs` from the evaluation's own current file docs filtered by `keepUrls`, plus `newDocs`, capped at 5.
  - `downloadDocument` returns a signed URL for `file` entries and the raw URL for `link` entries.
- Wire format: see Global Constraints (`files`, `links`, `keepFiles`, `docsManaged`).

- [ ] **Step 1: Add imports and three private helpers to the controller**

At the top of `evaluations.controller.ts`, add:
```ts
import { validateSupportingLink, type SupportingDoc } from "./supporting-doc.types";
import type { UpdateEvaluationInput } from "./dto";
```
Inside the `EvaluationsController` class, add:
```ts
  /** Normalizes the multipart `links` field (absent | string | string[]) into validated link docs. */
  private buildLinkDocs(raw: unknown): SupportingDoc[] {
    const arr = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
    return arr.map((entry) => {
      let url = "";
      let label: string | undefined;
      if (typeof entry === "string") {
        const trimmed = entry.trim();
        if (trimmed.startsWith("{")) {
          try {
            const parsed = JSON.parse(trimmed) as { url?: unknown; label?: unknown };
            url = typeof parsed.url === "string" ? parsed.url : "";
            label = typeof parsed.label === "string" ? parsed.label : undefined;
          } catch {
            url = "";
          }
        } else {
          url = trimmed;
        }
      }
      // Empty/garbage url throws INVALID_URL inside validateSupportingLink — the desired behavior.
      return validateSupportingLink(url, label);
    });
  }

  /** Normalizes the multipart `keepFiles` field (absent | string | string[]) into a list of urls to retain. */
  private normalizeKeepUrls(raw: unknown): string[] {
    const arr = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
    return arr.filter((v): v is string => typeof v === "string" && v.length > 0);
  }

  /** Validates + uploads PDF files to Cloudinary, returning file docs (label = original filename). */
  private async uploadFileDocs(files: Express.Multer.File[]): Promise<SupportingDoc[]> {
    files.forEach((f) => validateEvaluationUploadFile(f));
    const urls = await Promise.all(
      files.map((f) =>
        this.cloudinaryService.uploadSupportingDocument(f.buffer, f.originalname, f.mimetype),
      ),
    );
    return urls.map((url, i) => ({ kind: "file", url, label: files[i].originalname }));
  }
```

- [ ] **Step 2: Rewrite the docs handling in `createEvaluation`**

Replace the block (currently lines ~125–137) that reads:
```ts
      const files = (req.files as Express.Multer.File[]) ?? [];
      files.forEach((f) => validateEvaluationUploadFile(f));
      let supportingDocUrls: string[] = [];
      try {
        supportingDocUrls = await Promise.all(
          files.map((f) => this.cloudinaryService.uploadSupportingDocument(f.buffer, f.originalname, f.mimetype)),
        );
      } catch (uploadError) {
        return next(uploadError);
      }

      const input = this.evaluationsValidation.parseCreateBody(req.body);
      const result = await this.evaluationsService.create({ ...input, supportingDocUrls }, req.user.id);
```
with (no existing docs on create — just uploads + links, cap before upload):
```ts
      const files = (req.files as Express.Multer.File[]) ?? [];
      const linkDocs = this.buildLinkDocs(req.body.links);
      if (files.length + linkDocs.length > 5) {
        throw new Error(EVAL_UPLOAD_ERROR_MESSAGES.TOO_MANY_DOCS);
      }
      const fileDocs = await this.uploadFileDocs(files);
      const supportingDocs: SupportingDoc[] = [...fileDocs, ...linkDocs];

      const input = this.evaluationsValidation.parseCreateBody(req.body);
      const result = await this.evaluationsService.create({ ...input, supportingDocs }, req.user.id);
```
(Cloudinary/validation failures now propagate to the shared `catch`, which maps known messages to 400 and `next(error)`s the rest.)

- [ ] **Step 3: Rewrite the docs handling in `updateEvaluation`**

Replace the block (currently lines ~224–241, from `const { evaluationId } = req.params;` through the `service.update(...)` call) with:
```ts
      const { evaluationId } = req.params;

      const files = (req.files as Express.Multer.File[]) ?? [];
      // The editor owns the docs section and always sends `docsManaged`; absence means
      // a non-editor caller that isn't touching docs, so leave existing docs untouched.
      const docsManaged =
        req.body.docsManaged === "1" ||
        files.length > 0 ||
        req.body.links !== undefined ||
        req.body.keepFiles !== undefined;

      let docsMerge: { keepUrls: string[]; newDocs: SupportingDoc[] } | undefined;
      if (docsManaged) {
        const linkDocs = this.buildLinkDocs(req.body.links);
        const keepUrls = this.normalizeKeepUrls(req.body.keepFiles);
        if (files.length + linkDocs.length + keepUrls.length > 5) {
          throw new Error(EVAL_UPLOAD_ERROR_MESSAGES.TOO_MANY_DOCS);
        }
        const fileDocs = await this.uploadFileDocs(files);
        docsMerge = { keepUrls, newDocs: [...fileDocs, ...linkDocs] };
      }

      // Allow updates that change only supporting docs (no other field).
      let input: Partial<UpdateEvaluationInput> = {};
      try {
        input = this.evaluationsValidation.parseUpdateBody(req.body);
      } catch (e) {
        if (!(e instanceof Error && e.message === "No fields provided to update" && docsMerge !== undefined)) {
          throw e;
        }
      }

      const result = await this.evaluationsService.update(evaluationId, input, req.user.id, docsMerge);
```

- [ ] **Step 4: Add the merge logic to `EvaluationsService.update`**

In `evaluations.service.ts`, change the `update` signature and merge the docs after the evaluation is loaded. Add the import near the top:
```ts
import { EVAL_UPLOAD_ERROR_MESSAGES } from "./evaluations.constants";
```
(extend the existing `evaluations.constants` import line rather than duplicating). Change the signature:
```ts
  async update(
    evaluationId: string,
    input: UpdateEvaluationInput,
    userId: string,
    docsMerge?: { keepUrls: string[]; newDocs: SupportingDoc[] },
  ) {
```
After the existing guards (the `ALREADY_SENT` check and the reviewee re-validation), compute the merged docs and fold them into `input` so the rest of the method (which already spreads `updateData.supportingDocs`) persists them:
```ts
    if (docsMerge) {
      const existingDocs = (evaluation.supportingDocs ?? []) as unknown as SupportingDoc[];
      const retained = existingDocs.filter(
        (d) => d.kind === "file" && docsMerge.keepUrls.includes(d.url),
      );
      const merged = [...retained, ...docsMerge.newDocs];
      if (merged.length > 5) {
        throw new Error(EVAL_UPLOAD_ERROR_MESSAGES.TOO_MANY_DOCS);
      }
      input = { ...input, supportingDocs: merged };
    }
```
Place this right before `const now = new Date();` in `update`. `input.supportingDocs` then flows through the existing `const { send: _, ...fields } = input;` → `updateData` → both the transaction branch (Task 4 Step 2) and `repository.update` (Task 4 Step 5).

- [ ] **Step 5: Map the two new errors to 400 in both catch blocks**

In `createEvaluation` and `updateEvaluation` catch blocks, alongside the existing `TOO_MANY_FILES`/`INVALID_FILE_TYPE`/`FILE_TOO_LARGE` checks, add handling for the new messages. Add this inside the `if (error instanceof Error) { ... }` group in **both** methods:
```ts
        if (error.message === EVAL_UPLOAD_ERROR_MESSAGES.INVALID_URL) {
          return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: EVAL_UPLOAD_ERROR_MESSAGES.INVALID_URL,
            errorCode: API_ERROR_CODES.VALIDATION_FAILED,
            errors: [{ field: "links", message: EVAL_UPLOAD_ERROR_MESSAGES.INVALID_URL, code: API_ERROR_CODES.VALIDATION_FAILED }],
          });
        }
        if (error.message === EVAL_UPLOAD_ERROR_MESSAGES.TOO_MANY_DOCS) {
          return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: EVAL_UPLOAD_ERROR_MESSAGES.TOO_MANY_DOCS,
            errorCode: API_ERROR_CODES.VALIDATION_FAILED,
            errors: [{ field: "supportingDocs", message: EVAL_UPLOAD_ERROR_MESSAGES.TOO_MANY_DOCS, code: API_ERROR_CODES.VALIDATION_FAILED }],
          });
        }
```
Also add both messages to the `isValidationError` allowlist:
```ts
      error.message === EVAL_UPLOAD_ERROR_MESSAGES.INVALID_URL ||
      error.message === EVAL_UPLOAD_ERROR_MESSAGES.TOO_MANY_DOCS ||
```

- [ ] **Step 6: Make `downloadDocument` kind-aware**

In `downloadDocument` (around line 525–542), replace:
```ts
      const index = Number(docIndex);
      const publicId = evaluation.supportingDocUrls[index];
      if (!Number.isInteger(index) || !publicId) {
        return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: API_ERROR_MESSAGES.EVALUATION_NOT_FOUND,
          errorCode: API_ERROR_CODES.EVALUATION_NOT_FOUND,
        });
      }

      const url = this.cloudinaryService.getSupportingDocumentDownloadUrl(publicId);
      return res.json({ url });
```
with:
```ts
      const index = Number(docIndex);
      const doc = evaluation.supportingDocs[index];
      if (!Number.isInteger(index) || !doc) {
        return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: API_ERROR_MESSAGES.EVALUATION_NOT_FOUND,
          errorCode: API_ERROR_CODES.EVALUATION_NOT_FOUND,
        });
      }

      const url =
        doc.kind === "file"
          ? this.cloudinaryService.getSupportingDocumentDownloadUrl(doc.url)
          : doc.url;
      return res.json({ url });
```
(`evaluation` here is the `EvaluationResponseDto` from `evaluationsService.get`, whose `supportingDocs` is `SupportingDoc[]` after Task 4.)

- [ ] **Step 7: Routes — no structural change needed**

`evaluations.routes.ts` keeps `evaluationDocumentUpload` on POST `/` and PATCH `/:evaluationId`. The multer middleware ignores non-file fields, so `links`, `keepFiles`, and `docsManaged` pass through to `req.body`. No edit required unless the typecheck flags the unused-import; leave as is.

- [ ] **Step 8: Typecheck + build**

From `backend/`:
```bash
npx tsc --noEmit && npm run build
```
Expected: no type errors; build succeeds.

---

## Task 6: Backend tests — create/update/download

**Files:**
- Modify: `backend/src/tests/evaluations/evaluations-test.helpers.ts:66`
- Modify: `backend/src/tests/evaluations/create-evaluation.test.ts`
- Modify: `backend/src/tests/evaluations/update-evaluation.test.ts`
- Create: `backend/src/tests/evaluations/download-document.test.ts` (only if no existing test covers `downloadDocument`)

**Interfaces:**
- Consumes: controller behavior from Task 5; helper `buildEvaluationRecord`.

- [ ] **Step 1: Update the test record helper**

In `evaluations-test.helpers.ts` line 66, replace:
```ts
    supportingDocUrls: [],
```
with:
```ts
    supportingDocs: [],
```

- [ ] **Step 2: Update existing create/update assertions**

In `create-evaluation.test.ts` and `update-evaluation.test.ts`, search for `supportingDocUrls` and rename every occurrence to `supportingDocs`, updating expected values from `string[]` to `SupportingDoc[]` shape (e.g. expecting `[{ kind: "file", url: "...", label: "..." }]` where a file was uploaded). Mirror the existing Cloudinary mock — `uploadSupportingDocument` should resolve to a public_id string (e.g. `"supporting_docs/x"`).

- [ ] **Step 3: Add a links-accepted test (create)**

Add to `create-evaluation.test.ts` a test that posts a valid `links` field and asserts the persisted `supportingDocs` contains a `{ kind: "link", url, label }` entry. Because the controller reads `req.body.links`, drive it through the same request harness the file tests use, appending `links` as a JSON string. Example assertion shape:
```ts
// after issuing a create with links: ['{"url":"https://drive.google.com/x","label":"Plan"}']
const created = evalCreateMock.mock.calls[0][0].data;
expect(created.supportingDocs).toContainEqual({
  kind: "link",
  url: "https://drive.google.com/x",
  label: "Plan",
});
```

- [ ] **Step 4: Add a rejection test (create)**

Add a test that posting `links: ['http://insecure.com']` returns HTTP 400 with message `EVAL_UPLOAD_ERROR_MESSAGES.INVALID_URL`, and that `evalCreateMock` was NOT called.

- [ ] **Step 5: Add a combined-cap test (create)**

Add a test that 4 files + 2 links (or any combination summing > 5) returns HTTP 400 with `EVAL_UPLOAD_ERROR_MESSAGES.TOO_MANY_DOCS`.

- [ ] **Step 6: Add update merge/retain tests**

In `update-evaluation.test.ts`, with `evalFindFirstMock` returning a draft whose `supportingDocs` is `[{ kind: "file", url: "supporting_docs/keep", label: "keep.pdf" }, { kind: "file", url: "supporting_docs/drop", label: "drop.pdf" }]`:
- **Retains kept files + adds a link:** PATCH with `keepFiles: ["supporting_docs/keep"]`, `links: ['{"url":"https://x.com/a"}']`, `docsManaged: "1"`. Assert the persisted `supportingDocs` equals `[{ kind:"file", url:"supporting_docs/keep", label:"keep.pdf" }, { kind:"link", url:"https://x.com/a", label:"x.com" }]` (the `drop` file is gone, `keep` keeps its **stored** label).
- **Ignores a foreign keep url:** PATCH with `keepFiles: ["supporting_docs/not-on-this-eval"]`, `docsManaged: "1"`. Assert the result `supportingDocs` is `[]` (no foreign id leaks in).
- **Docs untouched when unmanaged:** PATCH with only `{ grade: 5 }` and no `docsManaged`/files/links. Assert the update payload has no `supportingDocs` key (existing docs left alone).
- **Cap on update:** 3 `keepFiles` + 3 `links` → HTTP 400 `TOO_MANY_DOCS`.

- [ ] **Step 7: Download endpoint — link returns raw URL**

Ensure a test exists where `evaluationsService.get` resolves an evaluation whose `supportingDocs[0]` is a `link`, and `GET .../documents/0/download` returns `{ url: "<that exact https url>" }` (Cloudinary signer NOT called). And one where `supportingDocs[0]` is a `file` and the signer IS called. Add `download-document.test.ts` if no such coverage exists.

- [ ] **Step 8: Run the full backend suite + build**

From `backend/`:
```bash
npm run test && npm run build
```
Expected: all tests pass; build succeeds.

---

## Task 7: Frontend types + service

**Files:**
- Modify: `frontend/src/modules/performance/evaluations/types/evaluations.types.ts`
- Modify: `frontend/src/modules/performance/evaluations/services/evaluations.service.ts`

**Interfaces:**
- Produces:
  - `SupportingDoc` union (same shape as backend).
  - `Evaluation.supportingDocs: SupportingDoc[]`.
  - `EvaluationInput.links?: { url: string; label?: string }[]` and `EvaluationInput.keepFiles?: string[]`.
  - `buildEvaluationFormData` appends `links` (JSON strings), `keepFiles` (urls), and a `docsManaged: "1"` sentinel.

- [ ] **Step 1: Add the type + update `Evaluation` and `EvaluationInput`**

In `evaluations.types.ts`:
```ts
export type SupportingDoc =
  | { kind: "file"; url: string; label: string }
  | { kind: "link"; url: string; label: string };
```
In `interface Evaluation`, replace `supportingDocUrls: string[];` with:
```ts
  supportingDocs: SupportingDoc[];
```
In `interface EvaluationInput`, add (after `recommendation?`):
```ts
  links?: { url: string; label?: string }[];
  /** Cloudinary urls of existing file docs to retain on update (full-set contract). */
  keepFiles?: string[];
```

- [ ] **Step 2: Append links, keepFiles, and the docsManaged sentinel in `buildEvaluationFormData`**

In `evaluations.service.ts`, inside `buildEvaluationFormData`, after the `files.forEach(...)` line, add:
```ts
  (input.links ?? []).forEach((l) =>
    fd.append("links", JSON.stringify({ url: l.url, ...(l.label ? { label: l.label } : {}) })),
  );
  (input.keepFiles ?? []).forEach((url) => fd.append("keepFiles", url));
  // The editor always owns the docs section; this tells the backend to rebuild the doc set
  // (even to empty = all docs removed) rather than leave existing docs untouched.
  fd.append("docsManaged", "1");
```
Note: on create the backend ignores `keepFiles`/`docsManaged`, so always appending them is harmless.

- [ ] **Step 3: Typecheck**

From `frontend/`:
```bash
npx tsc --noEmit
```
Expected: errors now only in `evaluations.page.tsx` and `review-evaluation-dialog.tsx` (they still read `supportingDocUrls`/`extractFilename`). Fixed in Tasks 8–9.

---

## Task 8: Frontend `LinkPicker` + editor wiring

**Files:**
- Modify: `frontend/src/screens/supervisor/evaluations.page.tsx`

**Interfaces:**
- Consumes: `EvaluationInput.links`, `EvaluationInput.keepFiles` (Task 7).
- Produces: editor tracks `existingFiles` (removable) + `links` + new `localFiles`, enforces the shared cap of 5, sends the full intended set (`links` + `keepFiles`) on submit and autosave, and renders `PdfFilePicker` (existing + new files) beside `LinkPicker` under one "Supporting documents" heading.

- [ ] **Step 1: Add a `LinkPicker` component**

Just below `PdfFilePicker` (after line 442), add a sibling component that matches its styling and the brand tokens:
```tsx
interface LinkEntry { url: string; label?: string }

interface LinkPickerProps {
    links: LinkEntry[];
    onChange: (links: LinkEntry[]) => void;
    /** Remaining slots in the shared 5-doc budget (files + existing + links). */
    slotsLeft: number;
}

function isHttpsUrl(value: string): boolean {
    try {
        return new URL(value.trim()).protocol === "https:";
    } catch {
        return false;
    }
}

function LinkPicker({ links, onChange, slotsLeft }: LinkPickerProps) {
    const [url, setUrl] = useState("");
    const [label, setLabel] = useState("");
    const [error, setError] = useState<string | null>(null);

    const add = () => {
        const trimmed = url.trim();
        if (!isHttpsUrl(trimmed)) {
            setError("Enter a valid https:// link.");
            return;
        }
        if (slotsLeft <= 0) {
            setError("You can attach up to 5 supporting documents total.");
            return;
        }
        onChange([...links, { url: trimmed, ...(label.trim() ? { label: label.trim() } : {}) }]);
        setUrl("");
        setLabel("");
        setError(null);
    };

    const remove = (idx: number) => onChange(links.filter((_, i) => i !== idx));

    return (
        <div className="space-y-2">
            {links.length > 0 && (
                <div className="space-y-1.5 rounded-lg border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] p-3">
                    {links.map((l, idx) => (
                        <div key={`${l.url}-${idx}`} className="flex items-center gap-2">
                            <LinkIcon size={14} className="flex-none text-[color:var(--text-tertiary)]" />
                            <span className="min-w-0 flex-1 truncate text-sm text-[color:var(--text-primary)]">
                                {l.label || l.url}
                            </span>
                            <button
                                type="button"
                                onClick={() => remove(idx)}
                                className="rounded p-0.5 text-[color:var(--text-quaternary)] transition-colors hover:bg-[color:var(--bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                aria-label={`Remove ${l.label || l.url}`}
                            >
                                <X size={13} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
                <input
                    type="url"
                    inputMode="url"
                    placeholder="https://drive.google.com/…"
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); setError(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
                    className="min-w-0 flex-1 rounded-lg border border-[color:var(--border-primary)] bg-white px-3 py-2 text-sm text-[color:var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Supporting link URL"
                />
                <input
                    type="text"
                    placeholder="Label (optional)"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
                    className="rounded-lg border border-[color:var(--border-primary)] bg-white px-3 py-2 text-sm text-[color:var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-40"
                    aria-label="Supporting link label"
                />
                <Button type="button" variant="secondary" size="sm" onClick={add}>
                    <Plus size={12} /> Add link
                </Button>
            </div>
            {error && <p className="text-xs text-[color:var(--color-error-600)]">{error}</p>}
        </div>
    );
}
```
Add `LinkIcon` to the lucide import at the top of the file: in the existing `lucide-react` import (the one with `FileText` at line ~14), add `Link as LinkIcon`.

- [ ] **Step 2: Make `PdfFilePicker` render existing files as removable rows**

Replace `PdfFilePicker`'s read-only "replace" handling of existing docs with individually-removable rows, so existing files coexist with new uploads in the unified list. Change the props interface (line ~304):
```tsx
interface ExistingFile { url: string; label: string }

interface PdfFilePickerProps {
    files: File[];
    existingFiles: ExistingFile[];
    onChange: (files: File[]) => void;
    onRemoveExisting: (url: string) => void;
    error?: string;
}
```
In the component signature destructure `existingFiles` and `onRemoveExisting` instead of `existingUrls`. In `handleSelect`, change every `existingUrls.length` to `existingFiles.length`. Delete the `const showExisting = ...` line and replace the read-only existing block (the `{showExisting && (...)}` JSX) with a removable list:
```tsx
            {existingFiles.length > 0 && (
                <div className="space-y-1.5 rounded-lg border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] p-3">
                    {existingFiles.map((doc) => (
                        <div key={doc.url} className="flex items-center gap-2">
                            <FileText size={14} className="flex-none text-[color:var(--text-tertiary)]" />
                            <span className="min-w-0 flex-1 truncate text-sm text-[color:var(--text-primary)]">{doc.label}</span>
                            <button
                                type="button"
                                onClick={() => onRemoveExisting(doc.url)}
                                className="rounded p-0.5 text-[color:var(--text-quaternary)] transition-colors hover:bg-[color:var(--bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                aria-label={`Remove ${doc.label}`}
                            >
                                <X size={13} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
```

- [ ] **Step 3: Editor state for existing files + links**

In the editor, replace `const [existingDocUrls, setExistingDocUrls] = useState<string[]>([]);` (line ~499) with:
```tsx
    const [existingFiles, setExistingFiles] = useState<ExistingFile[]>([]);
    const [links, setLinks] = useState<LinkEntry[]>([]);
```
In the effect that resets fields from `initial` (around line 597, where `setExistingDocUrls(initial.supportingDocUrls ?? [])` is), replace with:
```tsx
    setExistingFiles((initial.supportingDocs ?? []).filter((d) => d.kind === "file").map((d) => ({ url: d.url, label: d.label })));
    setLinks((initial.supportingDocs ?? []).filter((d) => d.kind === "link").map((d) => ({ url: d.url, label: d.label })));
    setLocalFiles([]);
```
In the other reset path (around line 623), replace `setLocalFiles([]);` region with `setExistingFiles([]); setLinks([]); setLocalFiles([]);`.

- [ ] **Step 4: Compute remaining slots and render both pickers under one heading**

Add near the other derived values:
```tsx
    const docSlotsLeft = Math.max(0, 5 - existingFiles.length - localFiles.length - links.length);
```
Replace the existing `<PdfFilePicker .../>` usage with both pickers under the existing "Supporting documents" heading/label:
```tsx
    <div className="space-y-3">
        <PdfFilePicker
            files={localFiles}
            existingFiles={existingFiles}
            onChange={setLocalFiles}
            onRemoveExisting={(url) => setExistingFiles((prev) => prev.filter((d) => d.url !== url))}
            error={errors.supportingDocs}
        />
        <LinkPicker links={links} onChange={setLinks} slotsLeft={docSlotsLeft} />
    </div>
```

- [ ] **Step 5: Include links + keepFiles in the submit input**

Find where `input` is assembled for `onSubmit`/`onRequestSend` (around line 743 and the `SendPayload` build ~774). Add both to the `EvaluationInput` object:
```tsx
        ...(links.length > 0 && { links }),
        keepFiles: existingFiles.map((d) => d.url),
```
`keepFiles` is sent unconditionally (an empty array means "drop all existing files"), which the full-set contract requires. The submit calls (`onSubmit(input, localFiles)` at ~743 and the send payload at ~774) carry these via `input`.

- [ ] **Step 6: Include links + keepFiles in the autosave snapshot**

Links and existing-file retention are serializable, so they participate in autosave (only new file *bytes* are excluded). In the snapshot/serialize function (the "Serializable field snapshot" near line 469) and its restore, add `links` and `keepFiles` (from `existingFiles`) alongside `evaluation`/`recommendation`, so removing an existing file or adding a link is captured by change-detection and persisted. The `onAutosave` `input` builder must include `links` and `keepFiles: existingFiles.map((d) => d.url)` too (otherwise an autosave would clear docs).

- [ ] **Step 7: Update the in-editor preview render**

The preview step (around lines 975–1010) lists `localFiles`. Add parallel lists for `existingFiles` (file rows, `doc.label`) and `links` (`LinkIcon`, `l.label || l.url`) so the preview reflects the full intended set. Match the existing preview row styling.

- [ ] **Step 8: Typecheck**

From `frontend/`:
```bash
npx tsc --noEmit
```
Expected: `evaluations.page.tsx` clean; only `review-evaluation-dialog.tsx` remains (Task 9).

---

## Task 9: Frontend viewer — render by kind

**Files:**
- Modify: `frontend/src/modules/performance/evaluations/components/review-evaluation-dialog.tsx`

**Interfaces:**
- Consumes: `Evaluation.supportingDocs: SupportingDoc[]` (Task 7); existing `previewDoc`/`openDoc` helpers.

- [ ] **Step 1: Replace the `supportingDocUrls.map` block with a kind-aware render**

The current block (lines 303–349) iterates `ev.supportingDocUrls`. Replace it to iterate `ev.supportingDocs`. For `kind === "file"`, keep the existing card with the Preview (`previewDoc`) and Download (`openDoc`) buttons, using `doc.label` as the filename (drop `extractFilename`). For `kind === "link"`, render a similar card with a link icon, `doc.label` as the title, the URL hostname as the subtitle, and a single "Open" anchor:
```tsx
{ev.supportingDocs.length > 0 && (
  <div className="flex flex-col gap-3.5">
    <SectionHeading>Supporting documents</SectionHeading>
    <div className="flex flex-col gap-2.5">
      {ev.supportingDocs.map((doc, index) =>
        doc.kind === "file" ? (
          <div key={`${doc.url}-${index}`} className="flex items-center gap-3.5 rounded-xl border border-[color:var(--border-primary)] bg-white p-3">
            {/* keep the existing faux-thumbnail + label markup, using doc.label */}
            <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <span className="truncate text-[16px] font-semibold leading-5 text-[color:var(--text-primary)]">{doc.label}</span>
              <span className="text-[14px] leading-[18px] text-[color:var(--text-tertiary)]">PDF</span>
            </span>
            <div className="flex flex-none items-center gap-2">
              <button type="button" onClick={() => previewDoc(index, doc.label)} aria-label={`Preview ${doc.label}`} className="/* existing button classes */">
                <Eye size={18} />
              </button>
              <button type="button" onClick={() => openDoc(ev.id, index)} aria-label={`Download ${doc.label}`} className="/* existing button classes */">
                <Download size={18} />
              </button>
            </div>
          </div>
        ) : (
          <a
            key={`${doc.url}-${index}`}
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3.5 rounded-xl border border-[color:var(--border-primary)] bg-white p-3 transition-colors hover:bg-[color:var(--bg-secondary)]"
          >
            <span className="flex h-[58px] w-[46px] flex-none items-center justify-center rounded-md border border-[#e1e3e8] bg-white text-[color:var(--text-tertiary)]" aria-hidden="true">
              <LinkIcon size={18} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <span className="truncate text-[16px] font-semibold leading-5 text-[color:var(--text-primary)]">{doc.label}</span>
              <span className="truncate text-[14px] leading-[18px] text-[color:var(--text-tertiary)]">{linkHost(doc.url)}</span>
            </span>
            <span className="flex flex-none items-center gap-1.5 text-[14px] font-medium text-[color:hsl(var(--primary))]">
              Open <ExternalLink size={16} />
            </span>
          </a>
        ),
      )}
    </div>
  </div>
)}
```
Add a small helper near `extractFilename` (and remove `extractFilename` if it becomes unused):
```tsx
function linkHost(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}
```
Update the lucide import in this file to add `Link as LinkIcon, ExternalLink` (it already imports `Eye, Download`).

- [ ] **Step 2: Typecheck + build**

From `frontend/`:
```bash
npx tsc --noEmit && npm run build
```
Expected: clean.

---

## Task 10: Frontend tests + full verification

**Files:**
- Modify: `frontend/src/test/supervisor/overview-logic.test.ts` (and any test referencing `supportingDocUrls`).

**Interfaces:**
- Consumes: the new `supportingDocs` shape.

- [ ] **Step 1: Update fixtures/assertions**

Grep the frontend test tree for `supportingDocUrls` and update each to `supportingDocs` with the `{ kind, url, label }[]` shape:
```bash
cd frontend && grep -rn "supportingDocUrls" src/test
```
Update every hit.

- [ ] **Step 2: Run frontend tests + build**

From `frontend/`:
```bash
npm run test && npm run build
```
Expected: all pass; build succeeds.

- [ ] **Step 3: Full backend verification**

From `backend/`:
```bash
npm run test && npm run build
```
Expected: all pass; build succeeds.

- [ ] **Step 4: Manual smoke (optional but recommended)**

Run the app, open the supervisor Evaluations page, create a draft, attach 1 PDF + 1 https link, save, reopen — both appear in one list; sending makes them visible to the reviewee, where the file previews/downloads (signed) and the link opens in a new tab. Confirm pasting `http://x` shows the inline error and the combined cap stops at 5.

---

## Self-Review Notes

- **Spec coverage:** data model (Task 1, 3), https validation w/ native URL (Task 2), unified-list UX (Task 8), combined cap of 5 (Task 5 backend + Task 8 frontend), kind-aware download (Task 5), viewer render (Task 9), migration backfill (Task 1), tests (Tasks 6, 10). All spec sections map to a task.
- **Type consistency:** `SupportingDoc` shape is identical in `backend/.../supporting-doc.types.ts` and `frontend/.../evaluations.types.ts`. `supportingDocs` is the field name end to end. The multipart field names `links` / `keepFiles` / `docsManaged` match between `buildEvaluationFormData` (Task 7) and the controller (Task 5). `docsMerge.{keepUrls,newDocs}` is the only cross-task internal contract (controller → service), defined in Task 5.
- **Full-set + keepFiles contract:** the editor always sends `links` + `keepFiles` (+ `docsManaged`). On update the service rebuilds `supportingDocs = (existing file docs ∩ keepFiles) + new uploads + links`, so reopening a draft and adding/removing one item never silently drops the rest, and a client cannot inject a foreign Cloudinary id (kept urls are verified against the evaluation's own docs). Doc-only updates (Task 5 Step 3) are explicitly allowed.
- **Out of scope (unchanged):** SSRF/server-side fetch, link reachability/content-type checks, host allowlist, file constraints (PDF/10MB/signed).
