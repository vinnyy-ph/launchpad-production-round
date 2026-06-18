# Notifications Manual Testing Guide

This guide walks through testing the HR onboarding completion notification feature using Swagger UI.

## Prerequisites

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```
2. Open Swagger UI in your browser:
   ```
   http://localhost:3001/docs
   ```
3. You need a valid Firebase bearer token. Click **Authorize** in Swagger and paste:
   ```
   Bearer <your-firebase-id-token>
   ```

## What this feature does

When an employee finishes onboarding and their status becomes **Active**, every HR user receives:

- A saved **in-app notification** in the database
- A real-time **Socket.IO** event named `notification`

---

## Step 1 — Complete onboarding (triggers the notification)

Use the **Employee Onboarding** section in Swagger.

**Endpoint:** `POST /api/v1/employee-onboarding/complete`

**Who can call it:** An employee account that has finished all onboarding steps (profile, custom fields, documents).

**Request body:** None (empty body)

**Expected response (200):**
```json
{
  "success": true,
  "message": "Onboarding completed successfully",
  "data": {
    "recordId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "isComplete": true,
    "completedAt": "2026-06-18T03:30:00.000Z",
    "employeeStatus": "active"
  }
}
```

**Alternative HR path:** `POST /api/v1/onboarding/{employeeId}/complete`  
Use this when HR completes onboarding after approving all required documents.

**Sample path parameter:**
```
employeeId = 8a7b6c5d-4e3f-2019-8765-432109876543
```

---

## Step 2 — List HR notifications

Switch to an **HR account** bearer token, then use the **Notifications** section.

**Endpoint:** `GET /api/v1/notifications`

**Query parameters:**
| Name  | Value | Description                    |
|-------|-------|--------------------------------|
| limit | 10    | Max notifications to return    |

**Expected response (200):**
```json
{
  "success": true,
  "message": "Notifications retrieved successfully",
  "data": [
    {
      "id": "3f2a1b4c-5d6e-7f80-91a2-b3c4d5e6f789",
      "type": "ONBOARDING_COMPLETE",
      "subject": "Employee onboarding completed",
      "body": "Maria Santos has completed onboarding and is now active.",
      "linkUrl": "/employees/8a7b6c5d-4e3f-2019-8765-432109876543",
      "isRead": false,
      "createdAt": "2026-06-18T03:30:00.000Z"
    }
  ]
}
```

---

## Step 3 — Mark a notification as read

**Endpoint:** `PATCH /api/v1/notifications/{notificationId}/read`

**Sample path parameter:**
```
notificationId = 3f2a1b4c-5d6e-7f80-91a2-b3c4d5e6f789
```

**Request body:** None (empty body)

**Expected response (200):**
```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": {
    "id": "3f2a1b4c-5d6e-7f80-91a2-b3c4d5e6f789",
    "type": "ONBOARDING_COMPLETE",
    "subject": "Employee onboarding completed",
    "body": "Maria Santos has completed onboarding and is now active.",
    "linkUrl": "/employees/8a7b6c5d-4e3f-2019-8765-432109876543",
    "isRead": true,
    "createdAt": "2026-06-18T03:30:00.000Z"
  }
}
```

---

## Step 4 — Test real-time delivery (Socket.IO)

Use a Socket.IO client (browser console or a tool like Postman with WebSocket support):

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3001", {
  auth: { userId: "<hr-user-id-from-database>" },
});

socket.on("notification", (payload) => {
  console.log("New notification:", payload);
});
```

Then complete onboarding (Step 1). The HR client should receive the `notification` event immediately with the same payload shape as the REST response.

---

## Realistic sample employee data

Use these values when setting up onboarding before completing:

| Field            | Sample value                                      |
|------------------|---------------------------------------------------|
| firstName        | Maria                                             |
| lastName         | Santos                                            |
| companyEmail     | maria.santos@launchpad.ph                         |
| personalEmail    | maria.santos.personal@gmail.com                   |
| jobTitle         | HR Coordinator                                    |
| department       | People Operations                                 |
| address          | 12 Mabini St, Quezon City, Metro Manila           |
| emergencyContact | Juan Santos - 09171234567                         |
| SSS Number       | 34-1234567-8                                      |
| document fileUrl | https://storage.launchpad.ph/onboarding/maria-santos/nbi-clearance.pdf |

---

## Troubleshooting

| Problem | Likely cause |
|---------|--------------|
| Empty notifications list | Logged in as non-HR account, or onboarding not yet completed |
| 404 on list | Account has no linked employee profile |
| 404 on mark read | Wrong notification ID or notification belongs to another user |
| No socket event | Socket client not connected with correct `auth.userId` |
