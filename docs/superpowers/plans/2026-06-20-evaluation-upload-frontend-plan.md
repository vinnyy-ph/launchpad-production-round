# Plan: Evaluation Supporting Docs Upload — Frontend Integration

## Context

The backend feature branch (`feat/upload-supporting-docs`) is fully implemented and reviewed.
It changed the evaluations API from accepting `supportingDocUrl: string` (plain URL) to
accepting `files[]` via multipart form data and returning `supportingDocUrls: string[]`.

This plan wires the frontend up to that new API contract.

## Backend API Contract (from `feat/upload-supporting-docs`)

### Create / Update endpoints
- `POST /api/v1/evaluations` — multipart/form-data
- `PATCH /api/v1/evaluations/:id` — multipart/form-data
- Text fields: `revieweeId`, `periodStart`, `periodEnd`, `grade` (as string), `highlights` (multiple appends), `lowlights` (multiple appends), `evaluation`, `recommendation`, `send` (as string "true"/"false")
- File field: `files` — multiple PDFs, up to 5 files, 10 MB each
- Update semantics: if `files` sent → replaces ALL existing docs; if no `files` → existing kept

### Response shape
All evaluation responses now include `supportingDocUrls: string[]` (replaces `supportingDocUrl: string | null`).

### Known backend issue (parseItemArray)
The backend `parseItemArray` in `evaluations.validation.ts` throws if a single string arrives
(multer delivers a single-value field as `string`, not `string[]`). This means one-highlight
submissions fail. The backend needs a one-line fix:

```ts
// In parseItemArray, before the Array.isArray check:
const arr = Array.isArray(value) ? value : (typeof value === "string" ? [value] : value);
```

This fix is in scope — apply it to `backend/src/modules/performance/evaluations/evaluations.validation.ts`
(the current branch version of this file; the fix will also be needed in the feature branch).

## Global Constraints

- Follow the project frontend rules: screens in `screens/{role}/`, modules in `modules/{domain}/`
- State: `useState` for form/UI, TanStack Query for server state — no new Zustand stores
- Imports: shadcn primitives from `@/shared/ui`, patterns from `@/shared/ui/patterns`
- Styles: Jia tokens only (`var(--text-primary)`, etc.) — no hardcoded hex
- No new npm packages
- Sentence case, Satoshi font only
- No comments unless WHY is non-obvious
- Match existing code style throughout

---

## Task 1: Backend parseItemArray fix

**File:** `backend/src/modules/performance/evaluations/evaluations.validation.ts`

Fix `parseItemArray` to accept a single string (multer sends single-value array fields as strings):

```ts
private parseItemArray(value: unknown, field: string): string[] {
  const arr = Array.isArray(value) ? value : (typeof value === "string" ? [value] : value);
  if (!Array.isArray(arr) || !arr.every((item) => typeof item === "string")) {
    throw new Error(`${field} must be an array of strings`);
  }
  return (arr as string[]).map((item) => item.trim()).filter((item) => item.length > 0);
}
```

No other changes to this file.

**Verification:** TypeScript must compile (`cd backend && npx tsc --noEmit`).

---

## Task 2: Frontend types

**File:** `frontend/src/modules/performance/evaluations/types/evaluations.types.ts`

Changes:
1. In `Evaluation` interface: replace `supportingDocUrl: string | null` with `supportingDocUrls: string[]`
2. In `EvaluationInput` interface: remove `supportingDocUrl?: string` entirely (files are handled via FormData, not this type)

No other changes.

**Verification:** TypeScript must compile (`cd frontend && npx tsc --noEmit`). Expect TS errors in other files — those will be fixed in subsequent tasks.

---

## Task 3: Frontend service + hooks

### Service — `frontend/src/modules/performance/evaluations/services/evaluations.service.ts`

Replace JSON body with FormData for `createEvaluation` and `updateEvaluation`.

Add a helper `buildEvaluationFormData`:

```ts
function buildEvaluationFormData(input: Partial<EvaluationInput>, files: File[]): FormData {
  const fd = new FormData();
  if (input.revieweeId !== undefined) fd.append("revieweeId", input.revieweeId);
  if (input.periodStart !== undefined) fd.append("periodStart", input.periodStart);
  if (input.periodEnd !== undefined) fd.append("periodEnd", input.periodEnd);
  if (input.grade !== undefined) fd.append("grade", String(input.grade));
  (input.highlights ?? []).forEach((h) => fd.append("highlights", h));
  (input.lowlights ?? []).forEach((l) => fd.append("lowlights", l));
  if (input.evaluation) fd.append("evaluation", input.evaluation);
  if (input.recommendation) fd.append("recommendation", input.recommendation);
  if (input.send !== undefined) fd.append("send", String(input.send));
  files.forEach((f) => fd.append("files", f));
  return fd;
}
```

Updated signatures:

```ts
export async function createEvaluation(input: EvaluationInput, files: File[] = []): Promise<Evaluation>
export async function updateEvaluation(id: string, input: Partial<EvaluationInput>, files: File[] = []): Promise<Evaluation>
```

Both send `FormData` (not JSON). The `apiFetch` client already omits `Content-Type` for FormData.

### Hooks

**`frontend/src/modules/performance/evaluations/hooks/use-create-evaluation.ts`**

Update the mutate call to accept `{ input: EvaluationInput; files?: File[] }` and pass `files` to the service.

**`frontend/src/modules/performance/evaluations/hooks/use-update-evaluation.ts`**

Update the mutate call to accept `{ id: string; input: Partial<EvaluationInput>; files?: File[] }` and pass `files` to the service.

**Verification:** TypeScript compiles. All existing hook call sites in `evaluations.page.tsx` and `surveys.page.tsx` must still compile (callers will be updated in Task 4 but the default `files = []` means old call sites still compile).

---

## Task 4: Evaluation editor form (PdfFilePicker + EvaluationEditorDialog)

**File:** `frontend/src/screens/supervisor/evaluations.page.tsx`

### A. New inline `PdfFilePicker` component

Add this component above `EvaluationEditorDialog` in the same file. It replaces the URL text field.

Props:
```ts
interface PdfFilePickerProps {
  files: File[];           // currently selected new files
  existingUrls: string[];  // URLs from an existing evaluation (shown as read-only links)
  onChange: (files: File[]) => void;
  error?: string;
}
```

Behaviour:
- Hidden `<input type="file" multiple accept=".pdf" className="sr-only">`
- "Add PDFs" button triggers the input
- Selected files shown as a list: `FileText` icon, filename, formatted size (`formatFileSize`), remove (`X`) button
- Client-side validation on selection:
  - Only `.pdf` files (check `file.type === "application/pdf"` OR filename ends in `.pdf`)
  - Max file size: 10 MB (`10 * 1024 * 1024` bytes)
  - Max 5 files total (existing count + new count)
  - On violation: `toast.error(...)` and reject the file
- If `existingUrls.length > 0` and `files.length === 0`: show existing URLs as read-only links
  (use `extractFilename` to show a clean name). Add a small note below: "Upload new files to replace these."
- If `existingUrls.length > 0` and `files.length > 0`: hide the existing section (new files will replace them on save)

Style with Jia tokens: `var(--border-primary)`, `var(--bg-secondary)`, `var(--text-primary)`, etc.
Use `Button` from `@/shared/ui` (variant "secondary", size "sm") for the "Add PDFs" button.

Helper (add near top of file):
```ts
function extractFilename(url: string): string {
  try {
    const parts = new URL(url).pathname.split("/");
    return decodeURIComponent(parts[parts.length - 1] ?? url);
  } catch {
    return url;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

### B. Update `EvaluationEditorDialog`

State changes:
- Remove: `const [supportingDocUrl, setSupportingDocUrl] = useState("")`
- Add: `const [localFiles, setLocalFiles] = useState<File[]>([])`
- Add: `const [existingDocUrls, setExistingDocUrls] = useState<string[]>([])`

In the `useEffect` reset:
- When `initial` is set: `setExistingDocUrls(initial.supportingDocUrls ?? [])`; `setLocalFiles([])`
- When creating new: `setExistingDocUrls([])`; `setLocalFiles([])`

Update `validate()`:
- Remove the URL validation (`isValidUrl`) check

Update `buildInput()`:
- Remove `supportingDocUrl` from the returned object
- The function now only builds the text-field payload

Update `EditorProps` interface:
- Change `onSubmit: (input: EvaluationInput) => void` → `onSubmit: (input: EvaluationInput, files: File[]) => void`
- Change `onRequestSend: (payload: SendPayload) => void` (SendPayload gains `files: File[]`)

Update `SendPayload` interface:
- Add `files: File[]`

Update `handleSubmit`:
- Pass `localFiles` as second arg: `onSubmit(input, localFiles)`

Update `handleSend`:
- Include `files: localFiles` in the payload passed to `onRequestSend`

In the form JSX, replace the entire "Supporting links" `FormField` block (the URL text input with the static `https://` prefix) with:
```tsx
<FormField
  label="Supporting documents"
  htmlFor="ev-docs"
  hint="PDF files only · up to 5 files · 10 MB each"
  optional
  hintAbove
>
  <PdfFilePicker
    files={localFiles}
    existingUrls={existingDocUrls}
    onChange={setLocalFiles}
    error={errors.doc}
  />
</FormField>
```

In the **preview** section, replace the supporting links block:
```tsx
{/* Before: shows supportingDocUrl URL text */}
{/* After: show selected file names */}
{(localFiles.length > 0 || existingDocUrls.length > 0) && (
  <div>
    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
      Supporting documents
    </p>
    {localFiles.length > 0 ? (
      localFiles.map((f) => (
        <p key={f.name} className="flex items-center gap-1.5 text-sm text-[color:var(--text-primary)]">
          <FileText size={13} className="flex-none text-[color:var(--text-tertiary)]" />
          {f.name}
        </p>
      ))
    ) : (
      existingDocUrls.map((url) => (
        <a key={url} href={url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-[color:hsl(var(--primary))] underline">
          <FileText size={13} className="flex-none" />
          {extractFilename(url)}
        </a>
      ))
    )}
  </div>
)}
```

### C. Update `EvaluationsPage` (handleSubmit + handleSend)

`handleSubmit(input, files)`:
- Pass `files` to `updateMutation.mutate({ id, input, files })` and `createMutation.mutate({ input, files })`

`handleSend`:
- `pendingSend` now has `files: File[]`; forward them to `updateMutation` and `createMutation` calls in the send flow

`onRequestSend`:
- Forward `files: localFiles` from the editor: `onRequestSend({ existing: initial, input, name: previewName, files: localFiles })`

Remove `isValidUrl` helper (no longer needed after removing URL text field).

**Also remove**: the `draftDocValid` variable that depended on `supportingDocUrl`.

Add `FileText` to the lucide imports (needed in the preview block and in `PdfFilePicker`).

**Verification:** TypeScript compiles. App renders without console errors.

---

## Task 5: Review dialog + employee screen

### `frontend/src/modules/performance/evaluations/components/review-evaluation-dialog.tsx`

Replace the single `supportingDocUrl` link section:

```tsx
{/* Before */}
{ev.supportingDocUrl && (
  <Section title="Links">
    <a href={ev.supportingDocUrl} ...>
      <ExternalLink size={14} /> {ev.supportingDocUrl}
    </a>
  </Section>
)}

{/* After */}
{ev.supportingDocUrls.length > 0 && (
  <Section title="Supporting documents">
    <div className="space-y-1.5">
      {ev.supportingDocUrls.map((url) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-[color:var(--brand-blue)] underline underline-offset-2 break-all"
        >
          <FileText size={14} className="flex-none" />
          {extractFilename(url)}
        </a>
      ))}
    </div>
  </Section>
)}
```

Add `extractFilename` helper (same implementation as in Task 4) and `FileText` to lucide imports.
Remove `ExternalLink` import if no longer used.

### `frontend/src/screens/employee/surveys.page.tsx`

This file uses `ReviewEvaluationDialog` via the module barrel. The type change from Task 2 propagates automatically. No structural changes needed — just verify TypeScript compiles cleanly.

**Verification:** TypeScript compiles. Review dialog renders with file list. Employee screen has no TS errors.
