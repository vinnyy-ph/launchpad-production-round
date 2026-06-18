import request from "supertest";
import { app } from "../../app";
import {
  buildHrEmployee,
  buildSurveyRecord,
  employeeFindUniqueMock,
  resetSurveyMocks,
  surveyTransactionMock,
  VALID_BODY,
} from "./surveys-test.helpers";

jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: jest.fn((req: any, _res: unknown, next: () => void) => {
    req.user = { id: "test-hr-user-id", role: "HR" };
    next();
  }),
}));

jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    employee: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}));

const URL = "/api/v1/pulse/surveys";

describe("POST /api/v1/pulse/surveys", () => {
  beforeEach(() => {
    resetSurveyMocks();
  });

  // ─── Auth & Role ───────────────────────────────────────────────────────────

  it("returns 401 when not authenticated", async () => {
    const authMock = jest.requireMock("../../core/middleware/auth.middleware");
    (authMock.authenticate as jest.Mock).mockImplementationOnce(
      (_req: unknown, _res: unknown, next: () => void) => next(),
    );

    await request(app).post(URL).send(VALID_BODY).expect(401);
  });

  it("returns 403 when the user is not HR role", async () => {
    const authMock = jest.requireMock("../../core/middleware/auth.middleware");
    (authMock.authenticate as jest.Mock).mockImplementationOnce(
      (req: any, _res: unknown, next: () => void) => {
        req.user = { id: "test-employee-user-id", role: "EMPLOYEE" };
        next();
      },
    );

    const response = await request(app).post(URL).send(VALID_BODY).expect(403);
    expect(response.body).toMatchObject({ success: false });
  });

  // ─── Validation ───────────────────────────────────────────────────────────

  it("returns 400 when request body is missing", async () => {
    const response = await request(app).post(URL).expect(400);
    expect(response.body).toMatchObject({ success: false, errorCode: "VALIDATION_FAILED" });
  });

  it("returns 400 when name is missing", async () => {
    const response = await request(app)
      .post(URL)
      .send({ questions: [{ type: "SHORT_ANSWER", questionText: "Q?", orderIndex: 1 }] })
      .expect(400);

    expect(response.body.errors[0].message).toBe("name is required");
    expect(surveyTransactionMock).not.toHaveBeenCalled();
  });

  it("returns 400 when questions array is missing", async () => {
    const response = await request(app)
      .post(URL)
      .send({ name: "Survey Without Questions", deadline: "2026-06-19T00:00:00.000Z" })
      .expect(400);

    expect(response.body.errors[0].message).toMatch(/questions must be a non-empty array/);
    expect(surveyTransactionMock).not.toHaveBeenCalled();
  });

  it("returns 400 when questions array is empty", async () => {
    const response = await request(app)
      .post(URL)
      .send({ name: "Empty Survey", questions: [], deadline: "2026-06-19T00:00:00.000Z" })
      .expect(400);

    expect(response.body.errors[0].message).toMatch(/questions must be a non-empty array/);
  });

  it("returns 400 when a LINEAR_SCALE question is missing scaleMin/Max", async () => {
    const response = await request(app)
      .post(URL)
      .send({
        name: "Bad Scale Survey",
        deadline: "2026-06-19T00:00:00.000Z",
        questions: [{ type: "LINEAR_SCALE", questionText: "Rate me", orderIndex: 1 }],
      })
      .expect(400);

    expect(response.body.errors[0].message).toMatch(/scaleMin and scaleMax/);
  });

  it("returns 400 when a MULTIPLE_CHOICE question is missing options", async () => {
    const response = await request(app)
      .post(URL)
      .send({
        name: "Bad Choice Survey",
        deadline: "2026-06-19T00:00:00.000Z",
        questions: [{ type: "MULTIPLE_CHOICE", questionText: "Pick one", orderIndex: 1 }],
      })
      .expect(400);

    expect(response.body.errors[0].message).toMatch(/options/);
  });

  it("returns 400 when a CHECKBOX question is missing options", async () => {
    const response = await request(app)
      .post(URL)
      .send({
        name: "Bad Checkbox Survey",
        deadline: "2026-06-19T00:00:00.000Z",
        questions: [{ type: "CHECKBOX", questionText: "Select all", orderIndex: 1 }],
      })
      .expect(400);

    expect(response.body.errors[0].message).toMatch(/options/);
  });

  it("returns 400 when recurringType is an invalid enum value", async () => {
    const response = await request(app)
      .post(URL)
      .send({ ...VALID_BODY, recurringType: "DAILY" })
      .expect(400);

    expect(response.body.errors[0].message).toMatch(/Invalid recurringType/);
  });

  it("returns 400 when audienceType is an invalid enum value", async () => {
    const response = await request(app)
      .post(URL)
      .send({ ...VALID_BODY, audienceType: "DEPARTMENT" })
      .expect(400);

    expect(response.body.errors[0].message).toMatch(/Invalid audienceType/);
  });

  it("returns 400 when visibility is an invalid enum value", async () => {
    const response = await request(app)
      .post(URL)
      .send({ ...VALID_BODY, visibility: "PRIVATE" })
      .expect(400);

    expect(response.body.errors[0].message).toMatch(/Invalid visibility/);
  });

  it("returns 400 when an audienceConfig entry has neither supervisorId nor teamId", async () => {
    const response = await request(app)
      .post(URL)
      .send({
        ...VALID_BODY,
        audienceType: "SUPERVISOR_BASED",
        audienceConfigs: [{}],
      })
      .expect(400);

    expect(response.body.errors[0].message).toMatch(/supervisorId or teamId/);
  });

  it("returns 400 when isAnonymous is not a boolean", async () => {
    const response = await request(app)
      .post(URL)
      .send({ ...VALID_BODY, isAnonymous: "yes" })
      .expect(400);

    expect(response.body.errors[0].message).toBe("isAnonymous must be a boolean");
  });

  it("returns 400 when isActive is not a boolean", async () => {
    const response = await request(app)
      .post(URL)
      .send({ ...VALID_BODY, isActive: 1 })
      .expect(400);

    expect(response.body.errors[0].message).toBe("isActive must be a boolean");
  });

  // ─── Business Logic Errors ─────────────────────────────────────────────────

  it("returns 403 when the HR user has no linked employee record", async () => {
    employeeFindUniqueMock.mockResolvedValue(null);

    const response = await request(app).post(URL).send(VALID_BODY).expect(403);

    expect(response.body).toMatchObject({ success: false, errorCode: "CREATOR_NOT_EMPLOYEE" });
    expect(surveyTransactionMock).not.toHaveBeenCalled();
  });

  // ─── Happy Paths ──────────────────────────────────────────────────────────

  it("creates a draft survey with defaults and returns 201", async () => {
    const hr = buildHrEmployee();
    const survey = buildSurveyRecord({ createdBy: hr.id });

    employeeFindUniqueMock.mockResolvedValue(hr);
    surveyTransactionMock.mockImplementation(async (fn: Function) => fn({
      pulseSurvey: {
        create: jest.fn().mockResolvedValue({ id: survey.id }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(survey),
      },
      surveyQuestion: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      surveyAudienceConfig: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
      surveyReminderConfig: { create: jest.fn() },
    }));

    const response = await request(app).post(URL).send(VALID_BODY).expect(201);

    expect(response.body).toMatchObject({
      success: true,
      message: "Pulse survey created successfully",
      data: {
        id: survey.id,
        createdBy: hr.id,
        name: survey.name,
        recurringType: "ONE_TIME",
        audienceType: "EVERYONE",
        isAnonymous: false,
        isActive: false,
        visibility: "EVERYONE",
      },
    });
    expect(response.body.data.questions).toHaveLength(1);
    expect(response.body.data.audienceConfigs).toHaveLength(0);
    expect(response.body.data.reminderConfig).toBeNull();
  });

  it("creates an active survey when isActive=true is provided", async () => {
    const hr = buildHrEmployee();
    const survey = buildSurveyRecord({ createdBy: hr.id, isActive: true });

    employeeFindUniqueMock.mockResolvedValue(hr);
    surveyTransactionMock.mockImplementation(async (fn: Function) => fn({
      pulseSurvey: {
        create: jest.fn().mockResolvedValue({ id: survey.id }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(survey),
      },
      surveyQuestion: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      surveyAudienceConfig: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
      surveyReminderConfig: { create: jest.fn() },
    }));

    const response = await request(app)
      .post(URL)
      .send({ ...VALID_BODY, isActive: true })
      .expect(201);

    expect(response.body.data.isActive).toBe(true);
  });

  it("creates an anonymous survey correctly", async () => {
    const hr = buildHrEmployee();
    const survey = buildSurveyRecord({ createdBy: hr.id, isAnonymous: true });

    employeeFindUniqueMock.mockResolvedValue(hr);
    surveyTransactionMock.mockImplementation(async (fn: Function) => fn({
      pulseSurvey: {
        create: jest.fn().mockResolvedValue({ id: survey.id }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(survey),
      },
      surveyQuestion: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      surveyAudienceConfig: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
      surveyReminderConfig: { create: jest.fn() },
    }));

    const response = await request(app)
      .post(URL)
      .send({ ...VALID_BODY, isAnonymous: true })
      .expect(201);

    expect(response.body.data.isAnonymous).toBe(true);
  });

  it("creates a survey with a LINEAR_SCALE question correctly", async () => {
    const hr = buildHrEmployee();
    const scaleQuestion = {
      type: "LINEAR_SCALE",
      questionText: "Rate your workload",
      scaleMin: 1,
      scaleMax: 5,
      scaleMinLabel: "Light",
      scaleMaxLabel: "Heavy",
      orderIndex: 1,
    };
    const survey = {
      ...buildSurveyRecord({ createdBy: hr.id }),
      questions: [
        {
          id: "q-scale-001",
          surveyId: "survey-001",
          ...scaleQuestion,
          isRequired: true,
          options: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
    };

    employeeFindUniqueMock.mockResolvedValue(hr);
    surveyTransactionMock.mockImplementation(async (fn: Function) => fn({
      pulseSurvey: {
        create: jest.fn().mockResolvedValue({ id: survey.id }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(survey),
      },
      surveyQuestion: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      surveyAudienceConfig: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
      surveyReminderConfig: { create: jest.fn() },
    }));

    const response = await request(app)
      .post(URL)
      .send({ name: "Scale Survey", deadline: "2026-06-19T00:00:00.000Z", questions: [scaleQuestion] })
      .expect(201);

    expect(response.body.data.questions[0]).toMatchObject({
      type: "LINEAR_SCALE",
      scaleMin: 1,
      scaleMax: 5,
      scaleMinLabel: "Light",
      scaleMaxLabel: "Heavy",
    });
  });

  it("silently ignores audienceConfigs when audienceType=EVERYONE", async () => {
    const hr = buildHrEmployee();
    const survey = buildSurveyRecord({ createdBy: hr.id });

    const txMock = {
      pulseSurvey: {
        create: jest.fn().mockResolvedValue({ id: survey.id }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(survey),
      },
      surveyQuestion: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      surveyAudienceConfig: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
      surveyReminderConfig: { create: jest.fn() },
    };

    employeeFindUniqueMock.mockResolvedValue(hr);
    surveyTransactionMock.mockImplementation(async (fn: Function) => fn(txMock));

    await request(app)
      .post(URL)
      .send({
        ...VALID_BODY,
        audienceType: "EVERYONE",
        audienceConfigs: [{ supervisorId: "sup-001" }],
      })
      .expect(201);

    // createMany for audienceConfigs should have been called with an empty array
    const createManyCalls = txMock.surveyAudienceConfig.createMany.mock.calls;
    if (createManyCalls.length > 0) {
      expect(createManyCalls[0][0].data).toHaveLength(0);
    }
  });

  it("creates a survey with a reminderConfig", async () => {
    const hr = buildHrEmployee();
    const reminderConfig = {
      id: "rc-001",
      surveyId: "survey-001",
      frequency: "WEEKLY" as const,
      everyXDays: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    const survey = { ...buildSurveyRecord({ createdBy: hr.id }), reminderConfig };

    employeeFindUniqueMock.mockResolvedValue(hr);
    surveyTransactionMock.mockImplementation(async (fn: Function) => fn({
      pulseSurvey: {
        create: jest.fn().mockResolvedValue({ id: survey.id }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(survey),
      },
      surveyQuestion: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      surveyAudienceConfig: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
      surveyReminderConfig: { create: jest.fn().mockResolvedValue(reminderConfig) },
    }));

    const response = await request(app)
      .post(URL)
      .send({ ...VALID_BODY, reminderConfig: { frequency: "WEEKLY" } })
      .expect(201);

    expect(response.body.data.reminderConfig).toMatchObject({ frequency: "WEEKLY" });
  });

  it("returns 400 when reminderConfig.frequency=EVERY_X_DAYS is missing everyXDays", async () => {
    const response = await request(app)
      .post(URL)
      .send({ ...VALID_BODY, reminderConfig: { frequency: "EVERY_X_DAYS" } })
      .expect(400);

    expect(response.body.errors[0].message).toMatch(/everyXDays/);
  });
});
