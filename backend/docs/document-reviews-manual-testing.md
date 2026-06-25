# Document Review API — Manual Testing Guide

Use this guide to test the HR Document Review endpoints with **real Philippine onboarding data**, not placeholder test data.

## Before you start

1. **Start the backend** (from the `backend` folder):
   ```bash
   npm run dev
   ```
   The server usually runs at `http://localhost:3001`.

2. **Get a Firebase ID token** for an **HR** account that already exists in the database.
   - Sign in through the frontend as HR, then copy the bearer token from your browser dev tools (Network tab → any API request → `Authorization` header).

3. **Set your token once** (replace with your real token):
   ```bash
   set TOKEN=YOUR_FIREBASE_ID_TOKEN_HERE
   ```
   On Mac/Linux use:
   ```bash
   export TOKEN=YOUR_FIREBASE_ID_TOKEN_HERE
   ```

4. **Open Swagger UI** at `http://localhost:3001/docs` and look for the **Document Reviews** section.

---

## Prerequisites — set up test data

Before HR can review documents, you need:

1. **Required documents** configured (HR → Onboarding Documents)
2. **An employee onboarded** and invited
3. **The employee submitted at least one document** (Employee Onboarding → submit document)

If you already have a pending submission, skip to Step 1 below.

### Quick setup (if starting fresh)

**A. HR creates a required document (NBI Clearance):**
```bash
curl -X POST http://localhost:3001/api/v1/onboarding/documents ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"documentName\":\"NBI Clearance\",\"instructions\":\"Upload a clear scanned copy of your NBI Clearance issued within the last 6 months.\",\"allowedFileTypes\":\"pdf\",\"isRequired\":true}"
```

Copy the `documentId` from the response.

**B. HR onboards an employee** (use your existing onboarding flow).

**C. Employee signs in and submits the document** using their employee token:
```bash
curl -X POST http://localhost:3001/api/v1/employee-onboarding/documents/DOCUMENT_ID/submit ^
  -H "Authorization: Bearer EMPLOYEE_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"fileUrl\":\"https://storage.launchpad.ph/onboarding/maria-santos/nbi-clearance.pdf\"}"
```

The submission will have status `pending` and is ready for HR review.

---

## Step 1 — List document submissions (HR review queue)

### List all submissions
```bash
curl http://localhost:3001/api/v1/onboarding/document-reviews ^
  -H "Authorization: Bearer %TOKEN%"
```

### List only pending submissions (awaiting review)
```bash
curl "http://localhost:3001/api/v1/onboarding/document-reviews?status=pending" ^
  -H "Authorization: Bearer %TOKEN%"
```

**Expected success (200):**
```json
{
  "success": true,
  "message": "Document submissions retrieved successfully",
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440002",
      "recordId": "770e8400-e29b-41d4-a716-446655440003",
      "documentId": "880e8400-e29b-41d4-a716-446655440004",
      "documentName": "NBI Clearance",
      "fileUrl": "https://storage.launchpad.ph/onboarding/maria-santos/nbi-clearance.pdf",
      "status": "pending",
      "rejectionNote": null,
      "reviewerId": null,
      "submittedAt": "2026-06-17T10:00:00.000Z",
      "reviewedAt": null,
      "employee": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "firstName": "Maria",
        "lastName": "Santos",
        "fullName": "Maria Cruz Santos",
        "companyEmail": "maria.santos@launchpad.ph",
        "jobTitle": "HR Coordinator"
      }
    }
  ]
}
```

Copy the `id` from a pending submission — you'll use it as `SUBMISSION_ID` in the next steps.

---

## Step 2 — Approve a document submission

Replace `SUBMISSION_ID` with the ID from Step 1.

```bash
curl -X PATCH http://localhost:3001/api/v1/onboarding/document-reviews/SUBMISSION_ID/approve ^
  -H "Authorization: Bearer %TOKEN%"
```

**Expected success (200):**
```json
{
  "success": true,
  "message": "Document submission approved successfully",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440002",
    "documentName": "NBI Clearance",
    "status": "approved",
    "reviewerId": "hr-employee-id",
    "reviewedAt": "2026-06-17T11:00:00.000Z",
    "rejectionNote": null,
    "employee": {
      "firstName": "Maria",
      "lastName": "Santos",
      "fullName": "Maria Cruz Santos"
    }
  }
}
```

**In Swagger:** Open **Document Reviews → PATCH approve**, paste the `submissionId`, click **Try it out**, then **Execute**. No request body is needed.

---

## Step 3 — Reject a document submission (with note)

To test rejection, the employee must submit a **new** document first (or use a different pending submission).

Replace `SUBMISSION_ID` with a pending submission ID.

```bash
curl -X PATCH http://localhost:3001/api/v1/onboarding/document-reviews/SUBMISSION_ID/reject ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"rejectionNote\":\"The NBI Clearance scan is too blurry to read. Please upload a clearer PDF copy issued within the last 6 months.\"}"
```

**Sample JSON payload for Swagger (RejectDocumentRequest):**
```json
{
  "rejectionNote": "The NBI Clearance scan is too blurry to read. Please upload a clearer PDF copy issued within the last 6 months."
}
```

**Other realistic rejection notes you can use:**

PhilHealth MDR:
```json
{
  "rejectionNote": "The PhilHealth Member Data Record is cut off at the bottom. Please upload the full page showing your PhilHealth number and membership status."
}
```

Pre-employment Medical Certificate:
```json
{
  "rejectionNote": "The medical certificate is dated more than 30 days ago. Please submit a new certificate from an accredited clinic dated within the last 30 days."
}
```

Signed Company NDA:
```json
{
  "rejectionNote": "The signature on the NDA is missing on page 2. Please download the template again, sign all required pages, and re-upload the complete PDF."
}
```

**Expected success (200):**
```json
{
  "success": true,
  "message": "Document submission rejected successfully",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440002",
    "documentName": "NBI Clearance",
    "status": "rejected",
    "rejectionNote": "The NBI Clearance scan is too blurry to read. Please upload a clearer PDF copy issued within the last 6 months.",
    "reviewerId": "hr-employee-id",
    "reviewedAt": "2026-06-17T11:30:00.000Z"
  }
}
```

After rejection, the employee can **re-upload** the document via:
`POST /api/v1/employee-onboarding/documents/{documentId}/submit`

---

## Step 4 — Verify validation errors

### Missing rejection note (400)
```bash
curl -X PATCH http://localhost:3001/api/v1/onboarding/document-reviews/SUBMISSION_ID/reject ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{}"
```

**Expected:** `400` with `errorCode: "VALIDATION_FAILED"`.

### Invalid status filter (400)
```bash
curl "http://localhost:3001/api/v1/onboarding/document-reviews?status=invalid" ^
  -H "Authorization: Bearer %TOKEN%"
```

### Already reviewed submission (409)
Try approving or rejecting the same submission twice.

**Expected:** `409` with `errorCode: "SUBMISSION_ALREADY_REVIEWED"`.

### Submission not found (404)
```bash
curl -X PATCH http://localhost:3001/api/v1/onboarding/document-reviews/00000000-0000-0000-0000-000000000000/approve ^
  -H "Authorization: Bearer %TOKEN%"
```

---

## Step 5 — Verify authorization (403)

Sign in as a regular **Employee** or **Admin** (not HR) and use that token instead.

```bash
curl http://localhost:3001/api/v1/onboarding/document-reviews ^
  -H "Authorization: Bearer NON_HR_TOKEN"
```

**Expected (403):**
```json
{
  "success": false,
  "message": "You do not have permission to perform this action"
}
```

Only **HR** can review document submissions. Admin handles user management only.

---

## Swagger testing walkthrough

1. Go to `http://localhost:3001/docs`
2. Click **Authorize** and paste your HR Firebase token as `Bearer <token>`
3. Expand **Document Reviews**
4. **GET /api/v1/onboarding/document-reviews**
   - Click **Try it out**
   - Set `status` to `pending` (optional)
   - Click **Execute** — copy a submission `id` from the response
5. **PATCH .../approve**
   - Paste the `submissionId`
   - Click **Execute** (no body needed)
6. For rejection testing, have the employee submit again, then use **PATCH .../reject**
   - Paste the `submissionId`
   - Use this request body:
   ```json
   {
     "rejectionNote": "The NBI Clearance scan is too blurry to read. Please upload a clearer PDF copy issued within the last 6 months."
   }
   ```
   - Click **Execute**

---

## Quick checklist

- [ ] HR can list all document submissions
- [ ] HR can filter by `status=pending` to see the review queue
- [ ] HR can approve a pending submission
- [ ] HR can reject a pending submission with a note
- [ ] Rejected documents allow employee re-upload (via employee-onboarding submit)
- [ ] Missing rejection note returns 400
- [ ] Already reviewed submission returns 409
- [ ] Employee and Admin get 403
