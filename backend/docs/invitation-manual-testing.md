# Invitation Management API — Manual Testing Guide

Use this guide to test the HR Invitation endpoints with **realistic Philippine onboarding data**.

## Before you start

1. **Configure email in your `.env` file** (inside the `backend` folder):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
EMAIL_FROM=your-email@gmail.com
NODE_ENV=development
```

> **Important:** Use a **Gmail App Password**, not your regular Gmail password.
> Google Account → Security → 2-Step Verification → App passwords.

2. **Start the backend** (from the `backend` folder):

```bash
npm run dev
```

The server usually runs at `http://localhost:3001`.

3. **Get a Firebase ID token** for an HR account that already exists in the database.
   - Sign in through the frontend as HR, then copy the bearer token from your browser dev tools (Network tab → any API request → `Authorization` header).

4. **Open Swagger UI** at `http://localhost:3001/docs` and look for the **Invitations** section.

5. **Authorize in Swagger:**
   - Click the **Authorize** button (lock icon) at the top.
   - Paste your Firebase ID token.
   - Click **Authorize**, then **Close**.

---

## Step 0 — Create an employee to onboard (get a record ID)

If you do not already have an onboarding record, first create one.

In Swagger, expand **POST /api/v1/onboarding** and click **Try it out**.

Use this realistic JSON payload:

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

**Expected success (201):** Copy these values from the response:
- `data.onboardingRecord.id` → this is your **recordId**
- `data.invitation.id` → this is your **invitationId**

Example:

```json
{
  "success": true,
  "message": "Employee onboarded successfully",
  "data": {
    "employee": {
      "companyEmail": "maria.santos@launchpad.ph",
      "firstName": "Maria",
      "lastName": "Santos",
      "status": "onboarding"
    },
    "onboardingRecord": {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "isComplete": false
    },
    "invitation": {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "sentToEmail": "maria.santos@launchpad.ph",
      "status": "pending"
    }
  }
}
```

---

## Step 1 — Send the onboarding invitation email

Expand **POST /api/v1/onboarding/invitations/{recordId}/send**.

1. Click **Try it out**
2. Paste your `recordId` into the path field
3. Click **Execute**

**No request body is needed.**

**Expected success (201):**

```json
{
  "success": true,
  "message": "Invitation sent successfully",
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "recordId": "770e8400-e29b-41d4-a716-446655440002",
    "sentToEmail": "maria.santos@launchpad.ph",
    "status": "pending",
    "sentAt": "2026-06-17T08:00:00.000Z",
    "expiresAt": "2026-07-17T08:00:00.000Z"
  }
}
```

**Check your inbox:** Maria should receive an email at `maria.santos@launchpad.ph` with onboarding instructions.

---

## Step 2 — View invitation status

Expand **GET /api/v1/onboarding/invitations/{recordId}**.

1. Click **Try it out**
2. Paste your `recordId`
3. Click **Execute**

**Expected success (200):**

```json
{
  "success": true,
  "message": "Invitation status retrieved successfully",
  "data": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "recordId": "770e8400-e29b-41d4-a716-446655440002",
      "sentToEmail": "maria.santos@launchpad.ph",
      "status": "pending",
      "sentAt": "2026-06-17T08:00:00.000Z",
      "expiresAt": "2026-07-17T08:00:00.000Z"
    }
  ]
}
```

Possible `status` values:
- `pending` — waiting for the employee to sign in
- `accepted` — employee has created their account
- `expired` — invitation passed its 30-day expiry window
- `failed_delivery` — email could not be delivered

---

## Step 3 — Resend the invitation

Expand **POST /api/v1/onboarding/invitations/{invitationId}/resend**.

1. Click **Try it out**
2. Paste your `invitationId`
3. Click **Execute**

**No request body is needed.**

**Expected success (200):**

```json
{
  "success": true,
  "message": "Invitation resent successfully",
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "sentToEmail": "maria.santos@launchpad.ph",
    "status": "pending"
  }
}
```

Maria should receive another onboarding email.

---

## Step 4 — Correct the invitation email (before account creation)

Use this when HR typed the wrong company email during onboarding.

Expand **PATCH /api/v1/onboarding/invitations/{invitationId}/email**.

1. Click **Try it out**
2. Paste your `invitationId`
3. Use this JSON body:

```json
{
  "email": "maria.santos.corrected@launchpad.ph"
}
```

4. Click **Execute**

**Expected success (200):**

```json
{
  "success": true,
  "message": "Invitation email updated and resent successfully",
  "data": {
    "sentToEmail": "maria.santos.corrected@launchpad.ph",
    "status": "pending"
  }
}
```

The corrected address should receive the invitation email.

**Expected error (409)** if the employee already signed in with Google:

```json
{
  "success": false,
  "message": "The employee has already created their account. The email cannot be changed.",
  "errorCode": "ACCOUNT_ALREADY_CREATED"
}
```

---

## Quick checklist

| Step | Endpoint | What to verify |
|------|----------|----------------|
| 0 | `POST /api/v1/onboarding` | Employee created, you have `recordId` and `invitationId` |
| 1 | `POST /api/v1/onboarding/invitations/{recordId}/send` | Email arrives in inbox, status is `pending` |
| 2 | `GET /api/v1/onboarding/invitations/{recordId}` | Status list shows the invitation |
| 3 | `POST /api/v1/onboarding/invitations/{invitationId}/resend` | Second email arrives |
| 4 | `PATCH /api/v1/onboarding/invitations/{invitationId}/email` | Corrected email receives invite |

---

## Troubleshooting email delivery

If you get **422 Failed to deliver the invitation email**:

1. Confirm `SMTP_USER` and `SMTP_PASS` are set in `.env`
2. Confirm you are using a **Gmail App Password**, not your normal password
3. Confirm `SMTP_HOST=smtp.gmail.com` and `SMTP_PORT=587`
4. Restart the backend after changing `.env`

If status shows `failed_delivery`, fix your SMTP settings and use **Resend** (Step 3) to try again.
