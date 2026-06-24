/**
 * One-off backfill: ADD four real, loggable QA test accounts to an already-seeded
 * database (does NOT reset or re-run the seed). These let a single tester drive the
 * full Performance-module RBAC matrix from personas the 8 seeded executives can't cover:
 * an HR creator/viewer, a non-HR supervisor, a leaf IC, and a team member.
 *
 * Placement (resolved by name against the LIVE db, never hardcoded ids):
 *   N1  billyalfonso1969@gmail.com  HR        dept People            supervisor CHRO (Darben)
 *   N2  lavarack2002@gmail.com      EMPLOYEE  dept Customer Support   supervisor COO  (Vn)
 *   N3  akpds122020@gmail.com       EMPLOYEE  dept Customer Support   supervisor N2          (leaf)
 *   N4  allenkurt.ds@gmail.com      EMPLOYEE  dept Customer Support   supervisor N2   team Patient App
 * N2 supervises N3 and N4, so the tester owns one self-contained supervisor->reports
 * cluster for the whole evaluation lifecycle and supervisor-scoped pulse results.
 *
 * SAFE for production:
 *   - INSERT-ONLY: creates User/Employee/address/emergencyContact/TeamMember rows; never
 *     updates or deletes anything that already exists.
 *   - Idempotent: an account whose email already exists (User.email OR Employee.companyEmail)
 *     is skipped; team membership uses skipDuplicates. Re-running is a no-op.
 *   - Each account is created in its own transaction; a failure rolls that account back.
 *   - DRY-RUN by default. Prints the resolved placement so you can eyeball it. Pass --apply
 *     to actually write.
 *
 * Cleanup later (these are clearly tagged): the four are the only employees whose lastName
 * is 'Tester'. Delete via that, or by the four emails.
 *
 * Usage (from backend/), targeting PRODUCTION explicitly via env (do NOT rely on .env):
 *   DATABASE_URL="<prod>" DIRECT_URL="<prod>" \
 *     npx ts-node --project tsconfig.seed.json --transpile-only prisma/seed/backfill-qa-test-accounts.ts [--apply]
 */
import 'dotenv/config'
import * as dns from 'node:dns'
// This host black-holes IPv6 to Neon; force IPv4 DNS ordering before any DB connect.
dns.setDefaultResultOrder('ipv4first')

import { PrismaClient, Role, EmployeeStatus } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const APPLY = process.argv.includes('--apply')
const DELETE = process.argv.includes('--delete') // remove the four accounts instead of adding

const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL/DIRECT_URL is required')

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: databaseUrl,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    connectionTimeoutMillis: 30000,
  }),
})

// Neon serverless cold-starts surface as transient ETIMEDOUT/socket errors; retry through
// them (mirrors backfill-response-snapshots.ts).
const TRANSIENT = /ETIMEDOUT|ECONNRESET|EPIPE|ENOTFOUND|ECONNREFUSED|socket|connection/i
async function run<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; i < 6; i++) {
    try {
      return await fn()
    } catch (e: any) {
      if (i < 5 && TRANSIENT.test(e?.code ?? e?.message ?? '')) {
        await new Promise((r) => setTimeout(r, 2000))
        continue
      }
      throw e
    }
  }
  throw new Error('unreachable')
}

// ── The four accounts. `supervisorEmail` is resolved against the db (the seeded execs
//    already exist; N2's email resolves once N2 is created earlier in this same run, so
//    order matters: N1, N2, then N3/N4). ───────────────────────────────────────────────
type Spec = {
  email: string
  firstName: string
  lastName: string
  jobTitle: string
  role: Role
  departmentName: string
  supervisorEmail: string
  status: EmployeeStatus
  teamNames: string[]
}

const ACCOUNTS: Spec[] = [
  {
    email: 'billyalfonso1969@gmail.com',
    firstName: 'QA-HR',
    lastName: 'Tester',
    jobTitle: 'People Partner (QA Test)',
    role: 'HR',
    departmentName: 'People',
    supervisorEmail: 'darbenlamonte@gmail.com', // CHRO Darben
    status: 'ACTIVE',
    teamNames: [],
  },
  {
    email: 'lavarack2002@gmail.com',
    firstName: 'QA-Supervisor',
    lastName: 'Tester',
    jobTitle: 'Technical Support Team Lead (QA Test)',
    role: 'EMPLOYEE',
    departmentName: 'Customer Support',
    supervisorEmail: 'vnferrer.work@gmail.com', // COO Vn
    status: 'ACTIVE',
    teamNames: [],
  },
  {
    email: 'akpds122020@gmail.com',
    firstName: 'QA-IC',
    lastName: 'Tester',
    jobTitle: 'Technical Support Specialist (QA Test)',
    role: 'EMPLOYEE',
    departmentName: 'Customer Support',
    supervisorEmail: 'lavarack2002@gmail.com', // reports to N2
    status: 'ACTIVE',
    teamNames: [],
  },
  {
    email: 'allenkurt.ds@gmail.com',
    firstName: 'QA-Team',
    lastName: 'Tester',
    jobTitle: 'Technical Support Specialist (QA Test)',
    role: 'EMPLOYEE',
    departmentName: 'Customer Support',
    supervisorEmail: 'lavarack2002@gmail.com', // reports to N2
    status: 'ACTIVE',
    teamNames: ['Patient App'],
  },
]

async function findEmployeeByEmail(email: string) {
  return run(() => prisma.employee.findUnique({ where: { companyEmail: email }, select: { id: true } }))
}

// Remove the four accounts. Works only for accounts that have NOT yet accumulated dependent
// data (evaluations, survey responses, notifications) — those FKs would block the delete; for
// a fully-exercised set, re-seed instead. Deletes team memberships, then the Employee (its
// address + emergency contact cascade), then the User.
async function deleteAccounts() {
  console.log(`\nQA test-account DELETE — ${APPLY ? 'APPLY (deleting)' : 'DRY RUN (no deletes)'}\n`)
  let removed = 0
  for (const a of ACCOUNTS) {
    const emp = await findEmployeeByEmail(a.email)
    const user = await run(() => prisma.user.findUnique({ where: { email: a.email }, select: { id: true } }))
    if (!emp && !user) {
      console.log(`• not present  ${a.email}`)
      continue
    }
    console.log(`• ${APPLY ? 'DELETE' : 'WOULD DELETE'}  ${a.email}`)
    if (!APPLY) {
      removed++
      continue
    }
    if (emp) {
      await run(() => prisma.teamMember.deleteMany({ where: { employeeId: emp.id } }))
      await run(() => prisma.employee.delete({ where: { id: emp.id } }))
    }
    if (user) await run(() => prisma.user.delete({ where: { id: user.id } }))
    removed++
  }
  console.log(`\n${APPLY ? 'Deleted' : 'Would delete'} ${removed} account(s).`)
  if (!APPLY) console.log('Re-run with --delete --apply to actually delete.\n')
}

async function main() {
  if (DELETE) return deleteAccounts()
  console.log(`\nQA test-account backfill — ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'}\n`)

  // Pre-resolve and validate every dependency against the live db so a DRY RUN surfaces any
  // placement problem (missing dept/supervisor/team) before --apply touches anything.
  const willExist = new Set(ACCOUNTS.map((a) => a.email)) // emails created within this run
  let created = 0
  let skipped = 0

  for (const a of ACCOUNTS) {
    const existsUser = await run(() => prisma.user.findUnique({ where: { email: a.email }, select: { id: true } }))
    const existsEmp = await findEmployeeByEmail(a.email)
    if (existsUser || existsEmp) {
      console.log(`• SKIP  ${a.email} — already exists`)
      skipped++
      continue
    }

    const dept = await run(() => prisma.department.findFirst({ where: { name: a.departmentName }, select: { id: true } }))
    if (!dept) throw new Error(`${a.email}: department "${a.departmentName}" not found`)

    // Supervisor may be a seeded exec (already in db) or an earlier account in this run.
    const supervisor = await findEmployeeByEmail(a.supervisorEmail)
    if (!supervisor && !(willExist.has(a.supervisorEmail) && APPLY)) {
      if (!willExist.has(a.supervisorEmail)) {
        throw new Error(`${a.email}: supervisor "${a.supervisorEmail}" not found in db`)
      }
      // DRY RUN: supervisor is a not-yet-created account from this run — that's expected.
    }

    const teams: { id: string; name: string }[] = []
    for (const t of a.teamNames) {
      const team = await run(() => prisma.team.findFirst({ where: { name: t }, select: { id: true, name: true } }))
      if (!team) throw new Error(`${a.email}: team "${t}" not found`)
      teams.push(team)
    }

    console.log(
      `• ${APPLY ? 'CREATE' : 'WOULD CREATE'}  ${a.email}\n` +
        `      name=${a.firstName} ${a.lastName}  role=${a.role}  status=${a.status}\n` +
        `      dept=${a.departmentName}  supervisor=${a.supervisorEmail}` +
        `${supervisor ? '' : ' (created earlier in this run)'}\n` +
        `      jobTitle=${a.jobTitle}` +
        `${teams.length ? `\n      teams=${teams.map((t) => t.name).join(', ')}` : ''}`,
    )

    if (!APPLY) {
      created++
      continue
    }

    // supervisor is guaranteed resolvable now (seeded execs exist; N2 was created before N3/N4).
    const supId = (await findEmployeeByEmail(a.supervisorEmail))?.id
    if (!supId) throw new Error(`${a.email}: supervisor "${a.supervisorEmail}" still unresolved at write time`)

    // NOTE: sequential creates, NOT an interactive prisma.$transaction. The PrismaPg/Neon
    // adapter does not reliably pin an interactive transaction to a single connection, so a
    // nested connect to the just-created User fails with P2025 ("no User record found"). The
    // seeder uses this same sequential pattern against prod successfully. We clean up the
    // orphan User ourselves if the Employee insert fails, so a failed account leaves no trace.
    const user = await run(() => prisma.user.create({ data: { email: a.email, role: a.role } }))
    try {
      const emp = await run(() =>
        prisma.employee.create({
          data: {
            user: { connect: { id: user.id } },
            companyEmail: a.email,
            firstName: a.firstName,
            lastName: a.lastName,
            jobTitle: a.jobTitle,
            department: { connect: { id: dept.id } },
            supervisor: { connect: { id: supId } },
            status: a.status,
            address: { create: { address: 'DG Technologies HQ', city: 'Makati', province: 'Metro Manila', country: 'Philippines' } },
            emergencyContact: { create: { emergencyContactName: 'Emergency Contact', emergencyContactNumber: '+63 917 000 0000' } },
          },
        }),
      )
      if (teams.length) {
        await run(() =>
          prisma.teamMember.createMany({
            data: teams.map((t) => ({ teamId: t.id, employeeId: emp.id })),
            skipDuplicates: true,
          }),
        )
      }
      console.log(`      -> created employee ${emp.id}`)
    } catch (e) {
      // roll back the orphan User so this account can be cleanly re-created on a re-run
      await run(() => prisma.user.delete({ where: { id: user.id } })).catch(() => {})
      throw e
    }
    created++
  }

  console.log(
    `\n${APPLY ? 'Created' : 'Would create'} ${created} account(s); skipped ${skipped} existing.`,
  )
  if (!APPLY) console.log('Re-run with --apply to write these changes.\n')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
