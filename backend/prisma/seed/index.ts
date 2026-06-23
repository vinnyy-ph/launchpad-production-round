import 'dotenv/config'
import * as dns from 'node:dns'
// Some networks (and this host) black-hole IPv6 to Neon, so pg/TCP connects time out.
// Force IPv4 DNS ordering in-process so it can't be lost through a spawned ts-node.
dns.setDefaultResultOrder('ipv4first')
import * as https from 'https'
// neonConfig must be set before importing the Prisma adapter
import { neonConfig } from '@neondatabase/serverless'
import nodeFetch from 'node-fetch'

// Node.js native fetch can prefer IPv6 on some networks, so Neon uses an IPv4 agent here.
const ipv4Agent = new https.Agent({ family: 4 })
neonConfig.fetchFunction = (url: string, opts?: RequestInit) =>
  nodeFetch(url, { ...opts, agent: ipv4Agent } as Parameters<typeof nodeFetch>[1])

import { PrismaClient } from '@prisma/client'
import { PrismaNeonHttp } from '@prisma/adapter-neon'
import { PrismaPg } from '@prisma/adapter-pg'
import { seedUsers } from './users'
import { seedTeams } from './teams'
import { seedOnboarding } from './onboarding'
import { seedOffboarding } from './offboarding'
import { seedSurveys } from './surveys'
import { seedEvaluations } from './evaluations'
import { seedNotifications } from './notifications'

// Prefer the direct (unpooled) connection for seeding — it carries the interactive
// transactions seedUsers and friends rely on.
const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run the seed script')
}

function createSeedAdapter(connectionString: string) {
  // PrismaPg (pg over TCP) supports the implicit transactions Prisma wraps around the seed's
  // nested writes (employee.create with nested address/emergencyContact). Neon's HTTP adapter
  // cannot ("Transactions are not supported in HTTP mode"), so it is not an option here.
  //
  // keepAlive + a generous connect timeout keep the long sequential seed alive over a remote
  // Neon connection (the seed makes thousands of round-trips; without keep-alive the socket gets
  // dropped by NAT/idle reapers part-way through). Transient drops are retried via withRetry below.
  return new PrismaPg({
    connectionString,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    connectionTimeoutMillis: 30000,
  })
}

// A single dropped socket to remote Neon (ETIMEDOUT/ECONNRESET on one op) otherwise aborts the
// whole multi-minute seed. This extension transparently retries any operation that fails with a
// transient connection error, with backoff, so the seed survives intermittent drops. Retries are
// safe: a timed-out write either committed or rolled back, and clearAll runs first.
function withRetry(client: PrismaClient): PrismaClient {
  const TRANSIENT = ['ETIMEDOUT', 'ECONNRESET', 'EPIPE', 'ENOTFOUND', 'ECONNREFUSED']
  const isTransient = (e: unknown): boolean => {
    const err = e as { code?: string; cause?: { code?: string }; message?: string }
    const code = err?.code ?? err?.cause?.code
    return (code != null && TRANSIENT.includes(code)) || /ETIMEDOUT|ECONNRESET|socket|connection.*(closed|terminated|reset)/i.test(err?.message ?? '')
  }
  const extended = client.$extends({
    query: {
      async $allOperations({ args, query }) {
        const MAX_ATTEMPTS = 6
        let lastErr: unknown
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          try {
            return await query(args)
          } catch (e) {
            if (!isTransient(e) || attempt === MAX_ATTEMPTS) throw e
            lastErr = e
            await new Promise((r) => setTimeout(r, 500 * attempt))
          }
        }
        throw lastErr
      },
    },
  })
  return extended as unknown as PrismaClient
}

const adapter = createSeedAdapter(databaseUrl)
const prisma = withRetry(new PrismaClient({ adapter }))

async function clearAll() {
  await prisma.notification.deleteMany()
  await prisma.activityLog.deleteMany()
  await prisma.surveyAnswer.deleteMany()
  await prisma.surveyResponse.deleteMany()
  await prisma.surveyCompletion.deleteMany()
  await prisma.surveyAudienceMember.deleteMany()
  await prisma.evaluationAcknowledgement.deleteMany()
  await prisma.performanceEvaluation.deleteMany()
  await prisma.surveyVisibilityConfig.deleteMany()
  await prisma.surveyReminderConfig.deleteMany()
  await prisma.surveyAudienceConfig.deleteMany()
  await prisma.surveyQuestion.deleteMany()
  await prisma.surveyOccurrence.deleteMany()
  await prisma.pulseSurvey.deleteMany()
  await prisma.clearanceSignatureRequest.deleteMany()
  await prisma.offboardingRecord.deleteMany()
  await prisma.clearanceSignatory.deleteMany()
  await prisma.clearanceTemplate.deleteMany()
  await prisma.onboardingCustomFieldValue.deleteMany()
  await prisma.onboardingDocumentSubmission.deleteMany()
  await prisma.onboardingInvitation.deleteMany()
  await prisma.onboardingRecord.deleteMany()
  await prisma.onboardingCustomField.deleteMany()
  await prisma.onboardingDocument.deleteMany()
  await prisma.onboardingTemplate.deleteMany()
  await prisma.bulkOnboardingJob.deleteMany()
  await prisma.teamMember.deleteMany()
  await prisma.team.deleteMany()
  await prisma.employeeEmergencyContact.deleteMany()
  await prisma.employeeAddress.deleteMany()
  // updateMany uses implicit transactions that are not supported in HTTP mode, so use raw SQL.
  await prisma.$executeRawUnsafe('UPDATE employees SET "supervisorId" = NULL')
  await prisma.employee.deleteMany()
  await prisma.department.deleteMany()
  await prisma.user.deleteMany()
}

async function main() {
  console.log('Clearing existing data...')
  await clearAll()

  console.log('Seeding departments, users and employees...')
  const users = await seedUsers(prisma)

  console.log('Seeding teams...')
  await seedTeams(prisma, users)

  console.log('Seeding onboarding...')
  await seedOnboarding(prisma, users)

  console.log('Seeding offboarding...')
  await seedOffboarding(prisma, users)

  console.log('Seeding pulse surveys...')
  const surveys = await seedSurveys(prisma, users)

  console.log('Seeding performance evaluations...')
  const evaluations = await seedEvaluations(prisma, users)

  console.log('Seeding notifications...')
  await seedNotifications(prisma, users, surveys, evaluations)

  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
