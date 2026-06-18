# Custom Fields API — Manual Testing Guide

Use this guide to test the HR Custom Fields endpoints with **real Philippine onboarding data**, not placeholder test data.

## Before you start

1. **Start the backend** (from the `backend` folder):
   ```bash
   npm run dev
   ```
   The server usually runs at `http://localhost:3001`.

2. **Get a Firebase ID token** for an HR account that already exists in the database.
   - Sign in through the frontend as HR, then copy the bearer token from your browser dev tools (Network tab → any API request → `Authorization` header).
   - Or use your Firebase auth flow and paste the token into Swagger or the commands below.

3. **Open Swagger UI** at `http://localhost:3001/docs` and look for the **Onboarding Custom Fields** section.

4. **Authorize in Swagger:**
   - Click the **Authorize** button (lock icon) at the top.
   - Paste your Firebase ID token (without the `Bearer` prefix if Swagger adds it for you).
   - Click **Authorize**, then **Close**.

---

## Step 1 — Create custom text fields (HR checklist)

In Swagger, expand **POST /api/v1/onboarding/custom-fields** and click **Try it out**.

Use these realistic JSON payloads one at a time.

### SSS Number (required)
```json
{
  "fieldLabel": "SSS Number",
  "isRequired": true
}
```

### PhilHealth Number (required)
```json
{
  "fieldLabel": "PhilHealth Number",
  "isRequired": true
}
```

### TIN Number (required)
```json
{
  "fieldLabel": "TIN Number",
  "isRequired": true
}
```

### Pag-IBIG MID Number (required)
```json
{
  "fieldLabel": "Pag-IBIG MID Number",
  "isRequired": true
}
```

### Shirt Size (optional)
```json
{
  "fieldLabel": "Shirt Size",
  "isRequired": false
}
```

### Preferred Name (optional)
```json
{
  "fieldLabel": "Preferred Name",
  "isRequired": false
}
```

**Expected success (201):**
```json
{
  "success": true,
  "message": "Custom field created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "fieldLabel": "SSS Number",
    "isRequired": true,
    "createdAt": "2026-06-17T08:00:00.000Z",
    "updatedAt": "2026-06-17T08:00:00.000Z"
  }
}
```

Copy the `id` from one response — you'll use it in later steps.

---

## Step 2 — List all custom fields

In Swagger, expand **GET /api/v1/onboarding/custom-fields** and click **Try it out**, then **Execute**.

**Expected success (200):** A `data` array containing all custom fields you created.

This is the list of extra text questions new employees will answer during onboarding. After onboarding, these values appear on the employee's profile.

---

## Step 3 — Get one custom field by ID

In Swagger, expand **GET /api/v1/onboarding/custom-fields/{id}**.

Replace `{id}` with an ID from Step 1 or Step 2, then click **Execute**.

**Expected success (200):** Single custom field object in `data`.

**Expected error (404):** If the ID does not exist:
```json
{
  "success": false,
  "message": "Custom field not found",
  "errorCode": "CUSTOM_FIELD_NOT_FOUND"
}
```

---

## Step 4 — Update a custom field

In Swagger, expand **PUT /api/v1/onboarding/custom-fields/{id}**.

Example: make "Shirt Size" required and clarify the label.

**Request body:**
```json
{
  "fieldLabel": "Company Shirt Size (S/M/L/XL)",
  "isRequired": true
}
```

**Expected success (200):** Updated custom field in `data`.

---

## Step 5 — Delete a custom field

In Swagger, expand **DELETE /api/v1/onboarding/custom-fields/{id}**.

Remove a field you no longer need (e.g. if HR policy changes).

**Expected success (200):** Deleted custom field returned one last time in `data`.

---

## Step 6 — Verify validation errors

In Swagger, use **POST /api/v1/onboarding/custom-fields** with invalid payloads.

### Missing field label (400)
```json
{
  "isRequired": true
}
```

### Invalid isRequired value (400)
```json
{
  "fieldLabel": "SSS Number",
  "isRequired": "yes"
}
```

**Expected:** `400` with `errorCode: "VALIDATION_FAILED"`.

---

## Step 7 — Verify authorization (403)

Sign in as a regular **Employee** (not HR) and use that token in Swagger instead.

Try **GET /api/v1/onboarding/custom-fields**.

**Expected (403):**
```json
{
  "success": false,
  "message": "You do not have permission to perform this action"
}
```

Only HR and Admin can manage the custom fields list.

---

## Optional — Test with curl (Windows)

Set your token once:
```bash
set TOKEN=YOUR_FIREBASE_ID_TOKEN_HERE
```

Create a required custom field:
```bash
curl -X POST http://localhost:3001/api/v1/onboarding/custom-fields ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"fieldLabel\":\"SSS Number\",\"isRequired\":true}"
```

List all custom fields:
```bash
curl http://localhost:3001/api/v1/onboarding/custom-fields ^
  -H "Authorization: Bearer %TOKEN%"
```

---

## Quick checklist

- [ ] HR can create custom text fields with a label and required/optional flag
- [ ] GET list returns all configured custom fields
- [ ] GET by ID, PUT, and DELETE work for a known custom field
- [ ] Invalid input returns 400
- [ ] Missing custom field returns 404
- [ ] Regular employee gets 403
- [ ] Text fields only (no file upload or dropdown types in MVP)
