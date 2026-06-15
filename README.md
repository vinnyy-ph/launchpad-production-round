# launchpad-production-erp

Base skeleton for a PERN + NeonDB ERP, scaffolded by the `erp-base-scaffold` skill.
This is structure and wiring only — **no database schema, no auth, no features yet.**
Those are added by the per-module skills.

## Stack
- **PostgreSQL** via **NeonDB** (serverless, hosted — no local DB container)
- **Express** + **TypeScript** (backend)
- **Vite + React** + **TypeScript** + **Tailwind + shadcn/ui** (frontend)
- **Prisma 7** ORM (datasource wired, models intentionally empty)
- npm **workspaces** + **concurrently** monorepo

## Getting started
1. Create a Neon project at https://neon.tech and copy the two connection strings.
2. `cp backend/.env.example backend/.env` and paste the pooled URL into `DATABASE_URL`
   and the direct URL into `DIRECT_URL`. `cp frontend/.env.example frontend/.env`.
3. Install everything from the repo root: `npm install`
4. Generate the Prisma client: `npm run db:generate`
   (There are no models yet, so there is nothing to migrate until a module skill adds them.)
5. Start both dev servers: `npm run dev`
   - API: http://localhost:3001/health
   - App: http://localhost:5173

## Where the next skills plug in
| Concern        | Lands in                                              |
|----------------|-------------------------------------------------------|
| DB schema      | `backend/prisma/schema.prisma` (models)               |
| Shared core    | `backend/src/modules/shared/`, `frontend/src/modules/shared/` |
| Google auth    | `backend/src/modules/shared/auth/`                    |
| People module  | `backend/src/modules/people/`, `frontend/src/modules/people/` |
| Performance    | `backend/src/modules/performance/`, `frontend/src/modules/performance/` |
| shadcn UI      | `frontend/src/components/ui/` (via `npx shadcn add ...`) |

## Working as a team (4 devs)
Modules are isolated folders on both ends so people can work in parallel without
stepping on each other. Suggested ownership: shared-core owner first (unblocks the
rest), then split People / Performance. Keep cross-module imports going **through**
`modules/shared`, never module-to-module directly.
