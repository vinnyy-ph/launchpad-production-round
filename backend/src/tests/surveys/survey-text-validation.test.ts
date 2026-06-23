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
const SCRIPT = "<script>alert(1)</script>";

describe("Survey text-field input validation", () => {
  beforeEach(() => {
    resetSurveyMocks();
  });

  // ─── Create: HTML/script rejection ──────────────────────────────────────────

  it("returns 400 when name contains a script tag", async () => {
    const response = await request(app)
      .post(URL)
      .send({ ...VALID_BODY, name: SCRIPT })
      .expect(400);

    expect(response.body).toMatchObject({ success: false, errorCode: "VALIDATION_FAILED" });
    expect(response.body.errors[0].message).toMatch(/must not contain HTML/);
    expect(surveyTransactionMock).not.toHaveBeenCalled();
  });

  it("returns 400 when a question's questionText contains an img/onerror payload", async () => {
    const response = await request(app)
      .post(URL)
      .send({
        ...VALID_BODY,
        questions: [
          { type: "SHORT_ANSWER", questionText: '<img src=x onerror=alert(1)>', orderIndex: 1 },
        ],
      })
      .expect(400);

    expect(response.body.errors[0].message).toMatch(/must not contain HTML/);
    expect(surveyTransactionMock).not.toHaveBeenCalled();
  });

  it("returns 400 when a multiple-choice option contains a script tag", async () => {
    const response = await request(app)
      .post(URL)
      .send({
        ...VALID_BODY,
        questions: [
          {
            type: "MULTIPLE_CHOICE",
            questionText: "Pick one",
            orderIndex: 1,
            options: ["Fine", SCRIPT],
          },
        ],
      })
      .expect(400);

    expect(response.body.errors[0].message).toMatch(/must not contain HTML/);
    expect(surveyTransactionMock).not.toHaveBeenCalled();
  });

  it("returns 400 when an option is not a string", async () => {
    const response = await request(app)
      .post(URL)
      .send({
        ...VALID_BODY,
        questions: [
          { type: "MULTIPLE_CHOICE", questionText: "Pick one", orderIndex: 1, options: ["Fine", 42] },
        ],
      })
      .expect(400);

    expect(response.body).toMatchObject({ success: false, errorCode: "VALIDATION_FAILED" });
    expect(surveyTransactionMock).not.toHaveBeenCalled();
  });

  it("returns 400 when scaleMinLabel contains a script tag", async () => {
    const response = await request(app)
      .post(URL)
      .send({
        ...VALID_BODY,
        questions: [
          {
            type: "LINEAR_SCALE",
            questionText: "Rate it",
            orderIndex: 1,
            scaleMin: 1,
            scaleMax: 5,
            scaleMinLabel: SCRIPT,
          },
        ],
      })
      .expect(400);

    expect(response.body.errors[0].message).toMatch(/must not contain HTML/);
    expect(surveyTransactionMock).not.toHaveBeenCalled();
  });

  // ─── Create: length caps ────────────────────────────────────────────────────

  it("returns 400 when name exceeds the max length", async () => {
    const response = await request(app)
      .post(URL)
      .send({ ...VALID_BODY, name: "x".repeat(201) })
      .expect(400);

    expect(response.body.errors[0].message).toMatch(/200 characters or fewer/);
    expect(surveyTransactionMock).not.toHaveBeenCalled();
  });

  it("returns 400 when questionText exceeds the max length", async () => {
    const response = await request(app)
      .post(URL)
      .send({
        ...VALID_BODY,
        questions: [{ type: "SHORT_ANSWER", questionText: "x".repeat(501), orderIndex: 1 }],
      })
      .expect(400);

    expect(response.body.errors[0].message).toMatch(/500 characters or fewer/);
    expect(surveyTransactionMock).not.toHaveBeenCalled();
  });

  // ─── Create: benign content still succeeds ──────────────────────────────────

  it("accepts benign comparison characters in the name and creates the survey", async () => {
    const hr = buildHrEmployee();
    const survey = buildSurveyRecord({ createdBy: hr.id });

    employeeFindUniqueMock.mockResolvedValue(hr);
    surveyTransactionMock.mockImplementation(async (fn: Function) =>
      fn({
        pulseSurvey: {
          create: jest.fn().mockResolvedValue({ id: survey.id }),
          findUniqueOrThrow: jest.fn().mockResolvedValue(survey),
        },
        surveyQuestion: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
        surveyAudienceConfig: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
        surveyReminderConfig: { create: jest.fn() },
      }),
    );

    const response = await request(app)
      .post(URL)
      .send({ ...VALID_BODY, name: "Team A < Team B retro 5 > 3" })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(surveyTransactionMock).toHaveBeenCalled();
  });

  // ─── Update: HTML/script rejection ──────────────────────────────────────────

  it("returns 400 when an update sets a name containing a script tag", async () => {
    const response = await request(app)
      .patch(`${URL}/survey-001`)
      .send({ name: SCRIPT })
      .expect(400);

    expect(response.body.errors[0].message).toMatch(/must not contain HTML/);
  });
});
