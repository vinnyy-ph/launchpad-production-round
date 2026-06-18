import 'dotenv/config'
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

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run the seed script')
}

function createSeedAdapter(connectionString: string) {
  // Always use PrismaPg to support transactions during seeding, even for Neon hosts.
  return new PrismaPg(connectionString)
}

const adapter = createSeedAdapter(databaseUrl)
const prisma = new PrismaClient({ adapter })

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
