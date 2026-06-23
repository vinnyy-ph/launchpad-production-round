/**
 * One-off backfill: populate `survey_audience_members` for occurrences whose audience
 * snapshot is EMPTY. Older occurrences were created (seeded/activated) without their
 * audience snapshot, so the results page divides responses by 0 ("210 of 0", 0% rate).
 *
 * This script resolves each survey's intended audience using the SAME rules as the live
 * app (mirrors src/.../rules/audience.ts + surveys.audience.ts) and inserts the missing
 * rows. It is SAFE to run against production:
 *   - INSERT-ONLY: never deletes or updates existing rows.
 *   - Idempotent: createMany({ skipDuplicates: true }); re-running is a no-op.
 *   - Surgical: only occurrences with ZERO current audience members are touched; an
 *     occurrence that already has a snapshot is left exactly as-is.
 *   - DRY-RUN by default. Pass --apply to actually write.
 *
 * Caveat: a closed past occurrence's audience-at-the-time is not recoverable, so the
 * snapshot is resolved against the CURRENT set of ACTIVE employees (same approximation
 * the seeders use). This restores a correct, sensible denominator.
 *
 * Usage (from backend/):
 *   DATABASE_URL="<prod>" DIRECT_URL="<prod>" \
 *     npx ts-node --project tsconfig.seed.json --transpile-only prisma/seed/backfill-survey-audience.ts [--apply]
 */
import 'dotenv/config'
import * as dns from 'node:dns'
// This host black-holes IPv6 to Neon; force IPv4 DNS ordering before any DB connect.
dns.setDefaultResultOrder('ipv4first')

import { PrismaClient, AudienceType } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const APPLY = process.argv.includes('--apply')

const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL/DIRECT_URL is required')

const adapter = new PrismaPg({
  connectionString: databaseUrl,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  connectionTimeoutMillis: 30000,
})
const prisma = new PrismaClient({ adapter })

// ── Audience resolution (mirrors rules/audience.ts + surveys.audience.ts) ────────────
async function activeEmployeeIds(): Promise<string[]> {
  const e = await prisma.employee.findMany({ where: { status: 'ACTIVE' }, select: { id: true } })
  return e.map((x) => x.id)
}
async function activeAmong(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return []
  const e = await prisma.employee.findMany({ where: { id: { in: ids }, status: 'ACTIVE' }, select: { id: true } })
  return e.map((x) => x.id)
}
async function childrenOf(parentIds: string[]): Promise<string[]> {
  if (parentIds.length === 0) return []
  const e = await prisma.employee.findMany({ where: { supervisorId: { in: parentIds } }, select: { id: true } })
  return e.map((x) => x.id)
}
async function activeTeamMemberIds(teamIds: string[]): Promise<string[]> {
  if (teamIds.length === 0) return []
  const m = await prisma.teamMember.findMany({
    where: { teamId: { in: teamIds }, employee: { status: 'ACTIVE' } },
    select: { employeeId: true },
  })
  return m.map((x) => x.employeeId)
}

// BFS down the org tree (mirrors shared/org/traversal.walkDownward); root never included.
async function walkDownward(rootId: string): Promise<string[]> {
  const seen = new Set<string>()
  const out: string[] = []
  let frontier = [rootId]
  while (frontier.length > 0) {
    const children = await childrenOf(frontier)
    const next: string[] = []
    for (const id of children) {
      if (id === rootId || seen.has(id)) continue
      seen.add(id)
      out.push(id)
      next.push(id)
    }
    frontier = next
  }
  return out
}

async function resolveAudience(
  audienceType: AudienceType,
  configs: { supervisorId: string | null; teamId: string | null }[],
): Promise<string[]> {
  if (audienceType === 'SUPERVISOR_BASED') {
    const supervisorIds = configs.map((c) => c.supervisorId).filter((id): id is string => !!id)
    const ids = new Set<string>()
    for (const sup of supervisorIds) for (const r of await walkDownward(sup)) ids.add(r)
    for (const sup of supervisorIds) ids.delete(sup) // anchors are not recipients
    return activeAmong([...ids])
  }
  if (audienceType === 'SPECIFIC_TEAMS') {
    const teamIds = configs.map((c) => c.teamId).filter((id): id is string => !!id)
    return activeTeamMemberIds(teamIds)
  }
  return activeEmployeeIds() // EVERYONE
}

// ── Backfill ─────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\nSurvey audience backfill — ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'}\n`)

  const surveys = await prisma.pulseSurvey.findMany({
    where: { deletedAt: null },
    include: {
      audienceConfigs: true,
      occurrences: { orderBy: { occurrenceNumber: 'asc' } },
    },
    orderBy: { releaseDate: 'asc' },
  })

  let totalToInsert = 0
  let occurrencesTouched = 0

  for (const survey of surveys) {
    for (const occ of survey.occurrences) {
      const existing = await prisma.surveyAudienceMember.count({ where: { occurrenceId: occ.id } })
      if (existing > 0) continue // already has a snapshot — leave it untouched

      const audienceIds = await resolveAudience(survey.audienceType, survey.audienceConfigs)
      const responses = await prisma.surveyResponse.count({ where: { occurrenceId: occ.id } })

      console.log(
        `• ${survey.name} [occ#${occ.occurrenceNumber}${occ.isClosed ? ' closed' : ' open'}] ` +
          `(${survey.audienceType}): responses=${responses}, current members=0 → resolved audience=${audienceIds.length}`,
      )

      if (audienceIds.length === 0) continue
      occurrencesTouched++
      totalToInsert += audienceIds.length

      if (APPLY) {
        await prisma.surveyAudienceMember.createMany({
          data: audienceIds.map((employeeId) => ({ occurrenceId: occ.id, employeeId })),
          skipDuplicates: true,
        })
      }
    }
  }

  console.log(
    `\n${APPLY ? 'Inserted' : 'Would insert'} ${totalToInsert} audience member rows ` +
      `across ${occurrencesTouched} occurrence(s).`,
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
