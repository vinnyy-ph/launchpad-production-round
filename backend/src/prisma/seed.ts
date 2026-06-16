import "dotenv/config";
import type { EmployeeStatus, Role } from "@prisma/client";
import { prisma } from "../core/database/prisma.service";

type SeedEmployee = {
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: EmployeeStatus;
  jobTitle: string;
  department: string;
  personalEmail: string;
  birthday: Date;
  address: string;
  emergencyContact: string;
  supervisorEmail?: string;
  teamNames: string[];
};

const SEED_ACTOR = "seed";

const seedEmployees: SeedEmployee[] = [
  {
    email: "ava.martin@swiftwork.local",
    firstName: "Ava",
    lastName: "Martin",
    role: "HR",
    status: "ACTIVE",
    jobTitle: "Head of People",
    department: "People",
    personalEmail: "ava.personal@example.com",
    birthday: new Date("1988-02-14T00:00:00.000Z"),
    address: "100 People Ops Avenue",
    emergencyContact: "Leo Martin, +1 555 1000",
    teamNames: ["People"],
  },
  {
    email: "noah.bennett@swiftwork.local",
    firstName: "Noah",
    lastName: "Bennett",
    role: "SUPERVISOR",
    status: "ACTIVE",
    jobTitle: "Engineering Manager",
    department: "Engineering",
    personalEmail: "noah.personal@example.com",
    birthday: new Date("1986-07-22T00:00:00.000Z"),
    address: "200 Engineering Road",
    emergencyContact: "Mia Bennett, +1 555 1001",
    supervisorEmail: "ava.martin@swiftwork.local",
    teamNames: ["Engineering"],
  },
  {
    email: "mia.chen@swiftwork.local",
    firstName: "Mia",
    lastName: "Chen",
    role: "SUPERVISOR",
    status: "ACTIVE",
    jobTitle: "Operations Lead",
    department: "Operations",
    personalEmail: "mia.personal@example.com",
    birthday: new Date("1990-05-03T00:00:00.000Z"),
    address: "300 Operations Street",
    emergencyContact: "Kai Chen, +1 555 1002",
    supervisorEmail: "ava.martin@swiftwork.local",
    teamNames: ["Operations"],
  },
  {
    email: "liam.parker@swiftwork.local",
    firstName: "Liam",
    lastName: "Parker",
    role: "EMPLOYEE",
    status: "ONBOARDING",
    jobTitle: "Frontend Engineer",
    department: "Engineering",
    personalEmail: "liam.personal@example.com",
    birthday: new Date("1996-11-10T00:00:00.000Z"),
    address: "401 React Lane",
    emergencyContact: "Nora Parker, +1 555 1003",
    supervisorEmail: "noah.bennett@swiftwork.local",
    teamNames: ["Engineering", "Product"],
  },
  {
    email: "sophia.garcia@swiftwork.local",
    firstName: "Sophia",
    lastName: "Garcia",
    role: "EMPLOYEE",
    status: "ACTIVE",
    jobTitle: "Backend Engineer",
    department: "Engineering",
    personalEmail: "sophia.personal@example.com",
    birthday: new Date("1994-03-18T00:00:00.000Z"),
    address: "402 API Boulevard",
    emergencyContact: "Elena Garcia, +1 555 1004",
    supervisorEmail: "noah.bennett@swiftwork.local",
    teamNames: ["Engineering"],
  },
  {
    email: "ethan.wright@swiftwork.local",
    firstName: "Ethan",
    lastName: "Wright",
    role: "EMPLOYEE",
    status: "ACTIVE",
    jobTitle: "Product Designer",
    department: "Product",
    personalEmail: "ethan.personal@example.com",
    birthday: new Date("1993-09-09T00:00:00.000Z"),
    address: "500 Design Drive",
    emergencyContact: "Olivia Wright, +1 555 1005",
    supervisorEmail: "ava.martin@swiftwork.local",
    teamNames: ["Product"],
  },
  {
    email: "isabella.lopez@swiftwork.local",
    firstName: "Isabella",
    lastName: "Lopez",
    role: "EMPLOYEE",
    status: "OFFBOARDING",
    jobTitle: "People Operations Specialist",
    department: "People",
    personalEmail: "isabella.personal@example.com",
    birthday: new Date("1991-12-01T00:00:00.000Z"),
    address: "101 People Ops Avenue",
    emergencyContact: "Mateo Lopez, +1 555 1006",
    supervisorEmail: "ava.martin@swiftwork.local",
    teamNames: ["People"],
  },
  {
    email: "james.kim@swiftwork.local",
    firstName: "James",
    lastName: "Kim",
    role: "EMPLOYEE",
    status: "ACTIVE",
    jobTitle: "Operations Coordinator",
    department: "Operations",
    personalEmail: "james.personal@example.com",
    birthday: new Date("1995-06-27T00:00:00.000Z"),
    address: "301 Operations Street",
    emergencyContact: "Hana Kim, +1 555 1007",
    supervisorEmail: "mia.chen@swiftwork.local",
    teamNames: ["Operations"],
  },
  {
    email: "amelia.scott@swiftwork.local",
    firstName: "Amelia",
    lastName: "Scott",
    role: "EMPLOYEE",
    status: "INACTIVE",
    jobTitle: "Finance Analyst",
    department: "Finance",
    personalEmail: "amelia.personal@example.com",
    birthday: new Date("1989-10-16T00:00:00.000Z"),
    address: "600 Finance Way",
    emergencyContact: "Henry Scott, +1 555 1008",
    supervisorEmail: "ava.martin@swiftwork.local",
    teamNames: ["Finance"],
  },
  {
    email: "benjamin.young@swiftwork.local",
    firstName: "Benjamin",
    lastName: "Young",
    role: "EMPLOYEE",
    status: "ACTIVE",
    jobTitle: "QA Engineer",
    department: "Engineering",
    personalEmail: "benjamin.personal@example.com",
    birthday: new Date("1997-01-30T00:00:00.000Z"),
    address: "403 Quality Court",
    emergencyContact: "Grace Young, +1 555 1009",
    supervisorEmail: "noah.bennett@swiftwork.local",
    teamNames: ["Engineering"],
  },
];

const teamLeadersByName: Record<string, string> = {
  Engineering: "noah.bennett@swiftwork.local",
  Finance: "ava.martin@swiftwork.local",
  Operations: "mia.chen@swiftwork.local",
  People: "ava.martin@swiftwork.local",
  Product: "ethan.wright@swiftwork.local",
};

async function main() {
  const employeeIdsByEmail = await seedUsersAndEmployees();
  await applySupervisorTree(employeeIdsByEmail);
  await seedTeamsAndMemberships(employeeIdsByEmail);

  console.log(`Seeded ${seedEmployees.length} employees.`);
}

/**
 * Creates or updates auth users and their employee records by stable seeded email.
 */
async function seedUsersAndEmployees() {
  const employeeIdsByEmail = new Map<string, string>();

  for (const seedEmployee of seedEmployees) {
    const user = await prisma.user.upsert({
      where: { email: seedEmployee.email },
      update: {
        role: seedEmployee.role,
        isActive: seedEmployee.status !== "INACTIVE",
        updatedBy: SEED_ACTOR,
      },
      create: {
        email: seedEmployee.email,
        googleId: `seed-${seedEmployee.email}`,
        role: seedEmployee.role,
        isActive: seedEmployee.status !== "INACTIVE",
        createdBy: SEED_ACTOR,
        updatedBy: SEED_ACTOR,
      },
    });

    const employee = await prisma.employee.upsert({
      where: { userId: user.id },
      update: {
        companyEmail: seedEmployee.email,
        firstName: seedEmployee.firstName,
        lastName: seedEmployee.lastName,
        personalEmail: seedEmployee.personalEmail,
        birthday: seedEmployee.birthday,
        address: seedEmployee.address,
        emergencyContact: seedEmployee.emergencyContact,
        jobTitle: seedEmployee.jobTitle,
        department: seedEmployee.department,
        status: seedEmployee.status,
        deletedAt: null,
        deletedBy: null,
        updatedBy: SEED_ACTOR,
      },
      create: {
        userId: user.id,
        companyEmail: seedEmployee.email,
        firstName: seedEmployee.firstName,
        lastName: seedEmployee.lastName,
        personalEmail: seedEmployee.personalEmail,
        birthday: seedEmployee.birthday,
        address: seedEmployee.address,
        emergencyContact: seedEmployee.emergencyContact,
        jobTitle: seedEmployee.jobTitle,
        department: seedEmployee.department,
        status: seedEmployee.status,
        createdBy: SEED_ACTOR,
        updatedBy: SEED_ACTOR,
      },
    });

    employeeIdsByEmail.set(seedEmployee.email, employee.id);
  }

  return employeeIdsByEmail;
}

/**
 * Applies reporting relationships after all employees exist so supervisor IDs are available.
 */
async function applySupervisorTree(employeeIdsByEmail: Map<string, string>) {
  for (const seedEmployee of seedEmployees) {
    const employeeId = employeeIdsByEmail.get(seedEmployee.email);
    const supervisorId = seedEmployee.supervisorEmail
      ? employeeIdsByEmail.get(seedEmployee.supervisorEmail)
      : null;

    if (!employeeId) {
      continue;
    }

    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        supervisorId,
        updatedBy: SEED_ACTOR,
      },
    });
  }
}

/**
 * Creates stable teams and connects employees to each team listed in the seed data.
 */
async function seedTeamsAndMemberships(employeeIdsByEmail: Map<string, string>) {
  for (const [teamName, leaderEmail] of Object.entries(teamLeadersByName)) {
    const leaderId = employeeIdsByEmail.get(leaderEmail);

    if (!leaderId) {
      throw new Error(`Missing seeded leader for team ${teamName}`);
    }

    const team = await findOrCreateTeam(teamName, leaderId);
    const teamEmployees = seedEmployees.filter((employee) => employee.teamNames.includes(teamName));

    for (const seedEmployee of teamEmployees) {
      const employeeId = employeeIdsByEmail.get(seedEmployee.email);

      if (!employeeId) {
        continue;
      }

      await prisma.teamMember.upsert({
        where: {
          teamId_employeeId: {
            teamId: team.id,
            employeeId,
          },
        },
        update: {
          deletedAt: null,
          deletedBy: null,
          updatedBy: SEED_ACTOR,
        },
        create: {
          teamId: team.id,
          employeeId,
          createdBy: SEED_ACTOR,
          updatedBy: SEED_ACTOR,
        },
      });
    }
  }
}

/**
 * Team names are not unique in the schema, so use a soft-delete-aware lookup before creating.
 */
async function findOrCreateTeam(name: string, leaderId: string) {
  const existingTeam = await prisma.team.findFirst({
    where: {
      name,
      deletedAt: null,
    },
  });

  if (existingTeam) {
    return prisma.team.update({
      where: { id: existingTeam.id },
      data: {
        leaderId,
        updatedBy: SEED_ACTOR,
      },
    });
  }

  return prisma.team.create({
    data: {
      name,
      leaderId,
      createdBy: SEED_ACTOR,
      updatedBy: SEED_ACTOR,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
