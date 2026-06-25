# Design: Hybrid Supporting Docs (File Upload + Validated URL)

**Date:** 2026-06-25
**Module:** Performance Management → Evaluations
**Status:** Approved (design), pending implementation plan

## Background

The project description specifies, for a supervisor's performance evaluation:

> Supporting Documents: **Valid URL/link**

The current implementation supports **PDF file upload only** (`supportingDocUrls String[]`,
Cloudinary, max 5 files, 10 MB each, served back through a signed-URL download endpoint).
It does not accept a pasted URL.

## Goal

Support **both** in a single "Supporting documents" experience:
1. Keep the existing PDF file upload (Cloudinary).
2. Add a validated, sanitized **https URL/link** option.

Both are stored together, capped at **5 total**, and rendered in one unified list for the
reviewer (create/edit) and the viewer (reviewee / HR / upward supervisors).

## Decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Storage model | Structured array — explicit `kind` discriminator, no host-sniffing |
| URL strictness | Any well-formed **https** URL; reject `http:`, `javascript:`, `data:`, `file:`, malformed |
| Validation lib | **None** — native WHATWG `URL` constructor (already used in this repo; zero new deps) |
| Form UX | One unified list (upload + paste-link in the same section) |
| Limits | **5 total combined** (files + links). Files stay PDF-only / 10 MB. Links: any https URL, no content/type check |
| Link label | Optional display label; **defaults to the URL hostname** when omitted |

We never fetch these URLs server-side (store + render only), so SSRF is out of scope. The
relevant risks are dangerous schemes and malformed input — both handled by the https-only
`URL` check — plus XSS at render time, handled by rendering as `<a rel="noopener noreferrer">`.

## Data Model

Replace the flat `String[]` with a single JSON column. (Prisma/Postgres can't store
arrays-of-composite cleanly; a related table is over-engineering for ≤5 immutable,
display-only entries.)

`backend/src/prisma/schema/models/performance-evaluation.prisma`:

```prisma
// was: supportingDocUrls String[]
supportingDocs Json @default("[]")
```

Entry shape (shared contract, mirrored in a TS type on both ends):

```ts
type SupportingDoc =
  | { kind: "file"; url: string; label: string }  // url = Cloudinary secure_url, label = original filename
  | { kind: "link"; url: string; label: string }  // url = normalized https URL,  label = display name (defaults to hostname)
```

**Migration** (`add_supporting_docs_json`): create the new column and backfill existing rows —
each existing `supportingDocUrls` string maps to `{ kind: "file", url, label: <filename derived from url> }`.
Then drop `supportingDocUrls`. (Local/dev DB; low risk. Re-seeding is an acceptable fallback.)

## Backend — Write Path

**Controller** (`evaluations.controller.ts`, `createEvaluation` / `updateEvaluation`):

1. **Files** (unchanged): multer memory storage → `validateEvaluationUploadFile` (extension +
   MIME + `%PDF` magic bytes) → `cloudinaryService.uploadSupportingDocument` → build
   `{ kind: "file", url, label: file.originalname }` entries.
2. **Links**: read from the request body (`links` — repeated multipart field; each item may be a
   bare URL string or `{ url, label }`). For each, call a new `validateSupportingLink(raw)`:
   - `const trimmed = raw.trim()`
   - `new URL(trimmed)` inside try/catch → reject malformed (`INVALID_URL`)
   - require `u.protocol === "https:"` → reject otherwise (`INVALID_URL`)
   - store `{ kind: "link", url: u.toString(), label: providedLabel?.trim() || u.hostname }`
3. **Combined cap**: `files.length + links.length > 5` → 400 (`TOO_MANY_DOCS`).
4. Merge into one ordered `supportingDocs` array; pass to the service.
5. On **update with no files and no links provided**, omit `supportingDocs` from the update
   (don't overwrite existing) — matching today's file-only behavior.

**Validation** (`evaluation-file-validation.ts` or a sibling `evaluation-link-validation.ts`):
add `validateSupportingLink`. Keep file validation as-is.

**Error constants** (`evaluations.constants.ts`): extend with
```ts
INVALID_URL: "Supporting link must be a valid https URL",
TOO_MANY_DOCS: "Too many supporting documents — maximum 5 (files + links) allowed",
```
and register these messages in the controller's `isValidationError` / error mapping.

**Service & Repository**: rename `supportingDocUrls` → `supportingDocs` throughout; type the
field as `SupportingDoc[]`. `toResponse` returns the array as-is.

## Backend — Read Path (Download Endpoint)

`downloadDocument` currently signs `supportingDocUrls[index]` unconditionally. Change to look up
`supportingDocs[index]`:
- `kind === "file"` → `cloudinaryService.getSupportingDocumentDownloadUrl(entry.url)` and return signed URL.
- `kind === "link"` → return `{ url: entry.url }` as-is (no signing).

Authorization/visibility check (`evaluationsService.get`) is unchanged. The frontend will open
links directly and only hit this endpoint for files, but the endpoint stays correct either way.

## Frontend — Form (Unified List)

`frontend/src/screens/supervisor/evaluations.page.tsx` (create/edit form):

- One **Supporting documents** section containing:
  - the existing PDF dropzone / browse button, and
  - a "Paste a link" text input + optional label input + **Add** button.
- Both feed a single combined list (capped at 5) with a type icon (file vs link), label, and a
  remove control.
- Client-side link pre-check mirrors the backend: `new URL()` + `protocol === "https:"`; show an
  inline error on failure. Files keep the existing PDF/size pre-check.
- Service `buildEvaluationFormData` (`evaluations.service.ts`): append `files` as today, plus each
  link as a `links` field (URL, with label when present).

`evaluations.types.ts`: add the `SupportingDoc` union; update `Evaluation.supportingDocUrls`
→ `supportingDocs: SupportingDoc[]`; extend `EvaluationInput` with the link entries the form collects.

## Frontend — Viewer

`review-evaluation-dialog.tsx`: iterate `supportingDocs`, render by `kind`:
- **file** → existing card: Preview (modal via signed URL) + Download (signed URL).
- **link** → card with a link icon, `label` as title, `hostname` as subtitle, and a single **Open**
  action: `<a href={url} target="_blank" rel="noopener noreferrer">` (no signed-URL fetch, no preview modal).

`extractFilename` is replaced by reading `entry.label` directly.

## Testing

**Backend**
- `validateSupportingLink`: accepts `https://...`; rejects `http://`, `javascript:`, `data:`,
  `file:`, empty, and malformed strings; trims; defaults label to hostname.
- Create/update: links-only, files-only, and mixed; combined cap of 5 → 400; update with neither
  files nor links leaves existing docs intact.
- `downloadDocument`: returns a signed URL for a `file` entry and the raw URL for a `link` entry.
- Update existing fixtures/helpers and the Cloudinary mock for the `{ kind, url, label }` shape.

**Frontend**
- Existing evaluation tests updated to the new `supportingDocs` shape.
- Form: adding an invalid link shows an error and isn't added; cap of 5 enforced across both types.

## Out of Scope

- SSRF / server-side fetching of link targets (we never fetch them).
- Link reachability or content-type verification (a link may point to a folder, Google Doc, etc.).
- Host allowlists.
- Changing file constraints (PDF-only, 10 MB, signed download) — unchanged.
