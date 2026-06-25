# Manage Jia

> Where your people do their best work.

Manage Jia is a full-stack HR platform that covers the employee lifecycle — onboarding, the people directory, teams and org structure, performance evaluations, pulse surveys, and offboarding clearance — behind Google SSO with role-based access for Admins, HR, and Employees.

It is a TypeScript monorepo: an **Express + Prisma** API backed by **PostgreSQL (Neon)**, and a **Next.js + React** web app. Real-time notifications run over Socket.IO, transactional email over SMTP/Resend, document storage over Cloudinary, and survey insights are generated with OpenAI.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Database & migrations](#database--migrations)
- [API](#api)
- [Background jobs](#background-jobs)
- [Testing](#testing)
- [Project structure](#project-structure)
- [Deployment](#deployment)

---

## Features

**People**
- Employee directory with profiles, addresses, and emergency contacts
- Departments, teams, and team membership
- User management with role assignment (`ADMIN`, `HR`, `EMPLOYEE`)
- Org-chart traversal and supervisor reporting chains
- Activity log / audit trail

**Onboarding**
- Email invitations (single and bulk CSV jobs) with resend tracking
- Configurable onboarding templates and custom fields
- Document upload, submission, and HR review/approval flow
- Separate employee-facing and supervisor-facing onboarding experiences

**Performance**
- Performance evaluations with itemized scoring, supporting documents, and employee acknowledgement (including deemed-acknowledgement after a deadline)
- Pulse surveys with recurring schedules, audience targeting, reminders, and configurable result visibility
- AI-generated survey insights and shareable results

**Offboarding**
- Offboarding records with attachments
- Clearance templates and multi-signatory clearance sign-off
- Automatic inactivation of fully offboarded employees

**Platform**
- Google SSO via Firebase, verified server-side with Firebase Admin
- Real-time in-app notifications (Socket.IO) plus email delivery, with per-user notification preferences
- Private document serving via signed URLs
- Rate limiting, Helmet/CSP hardening, and a versioned (`/api/v1`) REST API documented with Swagger

---

## Tech stack

| Layer       | Technology |
|-------------|------------|
| **Backend** | Node.js, Express 4, TypeScript, Prisma 7 |
| **Database**| PostgreSQL (Neon serverless) |
| **Auth**    | Firebase (Google SSO) + Firebase Admin token verification |
| **Realtime**| Socket.IO |
| **Frontend**| Next.js 16, React 19, TypeScript |
| **UI**      | Tailwind CSS 3, Radix UI / shadcn-style components, Framer Motion, Recharts |
| **State/data** | TanStack Query, Zustand, React Hook Form + Zod |
| **Email**   | Nodemailer (SMTP, dev) / Resend (prod) |
| **Storage** | Cloudinary |
| **AI**      | OpenAI |
| **Tooling** | npm workspaces, `concurrently`, Jest, Playwright |

## Architecture

```
launchpad-production-round/   (npm workspaces monorepo)
├── backend/                  Express + Prisma API  (port 3001)
│   └── src/
│       ├── core/             shared infra: db, errors, middleware, socket, email, swagger
│       ├── modules/          feature modules (auth, people, performance, notifications, …)
│       ├── jobs/             scheduled cron jobs
│       └── prisma/           schema (split per model) + migrations
└── frontend/                 Next.js app  (port 3000)
    └── src/
        ├── app/              App Router routes, grouped by (auth) / (app) / (dev)
        ├── modules/          feature logic (auth, people, performance, …)
        ├── screens/          role-scoped pages (admin, hr, supervisor, employee)
        └── shared/           UI components, hooks, lib, styles
```

The frontend proxies API calls to the backend server-side (see `frontend/src/proxy.ts` for the CSP configuration), so the Express origin is never exposed directly to the browser. Backend modules follow a `routes → controller → service → repository` layering and never import each other directly — cross-module logic lives in `modules/shared`.

## Prerequisites

- **Node.js** ≥ 20 and **npm** ≥ 10
- A **Neon** PostgreSQL project — https://neon.tech (pooled + direct connection strings)
- A **Firebase** project with Google sign-in enabled (web config + Admin service account)
- Accounts/keys for **OpenAI**, **Cloudinary**, and an SMTP provider or **Resend** (for email)

## Getting started

```bash
# 1. Clone and install (installs all workspaces)
git clone <repo-url>
cd launchpad-production-round
npm install

# 2. Configure environment
cp backend/.env.example  backend/.env
cp frontend/.env.example frontend/.env
# then fill in the values — see "Environment variables" below

# 3. Generate the Prisma client and apply migrations
npm run db:generate
npm run db:migrate

# 4. Start both dev servers
npm run dev
```

- **Web app:** http://localhost:3000
- **API:** http://localhost:3001 — health check at http://localhost:3001/health
- **API docs (dev only):** http://localhost:3001/docs

## Environment variables

### `backend/.env`

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon **pooled** connection string (used at runtime) |
| `DIRECT_URL` | Neon **direct** connection string (used by Prisma for migrations) |
| `PORT` | API port (default `3001`) |
| `CORS_ORIGIN` | Comma-separated allowed origins (e.g. `http://localhost:3000`) |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | Firebase Admin service-account credentials for ID-token verification |
| `OPENAI_API_KEY` | OpenAI key for survey insights (`OPENAI_MODEL` optional) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `EMAIL_FROM` | SMTP email (dev) |
| `RESEND_API_KEY` | Resend email (prod) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Document/file uploads |
| `NODE_ENV` | `development` / `production` |

### `frontend/.env`

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_*` | Public Firebase web config (API key, auth domain, project ID, storage bucket, sender ID, app ID) |
| `API_PROXY_TARGET` | Server-side Express API target (default `http://127.0.0.1:3001`); not exposed to the client |

> See `backend/.env.example` and `frontend/.env.example` for the full, annotated templates.

## Scripts

Run from the repository root:

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend and frontend dev servers concurrently |
| `npm run build` | Build both workspaces |
| `npm test` | Run backend tests |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:migrate` | Create/apply a dev migration |
| `npm run db:studio` | Open Prisma Studio |

Workspace-scoped scripts are available via `npm run <script> -w backend` / `-w frontend` (e.g. `npm run lint -w frontend`, `npm run test:watch -w frontend`, `npm run db:seed -w backend`).

## Database & migrations

Prisma is configured with a **split schema** — each model lives in its own file under `backend/src/prisma/schema/models/` and enums in `schema/enums/`. Migrations are in `backend/src/prisma/migrations/`.

```bash
npm run db:migrate           # create & apply a migration in dev
npm run db:generate          # regenerate the client after schema changes
npm run db:studio            # browse data
npm run db:seed -w backend   # seed (if a seed script is present)
```

## API

The REST API is versioned under `/api/v1`. All routes except authentication and signed-document URLs require a Firebase ID token (`Authorization: Bearer <token>`). Interactive Swagger docs are served at `/docs` in non-production environments.

Representative route groups:

```
/api/auth                         Google SSO session exchange
/api/v1/me                        current user
/api/v1/users                     user & role management
/api/v1/employees                 employee profiles
/api/v1/departments  /teams       org structure
/api/v1/onboarding   /employee-onboarding   /supervisor-onboarding
/api/v1/offboarding  /clearance   /clearance-templates
/api/v1/evaluations               performance evaluations
/api/v1/pulse                     pulse surveys
/api/v1/notifications             in-app notifications
/api/v1/documents                 signed-URL document access
/api/v1/dashboard                 dashboard aggregates
```

## Background jobs

Scheduled jobs live in `backend/src/jobs/` and are run as standalone processes (e.g. via a scheduler/cron in production):

| Script | Purpose |
|--------|---------|
| `npm run cron:daily -w backend` | Daily aggregate job |
| `npm run cron:deemed-ack -w backend` | Mark evaluations as deemed-acknowledged after the deadline |
| `npm run cron:eval-ack-reminder -w backend` | Remind employees to acknowledge evaluations |
| `npm run cron:offboarding-inactivation -w backend` | Inactivate fully offboarded employees |
| `npm run cron:survey-reminder -w backend` | Send pulse-survey reminders |

## Testing

- **Backend:** Jest + Supertest — `npm test` (or `npm run test -w backend`)
- **Frontend:** Jest + Testing Library — `npm run test -w frontend`
- **E2E:** Playwright is configured at the repo root

## Project structure

```
.
├── backend/          Express + Prisma API
│   └── src/
│       ├── core/     db, errors, middleware, socket, email, swagger, globals
│       ├── modules/  auth · people · performance · notifications · dashboard · documents
│       ├── jobs/     scheduled cron jobs
│       └── prisma/   split schema + migrations
├── frontend/         Next.js web app
│   └── src/
│       ├── app/      App Router (auth / app / dev route groups)
│       ├── modules/  feature logic
│       ├── screens/  role-scoped pages
│       └── shared/   UI, hooks, lib, styles
├── CLAUDE.md         contributor/AI coding guidelines
└── package.json      workspace root
```

## Deployment

Both workspaces build to standard Node/Next.js artifacts:

```bash
npm run build
npm run start -w backend    # node dist/server.js
npm run start -w frontend   # next start
```

The backend expects to run behind a single reverse proxy in production (it sets `trust proxy` so rate limiting reads the real client IP) and enforces a strict Content-Security-Policy. Set `NODE_ENV=production`, point `CORS_ORIGIN` at the deployed frontend URL, and use the Resend API for email. The codebase is configured for deployment on Railway (backend) with Neon as the managed database.

---