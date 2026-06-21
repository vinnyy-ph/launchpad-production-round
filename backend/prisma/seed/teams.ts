// backend/prisma/seed/teams.ts
import { PrismaClient, Employee } from '@prisma/client'
import { SeededUsers } from './users'
import { TEAMS } from './org-structure'

export async function seedTeams(prisma: PrismaClient, users: SeededUsers): Promise<void> {
  // per-department cursor; wraps so memberships exceeding a dept's size overlap across teams
  const cursor: Record<string, number> = {}
  const takeFrom = (dept: string, n: number): Employee[] => {
    const list = users.byDept[dept] ?? []
    if (list.length === 0) return []
    const out: Employee[] = []
    let c = cursor[dept] ?? 0
    for (let i = 0; i < n; i++) { out.push(list[c % list.length]); c++ }
    cursor[dept] = c
    return out
  }

  for (const spec of TEAMS) {
    let leader: Employee | null = null
    const members: Employee[] = []
    for (const m of spec.mix) {
      const picked = takeFrom(m.dept, m.count)
      if (leader === null && m.dept === spec.leaderDept && picked.length > 0) leader = picked[0]
      members.push(...picked)
    }
    if (!leader) throw new Error(`team ${spec.name}: could not resolve a leader from ${spec.leaderDept}`)

    const team = await prisma.team.create({ data: { name: spec.name, leaderId: leader.id } })

    const seen = new Set<string>()
    for (const emp of members) {
      if (seen.has(emp.id)) continue
      seen.add(emp.id)
      await prisma.teamMember.create({ data: { teamId: team.id, employeeId: emp.id } })
    }
  }
}
