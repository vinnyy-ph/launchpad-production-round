import request from "supertest";
import { app } from "../../app";
import { prisma } from "../../core/database/prisma.service";

jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: jest.fn((req: any, _res: unknown, next: () => void) => {
    req.user = { id: "test-employee-user-id", role: "EMPLOYEE" };
    next();
  }),
}));

jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    employee: {
      findUnique: jest.fn(),
    },
    surveyOccurrence: {
      findUnique: jest.fn(),
    },
    surveyAudienceMember: {
      findUnique: jest.fn(),
    },
    surveyCompletion: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    surveyResponse: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const employeeFindUniqueMock = prisma.employee.findUnique as jest.Mock;
const occurrenceFindUniqueMock = prisma.surveyOccurrence.findUnique as jest.Mock;
const audienceMemberFindUniqueMock = prisma.surveyAudienceMember.findUnique as jest.Mock;
const completionFindUniqueMock = prisma.surveyCompletion.findUnique as jest.Mock;
const transactionMock = prisma.$transaction as jest.Mock;
const responseCreateMock = prisma.surveyResponse.create as jest.Mock;
const completionCreateMock = prisma.surveyCompletion.create as jest.Mock;

const URL = "/api/v1/pulse/occurrences/occ-001/respond";

describe("POST /api/v1/pulse/occurrences/:occurrenceId/respond", () => {
  beforeEach(() => {
    employeeFindUniqueMock.mockReset();
    occurrenceFindUniqueMock.mockReset();
    audienceMemberFindUniqueMock.mockReset();
    completionFindUniqueMock.mockReset();
    transactionMock.mockReset();
    responseCreateMock.mockReset();
    completionCreateMock.mockReset();

    // Setup transaction mock helper
    transactionMock.mockImplementation(async (cb: any) => {
      return cb({
        surveyResponse: { create: responseCreateMock },
        surveyCompletion: { create: completionCreateMock },
      });
    });
  });

  it("returns 401 if not authenticated", async () => {
    const authMock = jest.requireMock("../../core/middleware/auth.middleware");
    authMock.authenticate.mockImplementationOnce(
      (req: any, res: any, next: () => void) => {
        return res.status(401).json({ success: false, message: "Not authenticated" });
      },
    );

    const response = await request(app).post(URL).send({ answers: [] }).expect(401);
    expect(response.body).toMatchObject({ success: false, message: "Not authenticated" });
  });

  it("returns 400 if answers is missing", async () => {
    const response = await request(app).post(URL).send({}).expect(400);
    expect(response.body).toMatchObject({
      success: false,
      message: "answers must be a non-empty array",
    });
  });

  it("returns 400 if answers is an empty array", async () => {
    const response = await request(app).post(URL).send({ answers: [] }).expect(400);
    expect(response.body).toMatchObject({
      success: false,
      message: "answers must be a non-empty array",
    });
  });

  it("returns 400 if an answer is missing questionId", async () => {
    const response = await request(app)
      .post(URL)
      .send({ answers: [{ answerText: "yes" }] })
      .expect(400);
    expect(response.body).toMatchObject({
      success: false,
      message: "questionId must be a non-empty string",
    });
  });

  it("returns 400 if an answer has no answerText or answerData", async () => {
    const response = await request(app)
      .post(URL)
      .send({ answers: [{ questionId: "q-1" }] })
      .expect(400);
    expect(response.body).toMatchObject({
      success: false,
      message: "Each answer must provide answerText or answerData",
    });
  });

  it("returns 404 if occurrence does not exist", async () => {
    employeeFindUniqueMock.mockResolvedValue({ id: "emp-1", supervisorId: null, teamMemberships: [] });
    occurrenceFindUniqueMock.mockResolvedValue(null);

    const response = await request(app)
      .post(URL)
      .send({ answers: [{ questionId: "q-1", answerText: "yes" }] })
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      message: "Occurrence not found",
    });
  });

  it("returns 409 if occurrence is closed", async () => {
    employeeFindUniqueMock.mockResolvedValue({ id: "emp-1", supervisorId: null, teamMemberships: [] });
    occurrenceFindUniqueMock.mockResolvedValue({
      id: "occ-001",
      isClosed: true,
      deadline: new Date(Date.now() + 86400000),
      survey: { isAnonymous: false },
    });

    const response = await request(app)
      .post(URL)
      .send({ answers: [{ questionId: "q-1", answerText: "yes" }] })
      .expect(409);

    expect(response.body).toMatchObject({
      success: false,
      message: "Occurrence closed",
    });
  });

  it("returns 409 if occurrence deadline has passed", async () => {
    employeeFindUniqueMock.mockResolvedValue({ id: "emp-1", supervisorId: null, teamMemberships: [] });
    occurrenceFindUniqueMock.mockResolvedValue({
      id: "occ-001",
      isClosed: false,
      deadline: new Date(Date.now() - 10000),
      survey: { isAnonymous: false },
    });

    const response = await request(app)
      .post(URL)
      .send({ answers: [{ questionId: "q-1", answerText: "yes" }] })
      .expect(409);

    expect(response.body).toMatchObject({
      success: false,
      message: "Occurrence closed",
    });
  });

  it("returns 403 if employee is not in the audience", async () => {
    employeeFindUniqueMock.mockResolvedValue({ id: "emp-1", supervisorId: null, teamMemberships: [] });
    occurrenceFindUniqueMock.mockResolvedValue({
      id: "occ-001",
      isClosed: false,
      deadline: new Date(Date.now() + 86400000),
      survey: { isAnonymous: false },
    });
    audienceMemberFindUniqueMock.mockResolvedValue(null);

    const response = await request(app)
      .post(URL)
      .send({ answers: [{ questionId: "q-1", answerText: "yes" }] })
      .expect(403);

    expect(response.body).toMatchObject({
      success: false,
      message: "Not in audience",
    });
  });

  it("returns 409 if employee already responded", async () => {
    employeeFindUniqueMock.mockResolvedValue({ id: "emp-1", supervisorId: null, teamMemberships: [] });
    occurrenceFindUniqueMock.mockResolvedValue({
      id: "occ-001",
      isClosed: false,
      deadline: new Date(Date.now() + 86400000),
      survey: { isAnonymous: false },
    });
    audienceMemberFindUniqueMock.mockResolvedValue({ employeeId: "emp-1" });
    completionFindUniqueMock.mockResolvedValue({ employeeId: "emp-1" });

    const response = await request(app)
      .post(URL)
      .send({ answers: [{ questionId: "q-1", answerText: "yes" }] })
      .expect(409);

    expect(response.body).toMatchObject({
      success: false,
      message: "Already responded",
    });
  });

  it("returns 201 on a valid submission for a non-anonymous survey (response has employeeId)", async () => {
    employeeFindUniqueMock.mockResolvedValue({ id: "emp-1", supervisorId: "sup-1", teamMemberships: [{ teamId: "team-1" }] });
    occurrenceFindUniqueMock.mockResolvedValue({
      id: "occ-001",
      isClosed: false,
      deadline: new Date(Date.now() + 86400000),
      survey: {
        isAnonymous: false,
        questions: [
          { id: "q-1", type: "SHORT_ANSWER", isRequired: true, options: null, scaleMin: null, scaleMax: null },
        ],
      },
    });
    audienceMemberFindUniqueMock.mockResolvedValue({ employeeId: "emp-1" });
    completionFindUniqueMock.mockResolvedValue(null);

    const response = await request(app)
      .post(URL)
      .send({ answers: [{ questionId: "q-1", answerText: "yes" }] })
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      message: "Response submitted",
    });

    expect(responseCreateMock).toHaveBeenCalledWith({
      data: {
        occurrenceId: "occ-001",
        employeeId: "emp-1",
        respondentSupervisorId: "sup-1",
        respondentTeamIds: ["team-1"],
        answers: {
          create: [
            {
              questionId: "q-1",
              answerText: "yes",
            },
          ],
        },
      },
    });

    expect(completionCreateMock).toHaveBeenCalledWith({
      data: {
        occurrenceId: "occ-001",
        employeeId: "emp-1",
      },
    });
  });

  it("returns 201 on a valid submission for an anonymous survey (response has employeeId null)", async () => {
    employeeFindUniqueMock.mockResolvedValue({ id: "emp-1", supervisorId: "sup-1", teamMemberships: [{ teamId: "team-1" }] });
    occurrenceFindUniqueMock.mockResolvedValue({
      id: "occ-001",
      isClosed: false,
      deadline: new Date(Date.now() + 86400000),
      survey: {
        isAnonymous: true,
        questions: [
          { id: "q-1", type: "SHORT_ANSWER", isRequired: true, options: null, scaleMin: null, scaleMax: null },
        ],
      },
    });
    audienceMemberFindUniqueMock.mockResolvedValue({ employeeId: "emp-1" });
    completionFindUniqueMock.mockResolvedValue(null);

    const response = await request(app)
      .post(URL)
      .send({ answers: [{ questionId: "q-1", answerText: "yes" }] })
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      message: "Response submitted",
    });

    expect(responseCreateMock).toHaveBeenCalledWith({
      data: {
        occurrenceId: "occ-001",
        employeeId: null,
        respondentSupervisorId: "sup-1",
        respondentTeamIds: ["team-1"],
        answers: {
          create: [
            {
              questionId: "q-1",
              answerText: "yes",
            },
          ],
        },
      },
    });

    expect(completionCreateMock).toHaveBeenCalledWith({
      data: {
        occurrenceId: "occ-001",
        employeeId: "emp-1",
      },
    });
  });

  it("returns 400 when answering a question that is not on the survey", async () => {
    employeeFindUniqueMock.mockResolvedValue({ id: "emp-1", supervisorId: "sup-1", teamMemberships: [] });
    occurrenceFindUniqueMock.mockResolvedValue({
      id: "occ-001",
      isClosed: false,
      deadline: new Date(Date.now() + 86400000),
      survey: {
        isAnonymous: false,
        questions: [
          { id: "q-1", type: "SHORT_ANSWER", isRequired: true, options: null, scaleMin: null, scaleMax: null },
        ],
      },
    });
    audienceMemberFindUniqueMock.mockResolvedValue({ employeeId: "emp-1" });
    completionFindUniqueMock.mockResolvedValue(null);

    const response = await request(app)
      .post(URL)
      .send({ answers: [{ questionId: "ghost", answerText: "hi" }] })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it("returns 400 when a required question is left unanswered", async () => {
    employeeFindUniqueMock.mockResolvedValue({ id: "emp-1", supervisorId: "sup-1", teamMemberships: [] });
    occurrenceFindUniqueMock.mockResolvedValue({
      id: "occ-001",
      isClosed: false,
      deadline: new Date(Date.now() + 86400000),
      survey: {
        isAnonymous: false,
        questions: [
          { id: "q-1", type: "SHORT_ANSWER", isRequired: true, options: null, scaleMin: null, scaleMax: null },
          { id: "q-2", type: "SHORT_ANSWER", isRequired: false, options: null, scaleMin: null, scaleMax: null },
        ],
      },
    });
    audienceMemberFindUniqueMock.mockResolvedValue({ employeeId: "emp-1" });
    completionFindUniqueMock.mockResolvedValue(null);

    const response = await request(app)
      .post(URL)
      .send({ answers: [{ questionId: "q-2", answerText: "optional only" }] })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it("returns 400 for a linear-scale answer outside the question's range", async () => {
    employeeFindUniqueMock.mockResolvedValue({ id: "emp-1", supervisorId: "sup-1", teamMemberships: [] });
    occurrenceFindUniqueMock.mockResolvedValue({
      id: "occ-001",
      isClosed: false,
      deadline: new Date(Date.now() + 86400000),
      survey: {
        isAnonymous: false,
        questions: [
          { id: "q-1", type: "LINEAR_SCALE", isRequired: true, options: null, scaleMin: 1, scaleMax: 5 },
        ],
      },
    });
    audienceMemberFindUniqueMock.mockResolvedValue({ employeeId: "emp-1" });
    completionFindUniqueMock.mockResolvedValue(null);

    const response = await request(app)
      .post(URL)
      .send({ answers: [{ questionId: "q-1", answerData: 9 }] })
      .expect(400);

    expect(response.body.success).toBe(false);
  });
});
