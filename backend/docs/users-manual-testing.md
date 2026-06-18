# User Management API — Manual Testing Guide

Use this guide to test the **Admin User Management** endpoints (`/api/v1/users`).

## Before you start

1. **Start the backend** (from the `backend` folder):

```bash
npm run dev
```

The server usually runs at `http://localhost:3001`.

2. **Get a Firebase ID token** for an **Admin** account.

   - Sign in through the frontend as Admin, then copy the bearer token from DevTools
     (Network tab → any API request → `Authorization` header).

3. **Open Swagger UI** at `http://localhost:3001/docs` and look for the **Users** section.

4. **Authorize in Swagger:**

   - Click **Authorize** (lock icon).
   - Paste your Firebase ID token.
   - Click **Authorize**, then **Close**.

> All `/api/v1/users` routes require the **ADMIN** role. HR and Employee tokens receive **403**.

---

## Step 1 — List users (paginated + sorted)

Expand **GET /api/v1/users** and try these query combinations:

| Parameter | Example | Notes |
|-----------|---------|-------|
| `page` | `1` | Default `1` |
| `limit` | `10` | Default `10`, max `100` |
| `role` | `HR` | Filter by `ADMIN`, `HR`, or `EMPLOYEE` |
| `isActive` | `false` | Filter active vs deactivated |
| `includeDeactivated` | `true` | Include deactivated users in results |
| `sortBy` | `name` | `name`, `role`, `status`, or `lastLogin` |
| `sortOrder` | `asc` | `asc` or `desc` |

**Example:** active HR users, page 1, sorted by name ascending:

```
GET /api/v1/users?page=1&limit=10&role=HR&isActive=true&sortBy=name&sortOrder=asc
```

**Expected success (200):**

```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [ /* UserListItem[] */ ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5
  }
}
```

Each list item includes `lastLoginAt` (nullable). It is updated when the user signs in via **POST /api/auth/session**.

---

## Step 2 — Add a user

Expand **POST /api/v1/users** and use:

```json
{
  "email": "jordan.park@swiftwork.demo",
  "role": "EMPLOYEE",
  "firstName": "Jordan",
  "lastName": "Park"
}
```

Allowed roles: **`ADMIN`**, **`HR`**, **`EMPLOYEE`**.

**Expected success (201):** User + linked employee record created. Email is normalized to lowercase.

**Common errors:**

| Status | Cause |
|--------|--------|
| 400 | Missing fields, invalid email, or invalid role |
| 409 | Email already exists |

---

## Step 3 — Change a user's role

Expand **PATCH /api/v1/users/{userId}/role**.

```json
{
  "role": "HR"
}
```

Allowed roles: **`ADMIN`**, **`HR`**, **`EMPLOYEE`**.

**Expected success (200):** Role updated on the user record.

**Lockout / safety rules:**

| Status | Cause |
|--------|--------|
| 403 | Caller is not admin, or admin tried to change their own role |
| 409 | Target user is already deactivated |
| 422 | Cannot demote the **only remaining active admin** |

---

## Step 4 — Deactivate a user

Expand **PATCH /api/v1/users/{userId}/deactivate**. No request body.

**Expected success (200):** `isActive` set to `false`. Employee data is retained.

**Common errors:**

| Status | Cause |
|--------|--------|
| 403 | Caller is not admin, or admin tried to deactivate themselves |
| 404 | User not found |
| 409 | User already deactivated |
| 422 | Cannot deactivate the **only remaining active admin** |

---

## Step 5 — Last login timestamp

1. Note a user's `lastLoginAt` from **GET /api/v1/users** (may be `null` if they never signed in).
2. Have that user sign in (or call **POST /api/auth/session** with their Firebase token).
3. List users again — `lastLoginAt` should reflect the recent sign-in.

---

## Authorization smoke test

Sign in as **HR** or **Employee** and repeat any `/api/v1/users` call.

**Expected:** **403 Forbidden** on all user management endpoints.

---

## Quick curl examples (Windows)

Replace `YOUR_ADMIN_TOKEN` and `USER_ID`:

```bat
curl http://localhost:3001/api/v1/users?page=1^&limit=10^&sortBy=name^&sortOrder=asc ^
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

curl -X POST http://localhost:3001/api/v1/users ^
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"new.user@swiftwork.demo\",\"role\":\"EMPLOYEE\",\"firstName\":\"New\",\"lastName\":\"User\"}"

curl -X PATCH http://localhost:3001/api/v1/users/USER_ID/role ^
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"role\":\"HR\"}"

curl -X PATCH http://localhost:3001/api/v1/users/USER_ID/deactivate ^
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```
