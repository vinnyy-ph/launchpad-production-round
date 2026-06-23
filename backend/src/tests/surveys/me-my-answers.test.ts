import { MeService } from "../../modules/performance/surveys/me/me.service";
import type { MeRepository } from "../../modules/performance/surveys/me/me.repository";
import { SURVEY_ERROR_MESSAGES } from "../../modules/performance/surveys/surveys.constants";

// getMyAnswers takes an injected repository, so the real prisma is never touched here —
// stub the client module just to satisfy the transitive import.
jest.mock("../../core/database/prisma.service", () => ({ prisma: {} }));

// Avoid pulling the scheduler read-path side effect into this unit; getMyAnswers does not
// touch it, but the module-level import would otherwise hit prisma.
jest.mock("../../modules/performance/surveys/occurrences/occurrence-scheduler", () => ({
  advanceDueOccurrences: jest.fn(),
}));
jest.mock("../../modules/performance/evaluations/ack-reminders", () => ({
  sweepEvalAckReminders: jest.fn(),
}));

const questions = [
  {
    id: "q1",
    questionText: "How are you?",
    type: "SHORT_ANSWER",
    options: null,
    scaleMin: null,
    scaleMax: null,
    scaleMinLabel: null,
    scaleMaxLabel: null,
  },
  {
    id: "q2",
    questionText: "Rate the week",
    type: "LINEAR_SCALE",
    options: null,
    scaleMin: 1,
    scaleMax: 5,
    scaleMinLabel: "Low",
    scaleMaxLabel: "High",
  },
];

function makeRepo(over: Record<string, unknown> = {}) {
  return {
    findEmployeeIdByUserId: jest.fn().mockResolvedValue("emp-1"),
    findOccurrenceForMyAnswers: jest.fn().mockResolvedValue({
      surveyId: "s1",
      surveyName: "Q3 Pulse",
      occurrenceNumber: 1,
      isAnonymous: false,
      questions,
    }),
    hasCompleted: jest.fn().mockResolvedValue(true),
    isAudienceMember: jest.fn().mockResolvedValue(true),
    findMyAnswers: jest.fn().mockResolvedValue([
      { questionId: "q1", answerText: "Good", answerData: null },
      { questionId: "q2", answerText: null, answerData: 4 },
    ]),
    ...over,
  } as unknown as MeRepository;
}

describe("MeService.getMyAnswers", () => {
  it("returns the employee's answers joined to each question (non-anonymous)", async () => {
    const repo = makeRepo();
    const result = await new MeService(repo).getMyAnswers("user-1", "occ-1");

    expect(result.isAnonymous).toBe(false);
    expect(result.submitted).toBe(true);
    expect(result.surveyName).toBe("Q3 Pulse");
    expect(result.answers).toHaveLength(2);
    expect(result.answers[0]).toMatchObject({
      questionId: "q1",
      questionText: "How are you?",
      type: "SHORT_ANSWER",
      answerText: "Good",
      answerData: null,
    });
    expect(result.answers[1]).toMatchObject({ questionId: "q2", answerData: 4 });
    // identity comes from the session-resolved employee, never the caller
    expect((repo.findMyAnswers as jest.Mock)).toHaveBeenCalledWith("occ-1", "emp-1");
  });

  it("never returns content for an anonymous survey — returns the flag and no answers", async () => {
    const repo = makeRepo({
      findOccurrenceForMyAnswers: jest.fn().mockResolvedValue({
        surveyId: "s1",
        surveyName: "Anon Pulse",
        occurrenceNumber: 1,
        isAnonymous: true,
        questions,
      }),
    });
    const result = await new MeService(repo).getMyAnswers("user-1", "occ-1");

    expect(result.isAnonymous).toBe(true);
    expect(result.submitted).toBe(true);
    expect(result.answers).toEqual([]);
    expect((repo.findMyAnswers as jest.Mock)).not.toHaveBeenCalled();
  });

  it("404s when the occurrence does not exist", async () => {
    const repo = makeRepo({ findOccurrenceForMyAnswers: jest.fn().mockResolvedValue(null) });
    await expect(new MeService(repo).getMyAnswers("user-1", "missing")).rejects.toThrow(
      SURVEY_ERROR_MESSAGES.OCCURRENCE_NOT_FOUND,
    );
  });

  it("returns a clean no-submission result when in the audience but not yet completed", async () => {
    const repo = makeRepo({
      hasCompleted: jest.fn().mockResolvedValue(false),
      isAudienceMember: jest.fn().mockResolvedValue(true),
    });
    const result = await new MeService(repo).getMyAnswers("user-1", "occ-1");

    expect(result.submitted).toBe(false);
    expect(result.answers).toEqual([]);
    expect(result.surveyName).toBe("Q3 Pulse");
    expect((repo.findMyAnswers as jest.Mock)).not.toHaveBeenCalled();
  });

  it("404s when the caller never completed AND is not in the audience (no probing by id)", async () => {
    const repo = makeRepo({
      hasCompleted: jest.fn().mockResolvedValue(false),
      isAudienceMember: jest.fn().mockResolvedValue(false),
    });
    await expect(new MeService(repo).getMyAnswers("user-1", "occ-1")).rejects.toThrow(
      SURVEY_ERROR_MESSAGES.OCCURRENCE_NOT_FOUND,
    );
    expect((repo.findMyAnswers as jest.Mock)).not.toHaveBeenCalled();
  });

  it("403s (CREATOR_NOT_EMPLOYEE) when the user has no employee record", async () => {
    const repo = makeRepo({ findEmployeeIdByUserId: jest.fn().mockResolvedValue(null) });
    await expect(new MeService(repo).getMyAnswers("user-1", "occ-1")).rejects.toThrow(
      SURVEY_ERROR_MESSAGES.CREATOR_NOT_EMPLOYEE,
    );
  });
});
