/**
 * One-off backfill: populate the `respondentSupervisorId` / `respondentTeamIds` grouping
 * snapshot on SurveyResponse rows that are missing it.
 *
 * The live submission path always sets these (responses.service.ts), but the seeder's
 * NON-anonymous surveys created responses with only `employeeId`, leaving the snapshot
 * null/empty. Result: supervisor-based and team-based result views filter on
 * `respondentSupervisorId` / `respondentTeamIds` and match nothing, so a manager like
 * Angelo sees "0 of N" even though his reports answered.
 *
 * SAFE for production:
 *   - Only touches responses with a non-null employeeId (the broken non-anon seed rows;
 *     anonymous responses keep employeeId=null and already carry a snapshot).
 *   - Fills ONLY missing fields: sets respondentSupervisorId only when currently null AND
 *     the employee has a supervisor; sets respondentTeamIds only when currently empty AND
 *     the employee has teams. Never overwrites an existing snapshot value.
 *   - Idempotent: re-running is a no-op once filled.
 *   - DRY-RUN by default. Pass --apply to write.
 *
 * Usage (from backend/):
 *   DATABASE_URL="<prod>" DIRECT_URL="<prod>" \
 *     npx ts-node --project tsconfig.seed.json --transpile-only prisma/seed/backfill-response-snapshots.ts [--apply]
 */
import 'dotenv/config'
import * as dns from 'node:dns'
dns.setDefaultResultOrder('ipv4first')

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const APPLY = process.argv.includes('--apply')

const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL/DIRECT_URL is required')

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl, keepAlive: true, connectionTimeoutMillis: 30000 }),
})

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

async function main() {
  console.log(`\nResponse snapshot backfill — ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'}\n`)

  // Candidates: identified (non-anon) responses missing either snapshot field.
  const candidates = await run(() =>
    prisma.surveyResponse.findMany({
      where: {
        employeeId: { not: null },
        OR: [{ respondentSupervisorId: null }, { respondentTeamIds: { isEmpty: true } }],
      },
      select: { id: true, employeeId: true, respondentSupervisorId: true, respondentTeamIds: true },
    }),
  )
  console.log(`Found ${candidates.length} identified response(s) with a missing snapshot.\n`)

  // Resolve each distinct employee's current supervisor + teams once.
  const empIds = [...new Set(candidates.map((c) => c.employeeId!))]
  const employees = await run(() =>
    prisma.employee.findMany({
      where: { id: { in: empIds } },
      select: { id: true, supervisorId: true, teamMemberships: { select: { teamId: true } } },
    }),
  )
  const byEmp = new Map(
    employees.map((e) => [e.id, { supervisorId: e.supervisorId, teamIds: e.teamMemberships.map((t) => t.teamId) }]),
  )

  let supFills = 0
  let teamFills = 0
  let updated = 0

  for (const r of candidates) {
    const emp = byEmp.get(r.employeeId!)
    if (!emp) continue

    const data: { respondentSupervisorId?: string; respondentTeamIds?: string[] } = {}
    if (r.respondentSupervisorId === null && emp.supervisorId !== null) {
      data.respondentSupervisorId = emp.supervisorId
      supFills++
    }
    if (r.respondentTeamIds.length === 0 && emp.teamIds.length > 0) {
      data.respondentTeamIds = emp.teamIds
      teamFills++
    }
    if (Object.keys(data).length === 0) continue // nothing to fill (e.g. root w/ no team)

    updated++
    if (APPLY) {
      await run(() => prisma.surveyResponse.update({ where: { id: r.id }, data }))
    }
  }

  console.log(
    `${APPLY ? 'Updated' : 'Would update'} ${updated} response(s): ` +
      `${supFills} supervisorId fill(s), ${teamFills} teamIds fill(s).`,
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
