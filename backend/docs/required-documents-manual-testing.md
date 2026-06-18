# Required Documents API — Manual Testing Guide

Use this guide to test the HR Required Documents endpoints with **real Philippine onboarding documents**, not placeholder test data.

## Before you start

1. **Start the backend** (from the `backend` folder):
   ```bash
   npm run dev
   ```
   The server usually runs at `http://localhost:3001`.

2. **Get a Firebase ID token** for an HR account that already exists in the database.
   - Sign in through the frontend as HR, then copy the bearer token from your browser dev tools (Network tab → any API request → `Authorization` header).
   - Or use your Firebase auth flow and paste the token into the commands below.

3. **Set your token once** (replace with your real token):
   ```bash
   set TOKEN=YOUR_FIREBASE_ID_TOKEN_HERE
   ```
   On Mac/Linux use:
   ```bash
   export TOKEN=YOUR_FIREBASE_ID_TOKEN_HERE
   ```

4. **Optional:** Open Swagger UI at `http://localhost:3001/docs` and look for the **Onboarding Documents** section.

---

## Step 1 — Create required documents (HR checklist)

Run these one at a time. Each creates a real document an employee would upload during onboarding.

### NBI Clearance
```bash
curl -X POST http://localhost:3001/api/v1/onboarding/documents ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"documentName\":\"NBI Clearance\",\"instructions\":\"Upload a clear scanned copy of your NBI Clearance issued within the last 6 months.\",\"allowedFileTypes\":\"pdf\",\"isRequired\":true}"
```

### SSS E-1 Form
```bash
curl -X POST http://localhost:3001/api/v1/onboarding/documents ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"documentName\":\"SSS E-1 Form\",\"instructions\":\"Submit your SSS E-1 or E-4 form showing your SSS number.\",\"allowedFileTypes\":\"pdf\",\"isRequired\":true}"
```

### PhilHealth MDR
```bash
curl -X POST http://localhost:3001/api/v1/onboarding/documents ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"documentName\":\"PhilHealth MDR\",\"instructions\":\"Provide your PhilHealth Member Data Record.\",\"allowedFileTypes\":\"pdf,jpg,png\",\"isRequired\":true}"
```

### BIR TIN Certificate
```bash
curl -X POST http://localhost:3001/api/v1/onboarding/documents ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"documentName\":\"BIR TIN Certificate\",\"instructions\":\"Upload your BIR Form 2316 or TIN ID.\",\"allowedFileTypes\":\"pdf,jpg,png\",\"isRequired\":true}"
```

### Signed Company NDA
```bash
curl -X POST http://localhost:3001/api/v1/onboarding/documents ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"documentName\":\"Signed Company NDA\",\"instructions\":\"Download, sign, and upload the company Non-Disclosure Agreement.\",\"allowedFileTypes\":\"pdf\",\"isRequired\":true}"
```

### Pre-employment Medical Certificate
```bash
curl -X POST http://localhost:3001/api/v1/onboarding/documents ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"documentName\":\"Pre-employment Medical Certificate\",\"instructions\":\"Upload your medical certificate from an accredited clinic.\",\"allowedFileTypes\":\"pdf,jpg\",\"isRequired\":true}"
```

**Expected success (201):**
```json
{
  "success": true,
  "message": "Required document created successfully",
  "data": {
    "id": "...",
    "documentName": "NBI Clearance",
    "instructions": "Upload a clear scanned copy...",
    "allowedFileTypes": "pdf",
    "isRequired": true,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

Copy the `id` from one response — you'll use it in later steps.

---

## Step 2 — List all required documents

```bash
curl http://localhost:3001/api/v1/onboarding/documents ^
  -H "Authorization: Bearer %TOKEN%"
```

**Expected success (200):** A `data` array containing all six documents you created.

This is the checklist employees will upload against during onboarding (once the employee upload UI is connected).

---

## Step 3 — Get one document by ID

Replace `DOCUMENT_ID` with an ID from Step 1 or Step 2.

```bash
curl http://localhost:3001/api/v1/onboarding/documents/DOCUMENT_ID ^
  -H "Authorization: Bearer %TOKEN%"
```

**Expected success (200):** Single document object in `data`.

**Expected error (404):** If the ID does not exist:
```json
{
  "success": false,
  "message": "Required document not found",
  "errorCode": "DOCUMENT_NOT_FOUND"
}
```

---

## Step 4 — Update a document

Example: tighten PhilHealth instructions or add PNG support to the medical certificate.

```bash
curl -X PUT http://localhost:3001/api/v1/onboarding/documents/DOCUMENT_ID ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"documentName\":\"Pre-employment Medical Certificate\",\"instructions\":\"Upload your medical certificate from an accredited clinic. Must be dated within the last 30 days.\",\"allowedFileTypes\":\"pdf,jpg,png\",\"isRequired\":true}"
```

**Expected success (200):** Updated document in `data`.

---

## Step 5 — Delete a document

Remove a document you no longer require (e.g. if HR policy changes).

```bash
curl -X DELETE http://localhost:3001/api/v1/onboarding/documents/DOCUMENT_ID ^
  -H "Authorization: Bearer %TOKEN%"
```

**Expected success (200):** Deleted document returned one last time in `data`.

---

## Step 6 — Verify validation errors

### Missing document name (400)
```bash
curl -X POST http://localhost:3001/api/v1/onboarding/documents ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"allowedFileTypes\":\"pdf\"}"
```

### Unsupported file type (400)
```bash
curl -X POST http://localhost:3001/api/v1/onboarding/documents ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"documentName\":\"NBI Clearance\",\"allowedFileTypes\":\"exe\"}"
```

**Expected:** `400` with `errorCode: "VALIDATION_FAILED"`.

---

## Step 7 — Verify authorization (403)

Sign in as a regular **Employee** (not HR) and use that token instead.

```bash
curl http://localhost:3001/api/v1/onboarding/documents ^
  -H "Authorization: Bearer EMPLOYEE_TOKEN"
```

**Expected (403):**
```json
{
  "success": false,
  "message": "You do not have permission to perform this action"
}
```

Only HR can manage the required documents list.

---

## Quick checklist

- [ ] HR can create documents with name, instructions, and file types
- [ ] GET list returns all configured documents
- [ ] GET by ID, PUT, and DELETE work for a known document
- [ ] Invalid input returns 400
- [ ] Missing document returns 404
- [ ] Regular employee gets 403
