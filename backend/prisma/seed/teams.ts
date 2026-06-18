import { PrismaClient } from '@prisma/client'
import { SeededUsers } from './users'

export async function seedTeams(prisma: PrismaClient, users: SeededUsers): Promise<void> {
  const alpha = await prisma.team.create({
    data: { name: 'Team Alpha', leaderId: users.vn.id },
  })
  const beta = await prisma.team.create({
    data: { name: 'Team Beta', leaderId: users.theaV.id },
  })

  // Team Alpha members: Asha, Alex, Sam, Jordan, Casey, Ria
  const alphaMembers = [
    users.asha,
    users.staff[0], // Alex
    users.staff[1], // Sam
    users.staff[2], // Jordan
    users.staff[3], // Casey
    users.staff[11], // Ria
  ]

  // Team Beta members: Ximen, Riley, Taylor, Drew, Cameron
  const betaMembers = [
    users.ximen,
    users.staff[4], // Riley
    users.staff[5], // Taylor
    users.staff[6], // Drew
    users.staff[7], // Cameron
  ]

  for (const emp of alphaMembers) {
    await prisma.teamMember.create({ data: { teamId: alpha.id, employeeId: emp.id } })
  }

  for (const emp of betaMembers) {
    await prisma.teamMember.create({ data: { teamId: beta.id, employeeId: emp.id } })
  }
}
