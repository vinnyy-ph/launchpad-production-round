# Employee Onboarding API — Manual Testing Guide

Use this guide to test the **Employee self-service onboarding** endpoints with realistic Philippine data.

## Before you start

1. **Start the backend** (from the `backend` folder):

```bash
npm run dev
```

The server usually runs at `http://localhost:3001`.

2. **Open Swagger UI** at `http://localhost:3001/docs` and look for the **Employee Onboarding** section.

3. **Set up HR prerequisites first** (you need these before the employee can onboard):
   - An employee created via `POST /api/v1/onboarding`
   - Required documents configured via `POST /api/v1/onboarding/documents`
   - Custom fields configured via `POST /api/v1/onboarding/custom-fields`
   - Invitation sent via `POST /api/v1/onboarding/invitations/{recordId}/send`

4. **Get a Firebase ID token** for the **employee account** (not HR).
   - Sign in through the frontend using the invited company email (e.g. `maria.santos@launchpad.ph`)
   - Copy the bearer token from your browser dev tools (Network tab → any API request → `Authorization` header)

5. **Authorize in Swagger:**
   - Click the **Authorize** button (lock icon) at the top
   - Paste the employee's Firebase ID token
   - Click **Authorize**, then **Close**

---

## Step 0 — HR setup (do this first as HR)

If you do not already have a test employee, sign in as HR and run these steps first.

### Create the employee

**POST /api/v1/onboarding**

```json
{
  "companyEmail": "maria.santos@launchpad.ph",
  "jobTitle": "HR Coordinator",
  "supervisorId": "PASTE_A_VALID_SUPERVISOR_EMPLOYEE_ID_HERE",
  "department": "People Operations",
  "firstName": "Maria",
  "middleName": "Cruz",
  "lastName": "Santos",
  "personalEmail": "maria.santos.personal@gmail.com",
  "birthday": "1998-03-14",
  "address": "12 Mabini St, Quezon City, Metro Manila",
  "emergencyContact": "Juan Santos - 09171234567"
}
```

Copy from the response:
- `data.onboardingRecord.id` → **recordId**
- `data.employee.id` → employee ID

### Add required documents (HR)

**POST /api/v1/onboarding/documents**

```json
{
  "documentName": "NBI Clearance",
  "instructions": "Upload a clear scanned copy of your NBI Clearance issued within the last 6 months.",
  "allowedFileTypes": "pdf",
  "isRequired": true
}
```

```json
{
  "documentName": "Valid Government ID",
  "instructions": "Upload a clear photo or scan of your passport, driver's license, or national ID.",
  "allowedFileTypes": "pdf,jpg,png",
  "isRequired": true
}
```

Copy each `data.id` — you will need these as **documentId** values later.

### Add custom fields (HR)

**POST /api/v1/onboarding/custom-fields**

```json
{
  "fieldLabel": "SSS Number",
  "isRequired": true
}
```

```json
{
  "fieldLabel": "TIN",
  "isRequired": true
}
```

Copy each `data.id` — you will need these as **fieldId** values later.

### Send the invitation (HR)

**POST /api/v1/onboarding/invitations/{recordId}/send**

No request body needed. Maria should receive an onboarding email.

---

## Step 1 — Accept the invitation (Employee)

Expand **POST /api/v1/employee-onboarding/accept-invitation**.

1. Make sure you are authorized as the **employee** (Maria), not HR
2. Click **Try it out**
3. Click **Execute**

**No request body is needed.**

**Expected success (200):**

```json
{
  "success": true,
  "message": "Invitation accepted successfully",
  "data": {
    "recordId": "770e8400-e29b-41d4-a716-446655440002",
    "isComplete": false,
    "invitationStatus": "accepted",
    "profile": {
      "firstName": "Maria",
      "lastName": "Santos",
      "middleName": "Cruz",
      "personalEmail": "maria.santos.personal@gmail.com",
      "jobTitle": "HR Coordinator",
      "department": "People Operations"
    },
    "documents": [
      {
        "documentName": "NBI Clearance",
        "isRequired": true,
        "latestSubmission": null
      }
    ],
    "customFields": [
      {
        "fieldLabel": "SSS Number",
        "isRequired": true,
        "value": null
      }
    ]
  }
}
```

---

## Step 2 — View onboarding status (Employee)

Expand **GET /api/v1/employee-onboarding/status**.

1. Click **Try it out**
2. Click **Execute**

**Expected success (200):** Same checklist shape as Step 1, showing current progress.

---

## Step 3 — Confirm or edit profile (Employee)

Expand **PATCH /api/v1/employee-onboarding/profile**.

1. Click **Try it out**
2. Use this JSON body:

```json
{
  "firstName": "Maria",
  "lastName": "Santos",
  "middleName": "Cruz",
  "personalEmail": "maria.santos.personal@gmail.com",
  "birthday": "1998-03-14",
  "address": "12 Mabini St, Quezon City, Metro Manila",
  "emergencyContact": "Juan Santos - 09171234567"
}
```

3. Click **Execute**

**Expected success (200):**

```json
{
  "success": true,
  "message": "Onboarding profile updated successfully",
  "data": {
    "firstName": "Maria",
    "lastName": "Santos",
    "emergencyContact": "Juan Santos - +63 917 123 4567"
  }
}
```

---

## Step 4 — Fill custom fields (Employee)

Expand **POST /api/v1/employee-onboarding/custom-fields**.

1. Click **Try it out**
2. Paste your real custom field IDs from Step 0:

```json
{
  "fields": [
    {
      "fieldId": "PASTE_SSS_CUSTOM_FIELD_ID_HERE",
      "value": "34-1234567-8"
    },
    {
      "fieldId": "PASTE_TIN_CUSTOM_FIELD_ID_HERE",
      "value": "123-456-789-000"
    }
  ]
}
```

3. Click **Execute**

**Expected success (200):**

```json
{
  "success": true,
  "message": "Custom field values saved successfully",
  "data": [
    {
      "fieldLabel": "SSS Number",
      "value": "34-1234567-8"
    }
  ]
}
```

---

## Step 5 — Upload required documents (Employee)

Expand **POST /api/v1/employee-onboarding/documents/{documentId}/submit**.

1. Click **Try it out**
2. Paste a **documentId** from Step 0 (e.g. NBI Clearance)
3. Use this JSON body:

```json
{
  "fileUrl": "https://storage.launchpad.ph/onboarding/maria-santos/nbi-clearance.pdf"
}
```

4. Click **Execute**

**Expected success (201):**

```json
{
  "success": true,
  "message": "Document submitted successfully",
  "data": {
    "documentName": "NBI Clearance",
    "fileUrl": "https://storage.launchpad.ph/onboarding/maria-santos/nbi-clearance.pdf",
    "status": "pending"
  }
}
```

Repeat for each required document (Valid Government ID, etc.).

> **Note:** The `fileUrl` must end with an allowed extension (e.g. `.pdf`, `.jpg`, `.png`) matching the document's `allowedFileTypes`.

---

## Step 6 — Re-upload a rejected document (Employee)

Use this when HR rejects a document and Maria needs to upload again.

1. HR rejects the document in the system (status becomes `rejected` with a `rejectionNote`)
2. Employee calls the same endpoint again:

**POST /api/v1/employee-onboarding/documents/{documentId}/submit**

```json
{
  "fileUrl": "https://storage.launchpad.ph/onboarding/maria-santos/nbi-clearance-v2.pdf"
}
```

**Expected success (201):** A new submission with `status: "pending"`.

**Expected error (409)** if you try to re-upload while still pending or already approved:

```json
{
  "success": false,
  "message": "A document can only be re-submitted when the previous submission was rejected",
  "errorCode": "DOCUMENT_SUBMISSION_NOT_ALLOWED"
}
```

---

## Step 7 — Complete onboarding (Employee)

Expand **POST /api/v1/employee-onboarding/complete**.

1. Click **Try it out**
2. Click **Execute**

**No request body is needed.**

**Expected success (200)** when profile, custom fields, and all required documents are submitted:

```json
{
  "success": true,
  "message": "Onboarding completed successfully",
  "data": {
    "recordId": "770e8400-e29b-41d4-a716-446655440002",
    "isComplete": true,
    "completedAt": "2026-06-17T12:00:00.000Z",
    "employeeStatus": "active"
  }
}
```

**Expected error (422)** if something is still missing:

```json
{
  "success": false,
  "message": "Onboarding cannot be completed until all required profile fields, custom fields, and documents are submitted",
  "errorCode": "ONBOARDING_INCOMPLETE"
}
```

---

## Quick checklist

| Step | Endpoint | What to verify |
|------|----------|----------------|
| 0 | HR setup endpoints | Employee, documents, custom fields, invitation sent |
| 1 | `POST /api/v1/employee-onboarding/accept-invitation` | Invitation status becomes `accepted` |
| 2 | `GET /api/v1/employee-onboarding/status` | Checklist shows profile, documents, custom fields |
| 3 | `PATCH /api/v1/employee-onboarding/profile` | Profile saved with formatted phone |
| 4 | `POST /api/v1/employee-onboarding/custom-fields` | Custom field values saved |
| 5 | `POST /api/v1/employee-onboarding/documents/{documentId}/submit` | Document submission is `pending` |
| 6 | Re-submit after HR rejection | New `pending` submission created |
| 7 | `POST /api/v1/employee-onboarding/complete` | `isComplete: true`, employee status `active` |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| **403 Forbidden** | You are signed in as HR. Use the **employee** Firebase token instead. |
| **404 No onboarding record** | HR has not created an onboarding record for this email yet. |
| **409 Invitation expired** | HR must resend the invitation. |
| **400 Invalid file type** | Make sure `fileUrl` ends with an allowed extension (pdf, jpg, png). |
| **422 Onboarding incomplete** | Fill profile, all required custom fields, and submit all required documents first. |
