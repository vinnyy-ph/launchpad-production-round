import { PrismaClient, Employee, EmployeeStatus } from '@prisma/client'

export type SeededUsers = {
  kurt: Employee
  vn: Employee
  thea: Employee
  darben: Employee
  loreto: Employee
  placeholders: Employee[] // index 0 = placeholder1 ... index 9 = placeholder10
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
  // Departments are normalized, so employees reference departmentId instead of free text.
  const dept: Record<string, string> = {}
  for (const name of ['Executive', 'Operations', 'Product', 'Human Resources']) {
    const d = await prisma.department.create({ data: { name } })
    dept[name] = d.id
  }

  const kurtUser = await prisma.user.create({
    data: { email: 'allenkurtds.dev@gmail.com', role: 'ADMIN' },
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

  // ADMIN. Supervisor capability is derived from the org graph, not a stored role.
  const vnUser = await prisma.user.create({
    data: { email: 'vnferrer.work@gmail.com', role: 'ADMIN' },
  })
  const vn = await createSeedEmployee(prisma, {
    userId: vnUser.id,
    companyEmail: 'vnferrer.work@gmail.com',
    firstName: 'Vn',
    lastName: 'Ferrer',
    jobTitle: 'Team Alpha Lead',
    departmentId: dept['Operations'],
    supervisorId: kurt.id,
    status: EmployeeStatus.ACTIVE,
    address: '12 Operations Road',
    city: 'Pasig',
    province: 'Metro Manila',
    country: 'Philippines',
    emergencyContactName: 'Vera Ferrer',
    emergencyContactNumber: '+63 917 555 0102',
  })

  // EMPLOYEE role; supervisor capability is derived from the org graph.
  const theaUser = await prisma.user.create({
    data: { email: 'theaverah@gmail.com', role: 'EMPLOYEE' },
  })
  const thea = await createSeedEmployee(prisma, {
    userId: theaUser.id,
    companyEmail: 'theaverah@gmail.com',
    firstName: 'Thea',
    lastName: 'Verah',
    jobTitle: 'Team Beta Lead',
    departmentId: dept['Product'],
    supervisorId: kurt.id,
    status: EmployeeStatus.ACTIVE,
    address: '24 Product Street',
    city: 'Taguig',
    province: 'Metro Manila',
    country: 'Philippines',
    emergencyContactName: 'Theo Verah',
    emergencyContactNumber: '+63 917 555 0103',
  })

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
    emergencyContactNumber: '+63 917 555 0104',
  })

  const loretoUser = await prisma.user.create({
    data: { email: 'loretorussellkelvinanthony@gmail.com', role: 'HR' },
  })
  const loreto = await createSeedEmployee(prisma, {
    userId: loretoUser.id,
    companyEmail: 'loretorussellkelvinanthony@gmail.com',
    firstName: 'Loreto',
    lastName: 'Russell',
    jobTitle: 'HR Specialist',
    departmentId: dept['Human Resources'],
    supervisorId: kurt.id,
    status: EmployeeStatus.ACTIVE,
    address: '18 Talent Lane',
    city: 'Quezon City',
    province: 'Metro Manila',
    country: 'Philippines',
    emergencyContactName: 'Kelvin Russell',
    emergencyContactNumber: '+63 917 555 0105',
  })

  const placeholderData = [
    { email: 'employee.placeholder1@gmail.com', firstName: 'Alex', lastName: 'Rivera', title: 'Software Engineer', dept: 'Operations', sup: vn.id, status: EmployeeStatus.ACTIVE, address: '201 Alpha Street', city: 'Pasig', emergencyContactName: 'Andrea Rivera', emergencyContactNumber: '+63 917 555 0201' },
    { email: 'employee.placeholder2@gmail.com', firstName: 'Sam', lastName: 'Torres', title: 'Product Analyst', dept: 'Operations', sup: vn.id, status: EmployeeStatus.ACTIVE, address: '202 Alpha Street', city: 'Pasig', emergencyContactName: 'Sofia Torres', emergencyContactNumber: '+63 917 555 0202' },
    { email: 'employee.placeholder3@gmail.com', firstName: 'Jordan', lastName: 'Cruz', title: 'QA Engineer', dept: 'Operations', sup: vn.id, status: EmployeeStatus.ACTIVE, address: '203 Alpha Street', city: 'Pasig', emergencyContactName: 'Jaime Cruz', emergencyContactNumber: '+63 917 555 0203' },
    { email: 'employee.placeholder4@gmail.com', firstName: 'Casey', lastName: 'Reyes', title: 'Junior Developer', dept: 'Operations', sup: vn.id, status: EmployeeStatus.ONBOARDING, address: '204 Alpha Street', city: 'Pasig', emergencyContactName: 'Carla Reyes', emergencyContactNumber: '+63 917 555 0204' },
    { email: 'employee.placeholder5@gmail.com', firstName: 'Morgan', lastName: 'Lee', title: 'Former Analyst', dept: 'Operations', sup: vn.id, status: EmployeeStatus.INACTIVE, address: '205 Alpha Street', city: 'Pasig', emergencyContactName: 'Mina Lee', emergencyContactNumber: '+63 917 555 0205' },
    { email: 'employee.placeholder6@gmail.com', firstName: 'Riley', lastName: 'Gomez', title: 'UX Designer', dept: 'Product', sup: thea.id, status: EmployeeStatus.ACTIVE, address: '301 Beta Avenue', city: 'Taguig', emergencyContactName: 'Ramon Gomez', emergencyContactNumber: '+63 917 555 0206' },
    { email: 'employee.placeholder7@gmail.com', firstName: 'Taylor', lastName: 'Kim', title: 'Product Manager', dept: 'Product', sup: thea.id, status: EmployeeStatus.ACTIVE, address: '302 Beta Avenue', city: 'Taguig', emergencyContactName: 'Tessa Kim', emergencyContactNumber: '+63 917 555 0207' },
    { email: 'employee.placeholder8@gmail.com', firstName: 'Drew', lastName: 'Patel', title: 'Backend Developer', dept: 'Product', sup: thea.id, status: EmployeeStatus.ACTIVE, address: '303 Beta Avenue', city: 'Taguig', emergencyContactName: 'Dev Patel', emergencyContactNumber: '+63 917 555 0208' },
    { email: 'employee.placeholder9@gmail.com', firstName: 'Cameron', lastName: 'Wong', title: 'Data Analyst', dept: 'Product', sup: thea.id, status: EmployeeStatus.ACTIVE, address: '304 Beta Avenue', city: 'Mandaluyong', emergencyContactName: 'Camille Wong', emergencyContactNumber: '+63 917 555 0209' },
    { email: 'employee.placeholder10@gmail.com', firstName: 'Blake', lastName: 'Mendez', title: 'Marketing Specialist', dept: 'Product', sup: thea.id, status: EmployeeStatus.OFFBOARDING, address: '305 Beta Avenue', city: 'Mandaluyong', emergencyContactName: 'Bianca Mendez', emergencyContactNumber: '+63 917 555 0210' },
  ]

  const placeholders: Employee[] = []
  for (const p of placeholderData) {
    const user = await prisma.user.create({ data: { email: p.email, role: 'EMPLOYEE' } })
    const employee = await createSeedEmployee(prisma, {
      userId: user.id,
      companyEmail: p.email,
      firstName: p.firstName,
      lastName: p.lastName,
      jobTitle: p.title,
      departmentId: dept[p.dept],
      supervisorId: p.sup,
      status: p.status,
      address: p.address,
      city: p.city,
      province: 'Metro Manila',
      country: 'Philippines',
      emergencyContactName: p.emergencyContactName,
      emergencyContactNumber: p.emergencyContactNumber,
    })
    placeholders.push(employee)
  }

  return { kurt, vn, thea, darben, loreto, placeholders }
}
