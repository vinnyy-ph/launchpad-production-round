import type { User } from "@prisma/client";
import request from "supertest";
import { app } from "../../app";
import {
  buildEmployeeProfileRecord,
  buildEmployeeRecord,
  buildViewer,
  countMock,
  findFirstMock,
  findManyMock,
  mockedPrisma,
  resetEmployeeMocks,
} from "./employees-test.helpers";

// Object-level profile access runs a "do these two share a team?" query; mocked per scenario.
const teamFindFirstMock = mockedPrisma.team.findFirst as unknown as jest.Mock;

// A mutable caller the auth mock injects. Tests set it per scenario to act as HR, self, a peer,
// or (when unset) an unauthenticated request. Must be `mock`-prefixed to satisfy jest hoisting.
let mockCurrentUser: User | undefined;

jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, res: { status: (n: number) => { json: (b: unknown) => unknown } }, next: () => void) => {
    if (!mockCurrentUser) {
      // Mirror the real authenticate guard: no bearer/account => 401.
      return res.status(401).json({ error: "Missing bearer token" });
    }
    req.user = mockCurrentUser;
    return next();
  },
}));

jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    employee: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    activityLog: { createMany: jest.fn() },
    team: {
      findFirst: jest.fn(),
    },
  },
}));

// The subject's account id, as seeded in buildEmployeeProfileRecord (user.id).
const SUBJECT_USER_ID = "employee-active-user";

const SENSITIVE_PROFILE_FIELDS = [
  "personalEmail",
  "birthday",
  "address",
  "emergencyContact",
] as const;

describe("GET /api/v1/employees/:employeeId - profile redaction by caller", () => {
  beforeEach(() => {
    resetEmployeeMocks();
    teamFindFirstMock.mockReset();
    mockCurrentUser = undefined;
  });

  it("rejects an unauthenticated request", async () => {
    await request(app).get("/api/v1/employees/employee-active").expect(401);
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("returns the FULL profile to HR", async () => {
    mockCurrentUser = buildViewer({ id: "hr-user-id", role: "HR" }) as User;
    findFirstMock.mockResolvedValue(buildEmployeeProfileRecord());

    const response = await request(app).get("/api/v1/employees/employee-active").expect(200);

    expect(response.body.data.personalEmail).toBe("marcus.personal@example.com");
    expect(response.body.data.birthday).toBeDefined();
    expect(response.body.data.address).toBeDefined();
    expect(response.body.data.emergencyContact).toBeDefined();
  });

  it("returns the FULL own profile to the subject (self)", async () => {
    mockCurrentUser = buildViewer({ id: SUBJECT_USER_ID, role: "EMPLOYEE" }) as User;
    findFirstMock.mockResolvedValue(buildEmployeeProfileRecord());

    const response = await request(app).get("/api/v1/employees/employee-active").expect(200);

    expect(response.body.data.personalEmail).toBe("marcus.personal@example.com");
    expect(response.body.data.birthday).toBeDefined();
    expect(response.body.data.address).toBeDefined();
    expect(response.body.data.emergencyContact).toBeDefined();
  });

  it("returns a REDACTED profile to a teammate (shared team), sensitive fields absent", async () => {
    mockCurrentUser = buildViewer({ id: "teammate-user-id", role: "EMPLOYEE" }) as User;
    // 1st findFirst resolves the target profile; 2nd resolves the viewer's own identity for the
    // relationship check. The shared-team lookup then authorizes the (redacted) read.
    findFirstMock
      .mockResolvedValueOnce(buildEmployeeProfileRecord())
      .mockResolvedValueOnce({ id: "teammate-employee-id", supervisorId: null });
    teamFindFirstMock.mockResolvedValue({ id: "team-engineering" });

    const response = await request(app).get("/api/v1/employees/employee-active").expect(200);

    // Safe identity/work data is still present so the teammate profile remains useful.
    expect(response.body.data.fullName).toBe("Marcus Reed");
    expect(response.body.data.jobTitle).toBeDefined();
    expect(response.body.data.supervisor).not.toBeNull();

    // The sensitive fields must not be in the payload at all (not merely null).
    for (const field of SENSITIVE_PROFILE_FIELDS) {
      expect(response.body.data).not.toHaveProperty(field);
    }
  });

  it("forbids a non-HR caller who is not self, supervisor, report, or teammate (403)", async () => {
    mockCurrentUser = buildViewer({ id: "stranger-user-id", role: "EMPLOYEE" }) as User;
    findFirstMock
      .mockResolvedValueOnce(buildEmployeeProfileRecord())
      .mockResolvedValueOnce({ id: "stranger-employee-id", supervisorId: null });
    teamFindFirstMock.mockResolvedValue(null); // no shared team

    await request(app).get("/api/v1/employees/employee-active").expect(403);
  });
});

describe("GET /api/v1/employees - directory redaction by caller", () => {
  beforeEach(() => {
    resetEmployeeMocks();
    mockCurrentUser = undefined;
  });

  it("rejects an unauthenticated request", async () => {
    await request(app).get("/api/v1/employees").expect(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("returns FULL list rows to HR (address and emergencyContact present)", async () => {
    mockCurrentUser = buildViewer({ id: "hr-user-id", role: "HR" }) as User;
    findManyMock.mockResolvedValue([
      buildEmployeeRecord({
        id: "employee-active",
        firstName: "Marcus",
        lastName: "Reed",
        status: "ACTIVE",
        teamName: "Engineering",
      }),
    ]);
    countMock.mockResolvedValue(1);

    const response = await request(app).get("/api/v1/employees").expect(200);

    expect(response.body.data[0]).toHaveProperty("address");
    expect(response.body.data[0]).toHaveProperty("emergencyContact");
  });

  it("returns REDACTED list rows to a non-HR peer (address and emergencyContact absent)", async () => {
    mockCurrentUser = buildViewer({ id: "peer-user-id", role: "EMPLOYEE" }) as User;
    findManyMock.mockResolvedValue([
      buildEmployeeRecord({
        id: "employee-active",
        firstName: "Marcus",
        lastName: "Reed",
        status: "ACTIVE",
        teamName: "Engineering",
      }),
    ]);
    countMock.mockResolvedValue(1);

    const response = await request(app).get("/api/v1/employees").expect(200);

    // Safe directory fields remain.
    expect(response.body.data[0].fullName).toBe("Marcus Reed");
    expect(response.body.data[0].status).toBe("active");
    // Sensitive fields are stripped from each row.
    expect(response.body.data[0]).not.toHaveProperty("address");
    expect(response.body.data[0]).not.toHaveProperty("emergencyContact");
  });
});
