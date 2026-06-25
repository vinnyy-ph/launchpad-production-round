import { AiQuestionsController } from "./ai-questions.controller";
import { SurveysValidation } from "../surveys.validation";
import { SURVEY_ERROR_MESSAGES } from "../surveys.constants";
import { HTTP_STATUS_CODES } from "../../../../core/globals";
import type { GeneratedQuestion } from "./ai-questions.types";

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const QUESTIONS: GeneratedQuestion[] = [
  { type: "SHORT_ANSWER", questionText: "What's going well?", isRequired: true },
];

function makeController(serviceGenerate: jest.Mock) {
  const service = { generate: serviceGenerate } as any;
  return new AiQuestionsController(service, new SurveysValidation());
}

describe("AiQuestionsController.generateQuestions", () => {
  const user = { id: "u1", role: "HR" };

  it("returns 200 with generated questions", async () => {
    const ctrl = makeController(jest.fn().mockResolvedValue(QUESTIONS));
    const res = mockRes();
    const next = jest.fn();
    await ctrl.generateQuestions({ user, body: { goal: "morale", count: 1 } } as any, res, next);
    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS_CODES.OK);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { questions: QUESTIONS } });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when unauthenticated", async () => {
    const ctrl = makeController(jest.fn());
    const res = mockRes();
    await ctrl.generateQuestions({ body: { goal: "x", count: 1 } } as any, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS_CODES.UNAUTHORIZED);
  });

  it("returns 400 for an invalid body (empty goal)", async () => {
    const ctrl = makeController(jest.fn());
    const res = mockRes();
    await ctrl.generateQuestions({ user, body: { goal: "  ", count: 1 } } as any, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS_CODES.BAD_REQUEST);
  });

  it("returns 400 for an out-of-range count", async () => {
    const ctrl = makeController(jest.fn());
    const res = mockRes();
    await ctrl.generateQuestions({ user, body: { goal: "x", count: 99 } } as any, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS_CODES.BAD_REQUEST);
  });

  it("maps AI_QUESTIONS_INVALID to 422", async () => {
    const ctrl = makeController(
      jest.fn().mockRejectedValue(new Error(SURVEY_ERROR_MESSAGES.AI_QUESTIONS_INVALID)),
    );
    const res = mockRes();
    await ctrl.generateQuestions({ user, body: { goal: "x", count: 1 } } as any, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY);
  });

  it("maps AI_UNAVAILABLE to 503", async () => {
    const ctrl = makeController(
      jest.fn().mockRejectedValue(new Error(SURVEY_ERROR_MESSAGES.AI_UNAVAILABLE)),
    );
    const res = mockRes();
    await ctrl.generateQuestions({ user, body: { goal: "x", count: 1 } } as any, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS_CODES.SERVICE_UNAVAILABLE);
  });
});
