import { ORG, TEAMS, allDepts, totalHeadcount, teamSize, validateOrg } from '../../../prisma/seed/org-structure'

describe('org structure', () => {
  it('totals 300 employees', () => {
    expect(totalHeadcount()).toBe(300)
  })
  it('has 22 leaf departments', () => {
    expect(allDepts().length).toBe(22)
  })
  it('department names are unique', () => {
    const names = allDepts().map((d) => d.name)
    expect(new Set(names).size).toBe(names.length)
  })
  it('Executive group owns nothing and holds Executive Leadership (10)', () => {
    const exec = ORG.find((g) => g.group === 'Executive')
    expect(exec?.owner).toBeNull()
    expect(exec?.depts).toEqual([{ name: 'Executive Leadership', headcount: 10 }])
  })
  it('validateOrg does not throw', () => {
    expect(() => validateOrg()).not.toThrow()
  })
  it('has 9 teams with the expected sizes', () => {
    expect(TEAMS.length).toBe(9)
    const sizes = Object.fromEntries(TEAMS.map((t) => [t.name, teamSize(t)]))
    expect(sizes).toEqual({
      'UX Web': 6, 'UX Mobile': 5, 'Design System': 6, 'QA Automation': 8,
      'Web Performance': 5, 'Patient App': 12, 'Provider Portal': 12,
      'Security & Compliance': 6, 'Research Pod': 2,
    })
  })
  it('Research Pod has exactly 2 members (under-3 privacy demo)', () => {
    const rp = TEAMS.find((t) => t.name === 'Research Pod')!
    expect(teamSize(rp)).toBe(2)
  })
  it('every team mix references real department names', () => {
    const deptNames = new Set(allDepts().map((d) => d.name))
    for (const t of TEAMS) {
      expect(deptNames.has(t.leaderDept)).toBe(true)
      for (const m of t.mix) expect(deptNames.has(m.dept)).toBe(true)
    }
  })
})
