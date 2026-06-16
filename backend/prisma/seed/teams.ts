import { PrismaClient } from '@prisma/client'
import { SeededUsers } from './users'

export async function seedTeams(prisma: PrismaClient, users: SeededUsers): Promise<void> {
  const alpha = await prisma.team.create({
    data: { name: 'Team Alpha', leaderId: users.vn.id },
  })
  const beta = await prisma.team.create({
    data: { name: 'Team Beta', leaderId: users.thea.id },
  })

  for (const emp of users.placeholders.slice(0, 5)) {
    await prisma.teamMember.create({ data: { teamId: alpha.id, employeeId: emp.id } })
  }

  for (const emp of users.placeholders.slice(5, 10)) {
    await prisma.teamMember.create({ data: { teamId: beta.id, employeeId: emp.id } })
  }
}
