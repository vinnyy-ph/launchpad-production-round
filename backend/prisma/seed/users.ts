import { PrismaClient, Employee, EmployeeStatus } from '@prisma/client'

export type SeededUsers = {
  kurt: Employee
  loreto: Employee
  vn: Employee
  theaV: Employee
  darben: Employee
  theaS: Employee
  asha: Employee
  ximen: Employee
  /** Index-addressable list: 0-11 (Alex … Ria) */
  staff: Employee[]
}

type SeedEmployeeInput = {
  userId: string
  companyEmail: string
  firstName: string
  lastName: string
  jobTitle: string
  departmentId: string
  supervisorId?: string
  status: EmployeeStatus
  address: string
  city: string
  province: string
  country: string
  emergencyContactName: string
  emergencyContactNumber: string
}

async function createSeedEmployee(
  prisma: PrismaClient,
  input: SeedEmployeeInput,
): Promise<Employee> {
  return prisma.employee.create({
    data: {
      user: { connect: { id: input.userId } },
      companyEmail: input.companyEmail,
      firstName: input.firstName,
      lastName: input.lastName,
      jobTitle: input.jobTitle,
      department: { connect: { id: input.departmentId } },
      ...(input.supervisorId ? { supervisor: { connect: { id: input.supervisorId } } } : {}),
      status: input.status,
      address: {
        create: {
          address: input.address,
          city: input.city,
          province: input.province,
          country: input.country,
        },
      },
      emergencyContact: {
        create: {
          emergencyContactName: input.emergencyContactName,
          emergencyContactNumber: input.emergencyContactNumber,
        },
      },
    },
  })
}

export async function seedUsers(prisma: PrismaClient): Promise<SeededUsers> {
  const dept: Record<string, string> = {}
  for (const name of ['Executive', 'Operations', 'Product', 'Human Resources']) {
    const d = await prisma.department.create({ data: { name } })
    dept[name] = d.id
  }

  // ── 1. Kurt — CEO, org root, EMPLOYEE role (not admin) ──
  const kurtUser = await prisma.user.create({
    data: { email: 'allenkurtds.dev@gmail.com', role: 'EMPLOYEE' },
  })
  const kurt = await createSeedEmployee(prisma, {
    userId: kurtUser.id,
    companyEmail: 'allenkurtds.dev@gmail.com',
    firstName: 'Kurt',
    lastName: 'Ds',
    jobTitle: 'CEO',
    departmentId: dept['Executive'],
    status: EmployeeStatus.ACTIVE,
    address: '100 Executive Avenue',
    city: 'Makati',
    province: 'Metro Manila',
    country: 'Philippines',
    emergencyContactName: 'Kara Ds',
    emergencyContactNumber: '+63 917 555 0101',
  })

  // ── 2. Loreto Russell — CTO, ADMIN role ──
  const loretoUser = await prisma.user.create({
    data: { email: 'loretorussellkelvinanthony@gmail.com', role: 'ADMIN' },
  })
  const loreto = await createSeedEmployee(prisma, {
    userId: loretoUser.id,
    companyEmail: 'loretorussellkelvinanthony@gmail.com',
    firstName: 'Loreto',
    lastName: 'Russell',
    jobTitle: 'CTO',
    departmentId: dept['Executive'],
    supervisorId: kurt.id,
    status: EmployeeStatus.ACTIVE,
    address: '18 Talent Lane',
    city: 'Quezon City',
    province: 'Metro Manila',
    country: 'Philippines',
    emergencyContactName: 'Kelvin Russell',
    emergencyContactNumber: '+63 917 555 0102',
  })

  // ── 3. Vn Ferrer — Team Alpha Lead, EMPLOYEE role (supervisor derived) ──
  const vnUser = await prisma.user.create({
    data: { email: 'vnferrer.work@gmail.com', role: 'EMPLOYEE' },
  })
  const vn = await createSeedEmployee(prisma, {
    userId: vnUser.id,
    companyEmail: 'vnferrer.work@gmail.com',
    firstName: 'Vn',
    lastName: 'Ferrer',
    jobTitle: 'Team Alpha Lead',
    departmentId: dept['Operations'],
    supervisorId: loreto.id,
    status: EmployeeStatus.ACTIVE,
    address: '12 Operations Road',
    city: 'Pasig',
    province: 'Metro Manila',
    country: 'Philippines',
    emergencyContactName: 'Vera Ferrer',
    emergencyContactNumber: '+63 917 555 0103',
  })

  // ── 4. Thea Verah — Team Beta Lead, EMPLOYEE role (supervisor derived) ──
  const theaVUser = await prisma.user.create({
    data: { email: 'theaverah@gmail.com', role: 'EMPLOYEE' },
  })
  const theaV = await createSeedEmployee(prisma, {
    userId: theaVUser.id,
    companyEmail: 'theaverah@gmail.com',
    firstName: 'Thea',
    lastName: 'Verah',
    jobTitle: 'Team Beta Lead',
    departmentId: dept['Product'],
    supervisorId: loreto.id,
    status: EmployeeStatus.ACTIVE,
    address: '24 Product Street',
    city: 'Taguig',
    province: 'Metro Manila',
    country: 'Philippines',
    emergencyContactName: 'Theo Verah',
    emergencyContactNumber: '+63 917 555 0104',
  })

  // ── 5. Darben Lamonte — HR Manager ──
  const darbenUser = await prisma.user.create({
    data: { email: 'darbenlamonte@gmail.com', role: 'HR' },
  })
  const darben = await createSeedEmployee(prisma, {
    userId: darbenUser.id,
    companyEmail: 'darbenlamonte@gmail.com',
    firstName: 'Darben',
    lastName: 'Lamonte',
    jobTitle: 'HR Manager',
    departmentId: dept['Human Resources'],
    supervisorId: kurt.id,
    status: EmployeeStatus.ACTIVE,
    address: '8 People Circle',
    city: 'Mandaluyong',
    province: 'Metro Manila',
    country: 'Philippines',
    emergencyContactName: 'Dara Lamonte',
    emergencyContactNumber: '+63 917 555 0105',
  })

  // ── 6. Thea Sumagang — HR Specialist ──
  const theaSUser = await prisma.user.create({
    data: { email: 'thea_sumagang@dlsu.edu.ph', role: 'HR' },
  })
  const theaS = await createSeedEmployee(prisma, {
    userId: theaSUser.id,
    companyEmail: 'thea_sumagang@dlsu.edu.ph',
    firstName: 'Thea',
    lastName: 'Sumagang',
    jobTitle: 'HR Specialist',
    departmentId: dept['Human Resources'],
    supervisorId: darben.id,
    status: EmployeeStatus.ACTIVE,
    address: '42 Campus Drive',
    city: 'Manila',
    province: 'Metro Manila',
    country: 'Philippines',
    emergencyContactName: 'Teresa Sumagang',
    emergencyContactNumber: '+63 917 555 0106',
  })

  // ── 7. Asha Ce — Systems Administrator, ADMIN role ──
  const ashaUser = await prisma.user.create({
    data: { email: 'ashasce@gmail.com', role: 'ADMIN' },
  })
  const asha = await createSeedEmployee(prisma, {
    userId: ashaUser.id,
    companyEmail: 'ashasce@gmail.com',
    firstName: 'Asha',
    lastName: 'Ce',
    jobTitle: 'Systems Administrator',
    departmentId: dept['Operations'],
    supervisorId: loreto.id,
    status: EmployeeStatus.ACTIVE,
    address: '55 Tech Park',
    city: 'Pasig',
    province: 'Metro Manila',
    country: 'Philippines',
    emergencyContactName: 'Alvin Ce',
    emergencyContactNumber: '+63 917 555 0107',
  })

  // ── 8. Ximen Galang — UI/UX Intern, EMPLOYEE role ──
  const ximenUser = await prisma.user.create({
    data: { email: 'ximen91101@gmail.com', role: 'EMPLOYEE' },
  })
  const ximen = await createSeedEmployee(prisma, {
    userId: ximenUser.id,
    companyEmail: 'ximen91101@gmail.com',
    firstName: 'Ximen',
    lastName: 'Galang',
    jobTitle: 'UI/UX Intern',
    departmentId: dept['Product'],
    supervisorId: theaV.id,
    status: EmployeeStatus.ACTIVE,
    address: '77 Design Hub',
    city: 'Taguig',
    province: 'Metro Manila',
    country: 'Philippines',
    emergencyContactName: 'Ximena Galang',
    emergencyContactNumber: '+63 917 555 0108',
  })

  // ── 9–20. Staff employees (@dgtechnologies.com) ──
  const staffData = [
    // Under Vn (Team Alpha, Operations)
    { email: 'alex.rivera@dgtechnologies.com', firstName: 'Alex', lastName: 'Rivera', title: 'Software Engineer', dept: 'Operations', sup: vn.id, status: EmployeeStatus.ACTIVE, address: '201 Alpha Street', city: 'Pasig', emergencyContactName: 'Andrea Rivera', emergencyContactNumber: '+63 917 555 0201' },
    { email: 'sam.torres@dgtechnologies.com', firstName: 'Sam', lastName: 'Torres', title: 'Frontend Developer', dept: 'Operations', sup: vn.id, status: EmployeeStatus.ACTIVE, address: '202 Alpha Street', city: 'Pasig', emergencyContactName: 'Sofia Torres', emergencyContactNumber: '+63 917 555 0202' },
    { email: 'jordan.cruz@dgtechnologies.com', firstName: 'Jordan', lastName: 'Cruz', title: 'QA Engineer', dept: 'Operations', sup: vn.id, status: EmployeeStatus.ACTIVE, address: '203 Alpha Street', city: 'Pasig', emergencyContactName: 'Jaime Cruz', emergencyContactNumber: '+63 917 555 0203' },
    { email: 'casey.reyes@dgtechnologies.com', firstName: 'Casey', lastName: 'Reyes', title: 'Junior Developer', dept: 'Operations', sup: vn.id, status: EmployeeStatus.ONBOARDING, address: '204 Alpha Street', city: 'Pasig', emergencyContactName: 'Carla Reyes', emergencyContactNumber: '+63 917 555 0204' },
    // Under Thea V. (Team Beta, Product)
    { email: 'riley.gomez@dgtechnologies.com', firstName: 'Riley', lastName: 'Gomez', title: 'UX Designer', dept: 'Product', sup: theaV.id, status: EmployeeStatus.ACTIVE, address: '301 Beta Avenue', city: 'Taguig', emergencyContactName: 'Ramon Gomez', emergencyContactNumber: '+63 917 555 0205' },
    { email: 'taylor.kim@dgtechnologies.com', firstName: 'Taylor', lastName: 'Kim', title: 'Product Manager', dept: 'Product', sup: theaV.id, status: EmployeeStatus.ACTIVE, address: '302 Beta Avenue', city: 'Taguig', emergencyContactName: 'Tessa Kim', emergencyContactNumber: '+63 917 555 0206' },
    { email: 'drew.patel@dgtechnologies.com', firstName: 'Drew', lastName: 'Patel', title: 'Backend Developer', dept: 'Product', sup: theaV.id, status: EmployeeStatus.ACTIVE, address: '303 Beta Avenue', city: 'Taguig', emergencyContactName: 'Dev Patel', emergencyContactNumber: '+63 917 555 0207' },
    { email: 'cameron.wong@dgtechnologies.com', firstName: 'Cameron', lastName: 'Wong', title: 'Data Analyst', dept: 'Product', sup: theaV.id, status: EmployeeStatus.ACTIVE, address: '304 Beta Avenue', city: 'Mandaluyong', emergencyContactName: 'Camille Wong', emergencyContactNumber: '+63 917 555 0208' },
    // Under Vn (Operations) — OFFBOARDING + INACTIVE
    { email: 'blake.mendez@dgtechnologies.com', firstName: 'Blake', lastName: 'Mendez', title: 'Marketing Specialist', dept: 'Operations', sup: vn.id, status: EmployeeStatus.OFFBOARDING, address: '305 Beta Avenue', city: 'Mandaluyong', emergencyContactName: 'Bianca Mendez', emergencyContactNumber: '+63 917 555 0209' },
    { email: 'morgan.lee@dgtechnologies.com', firstName: 'Morgan', lastName: 'Lee', title: 'Former Analyst', dept: 'Operations', sup: vn.id, status: EmployeeStatus.INACTIVE, address: '205 Alpha Street', city: 'Pasig', emergencyContactName: 'Mina Lee', emergencyContactNumber: '+63 917 555 0210' },
    // Under Kurt (Executive) — general staff
    { email: 'jamie.santos@dgtechnologies.com', firstName: 'Jamie', lastName: 'Santos', title: 'Finance Associate', dept: 'Executive', sup: kurt.id, status: EmployeeStatus.ACTIVE, address: '10 Finance Tower', city: 'Makati', emergencyContactName: 'Jesse Santos', emergencyContactNumber: '+63 917 555 0211' },
    // Under Loreto (Operations)
    { email: 'ria.navarro@dgtechnologies.com', firstName: 'Ria', lastName: 'Navarro', title: 'Operations Coordinator', dept: 'Operations', sup: loreto.id, status: EmployeeStatus.ACTIVE, address: '15 Coordination Hub', city: 'Pasig', emergencyContactName: 'Rica Navarro', emergencyContactNumber: '+63 917 555 0212' },
  ]

  const staff: Employee[] = []
  for (const s of staffData) {
    const user = await prisma.user.create({ data: { email: s.email, role: 'EMPLOYEE' } })
    const employee = await createSeedEmployee(prisma, {
      userId: user.id,
      companyEmail: s.email,
      firstName: s.firstName,
      lastName: s.lastName,
      jobTitle: s.title,
      departmentId: dept[s.dept],
      supervisorId: s.sup,
      status: s.status,
      address: s.address,
      city: s.city,
      province: 'Metro Manila',
      country: 'Philippines',
      emergencyContactName: s.emergencyContactName,
      emergencyContactNumber: s.emergencyContactNumber,
    })
    staff.push(employee)
  }

  return { kurt, loreto, vn, theaV, darben, theaS, asha, ximen, staff }
}
