import { PrismaClient, Employee } from '@prisma/client'

export type SeededUsers = {
  kurt: Employee
  vn: Employee
  thea: Employee
  darben: Employee
  loreto: Employee
  placeholders: Employee[] // index 0 = placeholder1 ... index 9 = placeholder10
}

export async function seedUsers(prisma: PrismaClient): Promise<SeededUsers> {
  const kurtUser = await prisma.user.create({
    data: { email: 'allenkurtds.dev@gmail.com', role: 'ADMIN' },
  })
  const kurt = await prisma.employee.create({
    data: {
      userId: kurtUser.id,
      companyEmail: 'allenkurtds.dev@gmail.com',
      firstName: 'Kurt',
      lastName: 'Ds',
      jobTitle: 'CEO',
      department: 'Executive',
      status: 'ACTIVE',
    },
  })

  const vnUser = await prisma.user.create({
    data: { email: 'vnferrer.work@gmail.com', role: 'SUPERVISOR' },
  })
  const vn = await prisma.employee.create({
    data: {
      userId: vnUser.id,
      companyEmail: 'vnferrer.work@gmail.com',
      firstName: 'Vn',
      lastName: 'Ferrer',
      jobTitle: 'Team Alpha Lead',
      department: 'Operations',
      supervisorId: kurt.id,
      status: 'ACTIVE',
    },
  })

  const theaUser = await prisma.user.create({
    data: { email: 'theaverah@gmail.com', role: 'SUPERVISOR' },
  })
  const thea = await prisma.employee.create({
    data: {
      userId: theaUser.id,
      companyEmail: 'theaverah@gmail.com',
      firstName: 'Thea',
      lastName: 'Verah',
      jobTitle: 'Team Beta Lead',
      department: 'Product',
      supervisorId: kurt.id,
      status: 'ACTIVE',
    },
  })

  const darbenUser = await prisma.user.create({
    data: { email: 'darbenlamonte@gmail.com', role: 'HR' },
  })
  const darben = await prisma.employee.create({
    data: {
      userId: darbenUser.id,
      companyEmail: 'darbenlamonte@gmail.com',
      firstName: 'Darben',
      lastName: 'Lamonte',
      jobTitle: 'HR Manager',
      department: 'Human Resources',
      supervisorId: kurt.id,
      status: 'ACTIVE',
    },
  })

  const loretoUser = await prisma.user.create({
    data: { email: 'loretorussellkelvinanthony@gmail.com', role: 'HR' },
  })
  const loreto = await prisma.employee.create({
    data: {
      userId: loretoUser.id,
      companyEmail: 'loretorussellkelvinanthony@gmail.com',
      firstName: 'Loreto',
      lastName: 'Russell',
      jobTitle: 'HR Specialist',
      department: 'Human Resources',
      supervisorId: kurt.id,
      status: 'ACTIVE',
    },
  })

  const placeholderData = [
    { email: 'employee.placeholder1@gmail.com',  firstName: 'Alex',    lastName: 'Rivera',  title: 'Software Engineer',    dept: 'Operations', sup: vn.id,   status: 'ACTIVE'      as const },
    { email: 'employee.placeholder2@gmail.com',  firstName: 'Sam',     lastName: 'Torres',  title: 'Product Analyst',      dept: 'Operations', sup: vn.id,   status: 'ACTIVE'      as const },
    { email: 'employee.placeholder3@gmail.com',  firstName: 'Jordan',  lastName: 'Cruz',    title: 'QA Engineer',          dept: 'Operations', sup: vn.id,   status: 'ACTIVE'      as const },
    { email: 'employee.placeholder4@gmail.com',  firstName: 'Casey',   lastName: 'Reyes',   title: 'Junior Developer',     dept: 'Operations', sup: vn.id,   status: 'ONBOARDING'  as const },
    { email: 'employee.placeholder5@gmail.com',  firstName: 'Morgan',  lastName: 'Lee',     title: 'Former Analyst',       dept: 'Operations', sup: vn.id,   status: 'INACTIVE'    as const },
    { email: 'employee.placeholder6@gmail.com',  firstName: 'Riley',   lastName: 'Gomez',   title: 'UX Designer',          dept: 'Product',    sup: thea.id, status: 'ACTIVE'      as const },
    { email: 'employee.placeholder7@gmail.com',  firstName: 'Taylor',  lastName: 'Kim',     title: 'Product Manager',      dept: 'Product',    sup: thea.id, status: 'ACTIVE'      as const },
    { email: 'employee.placeholder8@gmail.com',  firstName: 'Drew',    lastName: 'Patel',   title: 'Backend Developer',    dept: 'Product',    sup: thea.id, status: 'ACTIVE'      as const },
    { email: 'employee.placeholder9@gmail.com',  firstName: 'Cameron', lastName: 'Wong',    title: 'Data Analyst',         dept: 'Product',    sup: thea.id, status: 'ACTIVE'      as const },
    { email: 'employee.placeholder10@gmail.com', firstName: 'Blake',   lastName: 'Mendez',  title: 'Marketing Specialist', dept: 'Product',    sup: thea.id, status: 'OFFBOARDING' as const },
  ]

  const placeholders: Employee[] = []
  for (const p of placeholderData) {
    const user = await prisma.user.create({ data: { email: p.email, role: 'EMPLOYEE' } })
    const employee = await prisma.employee.create({
      data: {
        userId: user.id,
        companyEmail: p.email,
        firstName: p.firstName,
        lastName: p.lastName,
        jobTitle: p.title,
        department: p.dept,
        supervisorId: p.sup,
        status: p.status,
      },
    })
    placeholders.push(employee)
  }

  return { kurt, vn, thea, darben, loreto, placeholders }
}
