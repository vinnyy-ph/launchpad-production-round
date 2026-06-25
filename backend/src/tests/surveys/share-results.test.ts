import request from "supertest";
import { app } from "../../app";
import { prisma } from "../../core/database/prisma.service";
import { NotificationsService } from "../../modules/notifications/notifications.service";

jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: jest.fn((req: any, _res: unknown, next: () => void) => {
    req.user = { id: "hr-user", role: "HR" };
    next();
  }),
}));

jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    employee: { findUnique: jest.fn() },
    pulseSurvey: { findFirst: jest.fn() },
    surveyOccurrence: { findUnique: jest.fn(), findFirst: jest.fn() },
    team: { findUnique: jest.fn() },
    surveyResultShare: { upsert: jest.fn(), findUnique: jest.fn() },
  },
}));

// The share notification is fire-and-forget and exercised elsewhere; spy on the one method so
// the endpoint test stays focused on the server-side gates (and never sends a real email).
const notifyMock = jest
  .spyOn(NotificationsService.prototype, "notifySupervisorPulseResultsShared")
  .mockResolvedValue(undefined);

const URL = "/api/v1/pulse/surveys";

describe("POST /api/v1/pulse/surveys/:id/results/share", () => {
  const authMock = jest.requireMock("../../core/middleware/auth.middleware");
  const employeeMock = prisma.employee.findUnique as jest.Mock;
  const surveyMock = prisma.pulseSurvey.findFirst as jest.Mock;
  const occUniqueMock = prisma.surveyOccurrence.findUnique as jest.Mock;
  const occFirstMock = prisma.surveyOccurrence.findFirst as jest.Mock;
  const teamMock = prisma.team.findUnique as jest.Mock;
  const upsertMock = prisma.surveyResultShare.upsert as jest.Mock;

  const setRole = (user: { id: string; role: string }) =>
    authMock.authenticate.mockImplementation((req: any, _res: any, next: any) => {
      req.user = user;
      next();
    });

  // Closed recently so the completion gate passes AND the 30-day send window is still open.
  const completedOccurrence = {
    id: "occ-1",
    surveyId: "survey-1",
    isClosed: true,
    deadline: new Date(Date.now() - 24 * 60 * 60 * 1000),
  };
  const smallTeam = {
    id: "team-1",
    name: "Team Small",
    leaderId: "leader-1",
    leader: { id: "leader-1", firstName: "Lee", lastName: "Dre", status: "ACTIVE" },
    _count: { members: 2 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setRole({ id: "hr-user", role: "HR" });
    employeeMock.mockResolvedValue({ id: "hr-emp" });
    surveyMock.mockResolvedValue({ id: "survey-1", name: "Q2 Pulse", isAnonymous: true });
    occUniqueMock.mockResolvedValue(completedOccurrence);
    occFirstMock.mockResolvedValue(completedOccurrence);
    teamMock.mockResolvedValue(smallTeam);
    upsertMock.mockResolvedValue({ id: "share-1", sharedAt: new Date("2026-06-23T00:00:00Z") });
  });

  it("403s a non-HR caller (route guard) before any work", async () => {
    setRole({ id: "emp-user", role: "EMPLOYEE" });
    await request(app)
      .post(`${URL}/survey-1/results/share`)
      .send({ teamId: "team-1", message: "Nice work this week." })
      .expect(403);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("400s when teamId is missing", async () => {
    const res = await request(app).post(`${URL}/survey-1/results/share`).send({}).expect(400);
    expect(res.body.errorCode).toBe("TEAM_ID_REQUIRED");
  });

  it("404s when the survey does not exist", async () => {
    surveyMock.mockResolvedValue(null);
    const res = await request(app)
      .post(`${URL}/survey-1/results/share`)
      .send({ teamId: "team-1", message: "Nice work this week." })
      .expect(404);
    expect(res.body.errorCode).toBe("SURVEY_NOT_FOUND");
  });

  it("400s when the survey is not anonymous", async () => {
    surveyMock.mockResolvedValue({ id: "survey-1", name: "Q2 Pulse", isAnonymous: false });
    const res = await request(app)
      .post(`${URL}/survey-1/results/share`)
      .send({ teamId: "team-1", message: "Nice work this week." })
      .expect(400);
    expect(res.body.errorCode).toBe("SHARE_NOT_ANONYMOUS");
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("409s when the occurrence is still collecting responses (completion gate)", async () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    occFirstMock.mockResolvedValue({ ...completedOccurrence, isClosed: false, deadline: future });
    const res = await request(app)
      .post(`${URL}/survey-1/results/share`)
      .send({ teamId: "team-1", message: "Nice work this week." })
      .expect(409);
    expect(res.body.errorCode).toBe("SHARE_NOT_COMPLETED");
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("400s when the team is not small (>= 3 members)", async () => {
    teamMock.mockResolvedValue({ ...smallTeam, _count: { members: 5 } });
    const res = await request(app)
      .post(`${URL}/survey-1/results/share`)
      .send({ teamId: "team-1", message: "Nice work this week." })
      .expect(400);
    expect(res.body.errorCode).toBe("SHARE_NOT_SMALL_TEAM");
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("422s when the team has no resolvable supervisor", async () => {
    teamMock.mockResolvedValue({ ...smallTeam, leaderId: null, leader: null });
    const res = await request(app)
      .post(`${URL}/survey-1/results/share`)
      .send({ teamId: "team-1", message: "Nice work this week." })
      .expect(422);
    expect(res.body.errorCode).toBe("SHARE_NO_SUPERVISOR");
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("shares results: upserts the grant and notifies the supervisor", async () => {
    const res = await request(app)
      .post(`${URL}/survey-1/results/share`)
      .send({ teamId: "team-1", message: "Nice work this week." })
      .expect(200);

    expect(res.body).toMatchObject({
      success: true,
      data: { supervisorId: "leader-1", supervisorName: "Lee Dre", teamName: "Team Small" },
    });
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { occurrenceId_teamId: { occurrenceId: "occ-1", teamId: "team-1" } },
        create: expect.objectContaining({ message: "Nice work this week." }),
      }),
    );
    expect(notifyMock).toHaveBeenCalledWith(
      "leader-1",
      "Q2 Pulse",
      "Team Small",
      "survey-1",
      "occ-1",
      "team-1",
      "Nice work this week.",
    );
  });

  it("400s when the note is empty (message required)", async () => {
    const res = await request(app)
      .post(`${URL}/survey-1/results/share`)
      .send({ teamId: "team-1", message: "   " })
      .expect(400);
    expect(res.body.errorCode).toBe("SHARE_MESSAGE_REQUIRED");
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("400s when the note exceeds the max length", async () => {
    const res = await request(app)
      .post(`${URL}/survey-1/results/share`)
      .send({ teamId: "team-1", message: "x".repeat(2001) })
      .expect(400);
    expect(res.body.errorCode).toBe("SHARE_MESSAGE_TOO_LONG");
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("400s when the note contains unsafe HTML", async () => {
    const res = await request(app)
      .post(`${URL}/survey-1/results/share`)
      .send({ teamId: "team-1", message: "<script>x</script>" })
      .expect(400);
    expect(res.body.errorCode).toBe("VALIDATION_FAILED");
    expect(res.body.errors[0].message).toMatch(/must not contain HTML/);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("uses the explicit occurrenceId when provided", async () => {
    occUniqueMock.mockResolvedValue({ ...completedOccurrence, id: "occ-7" });
    await request(app)
      .post(`${URL}/survey-1/results/share`)
      .send({ teamId: "team-1", occurrenceId: "occ-7", message: "Nice work this week." })
      .expect(200);
    expect(occUniqueMock).toHaveBeenCalledWith({ where: { id: "occ-7" } });
  });

  it("409s when a note has already been sent for this occurrence + team (immutable)", async () => {
    (prisma.surveyResultShare.findUnique as jest.Mock).mockResolvedValue({
      id: "share-1",
      message: "Already sent.",
      sharedAt: new Date(),
    });
    const res = await request(app)
      .post(`${URL}/survey-1/results/share`)
      .send({ teamId: "team-1", message: "Trying to re-send." })
      .expect(409);
    expect(res.body.errorCode).toBe("SHARE_ALREADY_SENT");
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("409s when the 30-day send window has closed", async () => {
    const longClosed = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 days ago
    occUniqueMock.mockResolvedValue({ ...completedOccurrence, isClosed: true, deadline: longClosed });
    occFirstMock.mockResolvedValue({ ...completedOccurrence, isClosed: true, deadline: longClosed });
    const res = await request(app)
      .post(`${URL}/survey-1/results/share`)
      .send({ teamId: "team-1", message: "Too late to send." })
      .expect(409);
    expect(res.body.errorCode).toBe("SHARE_WINDOW_CLOSED");
    expect(upsertMock).not.toHaveBeenCalled();
  });
});
