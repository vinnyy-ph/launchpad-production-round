// backend/prisma/seed/users.ts
import { PrismaClient, Employee, EmployeeStatus, Role } from '@prisma/client'
import { ORG, allDepts, deptNameForGroup, topDepartments, validateOrg } from './org-structure'
import { createPeopleGenerator } from './names'

export type SeededUsers = {
  ceo: Employee; cto: Employee; cio: Employee; cpo: Employee
  coo: Employee; chro: Employee; cfo: Employee; cgo: Employee
  board: Employee[]
  all: Employee[]
  generated: Employee[]
  byDept: Record<string, Employee[]>
  deptLead: Record<string, Employee>
  onboardingSample: Employee
  offboardingSample: Employee
}

const nextPerson = createPeopleGenerator(20260621) // fixed seed → deterministic
const TEAM_SPAN = 5 // max direct reports per supervisor when subdividing a sub-department

async function createEmployee(
  prisma: PrismaClient,
  opts: {
    email: string; firstName: string; lastName: string; jobTitle: string
    role?: Role; departmentId: string; supervisorId?: string; status?: EmployeeStatus
  },
): Promise<Employee> {
  const user = await prisma.user.create({ data: { email: opts.email, role: opts.role ?? 'EMPLOYEE' } })
  return prisma.employee.create({
    data: {
      user: { connect: { id: user.id } },
      companyEmail: opts.email,
      firstName: opts.firstName,
      lastName: opts.lastName,
      jobTitle: opts.jobTitle,
      department: { connect: { id: opts.departmentId } },
      ...(opts.supervisorId ? { supervisor: { connect: { id: opts.supervisorId } } } : {}),
      status: opts.status ?? 'ACTIVE',
      address: { create: { address: 'DG Technologies HQ', city: 'Makati', province: 'Metro Manila', country: 'Philippines' } },
      emergencyContact: { create: { emergencyContactName: 'Emergency Contact', emergencyContactNumber: '+63 917 000 0000' } },
    },
  })
}

export async function seedUsers(prisma: PrismaClient): Promise<SeededUsers> {
  validateOrg()
  // tiny deterministic LCG for seniority tier selection
  let s = 99
  const tierRng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
  const tiers = ['Senior ', '', 'Mid ', 'Junior ']
  const icTitle = (dept: string) => `${tiers[Math.floor(tierRng() * tiers.length)]}${dept} Specialist`.replace(/\s+/g, ' ').trim()
  const leadTitle = (dept: string) => (dept === 'IT' ? 'IT Manager' : `${dept} Lead`)

  // 1–2. Departments — create the 10 top-level departments, then map each sub-department to
  // its group's department id so every employee in a group lands in that one DB department.
  const deptRowId: Record<string, string> = {}
  for (const d of topDepartments()) {
    const row = await prisma.department.create({ data: { name: d.name } })
    deptRowId[d.name] = row.id
  }
  const deptId: Record<string, string> = {}
  for (const g of ORG) for (const d of g.depts) deptId[d.name] = deptRowId[deptNameForGroup(g)]
  const execId = deptRowId['Executive Leadership']

  const all: Employee[] = []
  const generated: Employee[] = []
  const byDept: Record<string, Employee[]> = {}
  const deptLead: Record<string, Employee> = {}
  for (const d of allDepts()) byDept[d.name] = []
  const track = (e: Employee, dept: string, isGenerated: boolean) => {
    all.push(e); byDept[dept].push(e); if (isGenerated) generated.push(e)
  }

  // 3. CEO (root)
  const ceo = await createEmployee(prisma, { email: 'allenkurtds.dev@gmail.com', firstName: 'Rafael', lastName: 'Bautista', jobTitle: 'CEO', role: 'EMPLOYEE', departmentId: execId })
  track(ceo, 'Executive Leadership', false)

  // 4. Other board members
  const boardSpec: Array<{ title: string; email: string; firstName: string; lastName: string; role: Role }> = [
    { title: 'CTO', email: 'loretorussellkelvinanthony@gmail.com', firstName: 'Loreto', lastName: 'Russell', role: 'ADMIN' },
    { title: 'CIO', email: 'ashasce@gmail.com', firstName: 'Asha', lastName: 'Ce', role: 'ADMIN' },
    { title: 'CPO', email: 'theaverah@gmail.com', firstName: 'Thea', lastName: 'Verah', role: 'EMPLOYEE' },
    { title: 'COO', email: 'vnferrer.work@gmail.com', firstName: 'Vn', lastName: 'Ferrer', role: 'EMPLOYEE' },
    { title: 'CHRO', email: 'darbenlamonte@gmail.com', firstName: 'Darben', lastName: 'Lamonte', role: 'HR' },
    { title: 'CFO', email: 'thea_sumagang@dlsu.edu.ph', firstName: 'Thea', lastName: 'Sumagang', role: 'HR' },
    { title: 'CGO', email: 'ximen91101@gmail.com', firstName: 'Angelo', lastName: 'Galang', role: 'EMPLOYEE' },
  ]
  const byTitle: Record<string, Employee> = {}
  for (const b of boardSpec) {
    const e = await createEmployee(prisma, { email: b.email, firstName: b.firstName, lastName: b.lastName, jobTitle: b.title, role: b.role, departmentId: execId, supervisorId: ceo.id })
    byTitle[b.title] = e
    track(e, 'Executive Leadership', false)
  }

  // 5. Two generated support roles
  for (const title of ['Chief of Staff', 'Executive Assistant']) {
    const p = nextPerson()
    const e = await createEmployee(prisma, { email: p.email, firstName: p.firstName, lastName: p.lastName, jobTitle: title, departmentId: execId, supervisorId: ceo.id })
    track(e, 'Executive Leadership', true)
  }

  // Fill a sub-department: arrange `count` members into a balanced tree under `lead` so no
  // supervisor has more than TEAM_SPAN direct reports (instead of the lead managing everyone
  // flat). A member that ends up with reports is titled "<dept> Team Lead"; leaves keep an IC
  // title. BFS assignment guarantees each member's supervisor is created before it.
  const fillSubDept = async (deptName: string, lead: Employee, count: number) => {
    if (count <= 0) return
    const parent = new Array<number>(count + 1) // member m (1..count) → parent node (0 = the lead)
    const childCount = new Array<number>(count + 1).fill(0)
    const queue: number[] = [0]
    let next = 1
    while (next <= count) {
      const p = queue.shift() as number
      for (let c = 0; c < TEAM_SPAN && next <= count; c++) {
        parent[next] = p
        childCount[p]++
        queue.push(next)
        next++
      }
    }
    const idByNode: Record<number, string> = { 0: lead.id }
    for (let m = 1; m <= count; m++) {
      const person = nextPerson()
      const jobTitle = childCount[m] > 0 ? `${deptName} Team Lead` : icTitle(deptName)
      const e = await createEmployee(prisma, {
        email: person.email, firstName: person.firstName, lastName: person.lastName,
        jobTitle, departmentId: deptId[deptName], supervisorId: idByNode[parent[m]],
      })
      idByNode[m] = e.id
      track(e, deptName, true)
    }
  }

  // 6–7. Non-Executive groups — every sub-department lead reports directly to the owning board
  // exec (the leads are peers, not nested under a primary lead), and each sub-department is
  // subdivided into small teams beneath its lead.
  for (const group of ORG) {
    if (group.group === 'Executive') continue
    const owner = byTitle[group.owner as string]
    for (const d of group.depts) {
      const p = nextPerson()
      const lead = await createEmployee(prisma, {
        email: p.email, firstName: p.firstName, lastName: p.lastName, jobTitle: leadTitle(d.name),
        departmentId: deptId[d.name], supervisorId: owner.id,
      })
      track(lead, d.name, true)
      deptLead[d.name] = lead
      await fillSubDept(d.name, lead, d.headcount - 1)
    }
  }

  // 8. Status samples (generated)
  const onboardingSample = byDept['Recruitment'][1]
  const offboardingSample = byDept['Customer Success'][1]
  const inactive = byDept['Backend'][1]
  await prisma.employee.update({ where: { id: onboardingSample.id }, data: { status: 'ONBOARDING' } })
  await prisma.employee.update({ where: { id: offboardingSample.id }, data: { status: 'OFFBOARDING' } })
  await prisma.employee.update({ where: { id: inactive.id }, data: { status: 'INACTIVE' } })
  onboardingSample.status = 'ONBOARDING'; offboardingSample.status = 'OFFBOARDING'; inactive.status = 'INACTIVE'

  return {
    ceo, cto: byTitle['CTO'], cio: byTitle['CIO'], cpo: byTitle['CPO'], coo: byTitle['COO'],
    chro: byTitle['CHRO'], cfo: byTitle['CFO'], cgo: byTitle['CGO'],
    board: [ceo, byTitle['CTO'], byTitle['CIO'], byTitle['CPO'], byTitle['COO'], byTitle['CHRO'], byTitle['CFO'], byTitle['CGO']],
    all, generated, byDept, deptLead, onboardingSample, offboardingSample,
  }
}
