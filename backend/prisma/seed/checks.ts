// backend/prisma/seed/checks.ts
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { allDepts, TEAMS, teamSize } from './org-structure'

const url = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL required')
const prisma = new PrismaClient({ adapter: new PrismaPg(url) })

async function main() {
  const errors: string[] = []
  const eq = (label: string, got: number, want: number) => {
    if (got !== want) errors.push(`${label}: got ${got}, expected ${want}`)
  }

  eq('users', await prisma.user.count(), 300)
  eq('employees', await prisma.employee.count(), 300)
  eq('departments', await prisma.department.count(), 22)
  eq('teams', await prisma.team.count(), 9)
  eq('root employees (supervisorId null)', await prisma.employee.count({ where: { supervisorId: null } }), 1)

  for (const d of allDepts()) {
    const row = await prisma.department.findUnique({ where: { name: d.name } })
    if (!row) { errors.push(`missing department ${d.name}`); continue }
    eq(`dept ${d.name} headcount`, await prisma.employee.count({ where: { departmentId: row.id } }), d.headcount)
  }

  for (const t of TEAMS) {
    const team = await prisma.team.findFirst({ where: { name: t.name }, include: { members: true } })
    if (!team) { errors.push(`missing team ${t.name}`); continue }
    eq(`team ${t.name} members`, team.members.length, teamSize(t))
    const leaderIsMember = team.members.some((m) => m.employeeId === team.leaderId)
    if (!leaderIsMember) errors.push(`team ${t.name}: leader is not a member row`)
  }

  const exec = await prisma.department.findUnique({ where: { name: 'Executive Leadership' } })
  const realEmails = [
    'allenkurtds.dev@gmail.com', 'loretorussellkelvinanthony@gmail.com', 'ashasce@gmail.com',
    'theaverah@gmail.com', 'vnferrer.work@gmail.com', 'darbenlamonte@gmail.com',
    'thea_sumagang@dlsu.edu.ph', 'ximen91101@gmail.com',
  ]
  for (const email of realEmails) {
    const u = await prisma.user.findUnique({ where: { email }, include: { employee: true } })
    if (!u || !u.employee) { errors.push(`missing real account ${email}`); continue }
    if (u.employee.departmentId !== exec?.id) errors.push(`${email} not in Executive Leadership`)
  }

  const sentCount = await prisma.performanceEvaluation.count({ where: { isSent: true } })
  const ackCount = await prisma.evaluationAcknowledgement.count()
  if (ackCount !== sentCount) errors.push(`sent evaluations without acknowledgement: ${sentCount - ackCount}`)

  if (errors.length) { console.error('SEED CHECK FAILED:\n' + errors.join('\n')); process.exit(1) }
  console.log('SEED CHECK PASSED ✔')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
