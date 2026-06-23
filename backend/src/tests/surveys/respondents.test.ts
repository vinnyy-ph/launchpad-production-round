import { RespondentsService } from "../../modules/performance/surveys/respondents/respondents.service";
import type { RespondentsRepository } from "../../modules/performance/surveys/respondents/respondents.repository";
import type { MeRepository } from "../../modules/performance/surveys/me/me.repository";
import { prisma } from "../../core/database/prisma.service";
import { SURVEY_ERROR_MESSAGES } from "../../modules/performance/surveys/surveys.constants";

// resolveAuthority reads prisma.employee.findUnique and createOrgChains(prisma).downwardChain
// directly, so both are mocked. The repositories are injected, so the real prisma data layer
// is otherwise untouched.
jest.mock("../../core/database/prisma.service", () => ({
  prisma: { employee: { findUnique: jest.fn() } },
}));

const mockDownwardChain = jest.fn();
jest.mock("../../modules/shared/org/chains", () => ({
  createOrgChains: () => ({ downwardChain: mockDownwardChain }),
}));

// me.service (source of buildAnswerItems) transitively imports the scheduler read-path; stub it.
jest.mock("../../modules/performance/surveys/occurrences/occurrence-scheduler", () => ({
  advanceDueOccurrences: jest.fn(),
}));
jest.mock("../../modules/performance/evaluations/ack-reminders", () => ({
  sweepEvalAckReminders: jest.fn(),
}));

const findUnique = prisma.employee.findUnique as jest.Mock;

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
];

const NAMED_OCC = {
  surveyId: "s1",
  surveyName: "Q3 Pulse",
  occurrenceNumber: 1,
  isAnonymous: false,
  questions,
};
const ANON_OCC = { ...NAMED_OCC, surveyName: "Anon Pulse", isAnonymous: true };

const ROSTER = [
  { employeeId: "emp-2", name: "Bea Cruz", submitted: true },
  { employeeId: "emp-3", name: "Cy Dela", submitted: false },
];

function makeRespRepo(over: Record<string, unknown> = {}) {
  return {
    findRoster: jest.fn().mockResolvedValue(ROSTER),
    findEmployeeName: jest.fn().mockResolvedValue("Bea Cruz"),
    findResponseSubmittedAt: jest.fn().mockResolvedValue(new Date("2026-06-20T10:00:00.000Z")),
    ...over,
  } as unknown as RespondentsRepository;
}

function makeMeRepo(over: Record<string, unknown> = {}) {
  return {
    findOccurrenceForMyAnswers: jest.fn().mockResolvedValue(NAMED_OCC),
    hasCompleted: jest.fn().mockResolvedValue(true),
    isAudienceMember: jest.fn().mockResolvedValue(true),
    findMyAnswers: jest
      .fn()
      .mockResolvedValue([{ questionId: "q1", answerText: "Good", answerData: null }]),
    ...over,
  } as unknown as MeRepository;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("RespondentsService.getRoster", () => {
  it("HR sees the whole audience roster", async () => {
    const svc = new RespondentsService(makeRespRepo(), makeMeRepo());
    const result = await svc.getRoster("hr-user", "HR", "occ-1");

    expect(result.respondents).toHaveLength(2);
    expect(result.isAnonymous).toBe(false);
    expect(findUnique).not.toHaveBeenCalled(); // HR bypasses the employee lookup
  });

  it("a supervisor sees only audience members within their downward chain", async () => {
    findUnique.mockResolvedValue({ id: "sup-1", supervisorId: "boss" });
    mockDownwardChain.mockResolvedValue(["emp-2"]); // emp-3 is outside the chain

    const svc = new RespondentsService(makeRespRepo(), makeMeRepo());
    const result = await svc.getRoster("sup-user", "EMPLOYEE", "occ-1");

    expect(result.respondents.map((r) => r.employeeId)).toEqual(["emp-2"]);
  });

  it("the org root sees the whole audience roster", async () => {
    findUnique.mockResolvedValue({ id: "root-1", supervisorId: null });

    const svc = new RespondentsService(makeRespRepo(), makeMeRepo());
    const result = await svc.getRoster("root-user", "EMPLOYEE", "occ-1");

    expect(result.respondents).toHaveLength(2);
    expect(mockDownwardChain).not.toHaveBeenCalled();
  });

  it("a peer (no reports) gets an empty roster", async () => {
    findUnique.mockResolvedValue({ id: "peer-1", supervisorId: "boss" });
    mockDownwardChain.mockResolvedValue([]);

    const svc = new RespondentsService(makeRespRepo(), makeMeRepo());
    const result = await svc.getRoster("peer-user", "EMPLOYEE", "occ-1");

    expect(result.respondents).toEqual([]);
  });

  it("returns an empty roster for an anonymous survey, for any role (named-only)", async () => {
    const repo = makeRespRepo();
    const svc = new RespondentsService(
      repo,
      makeMeRepo({ findOccurrenceForMyAnswers: jest.fn().mockResolvedValue(ANON_OCC) }),
    );
    const result = await svc.getRoster("hr-user", "HR", "occ-1");

    expect(result.respondents).toEqual([]);
    expect((repo.findRoster as jest.Mock)).not.toHaveBeenCalled();
  });

  it("404s when the occurrence does not exist", async () => {
    const svc = new RespondentsService(
      makeRespRepo(),
      makeMeRepo({ findOccurrenceForMyAnswers: jest.fn().mockResolvedValue(null) }),
    );
    await expect(svc.getRoster("hr-user", "HR", "missing")).rejects.toThrow(
      SURVEY_ERROR_MESSAGES.OCCURRENCE_NOT_FOUND,
    );
  });
});

describe("RespondentsService.getIndividualAnswers", () => {
  it("HR can view any audience member's answers", async () => {
    const svc = new RespondentsService(makeRespRepo(), makeMeRepo());
    const result = await svc.getIndividualAnswers("hr-user", "HR", "occ-1", "emp-2");

    expect(result.submitted).toBe(true);
    expect(result.respondent).toEqual({ employeeId: "emp-2", name: "Bea Cruz" });
    expect(result.answers).toHaveLength(1);
    expect(result.submittedAt).toBe("2026-06-20T10:00:00.000Z");
  });

  it("a supervisor can view a report within their downward chain", async () => {
    findUnique.mockResolvedValue({ id: "sup-1", supervisorId: "boss" });
    mockDownwardChain.mockResolvedValue(["emp-2"]);

    const svc = new RespondentsService(makeRespRepo(), makeMeRepo());
    const result = await svc.getIndividualAnswers("sup-user", "EMPLOYEE", "occ-1", "emp-2");

    expect(result.submitted).toBe(true);
    expect(result.answers).toHaveLength(1);
  });

  it("DENIES a supervisor viewing someone outside their downward chain (server-side)", async () => {
    findUnique.mockResolvedValue({ id: "sup-1", supervisorId: "boss" });
    mockDownwardChain.mockResolvedValue(["emp-2"]);
    const meRepo = makeMeRepo();

    const svc = new RespondentsService(makeRespRepo(), meRepo);
    await expect(
      svc.getIndividualAnswers("sup-user", "EMPLOYEE", "occ-1", "emp-99"),
    ).rejects.toThrow(SURVEY_ERROR_MESSAGES.RESULTS_FORBIDDEN);
    expect((meRepo.findMyAnswers as jest.Mock)).not.toHaveBeenCalled();
  });

  it("DENIES every role on an anonymous survey — even HR", async () => {
    const meRepo = makeMeRepo({
      findOccurrenceForMyAnswers: jest.fn().mockResolvedValue(ANON_OCC),
    });
    const svc = new RespondentsService(makeRespRepo(), meRepo);
    await expect(
      svc.getIndividualAnswers("hr-user", "HR", "occ-1", "emp-2"),
    ).rejects.toThrow(SURVEY_ERROR_MESSAGES.RESULTS_FORBIDDEN);
    expect((meRepo.findMyAnswers as jest.Mock)).not.toHaveBeenCalled();
  });

  it("DENIES a peer (no reports)", async () => {
    findUnique.mockResolvedValue({ id: "peer-1", supervisorId: "boss" });
    mockDownwardChain.mockResolvedValue([]);

    const svc = new RespondentsService(makeRespRepo(), makeMeRepo());
    await expect(
      svc.getIndividualAnswers("peer-user", "EMPLOYEE", "occ-1", "emp-2"),
    ).rejects.toThrow(SURVEY_ERROR_MESSAGES.RESULTS_FORBIDDEN);
  });

  it("returns a clean no-submission when the target is in the audience but hasn't responded", async () => {
    const meRepo = makeMeRepo({
      hasCompleted: jest.fn().mockResolvedValue(false),
      isAudienceMember: jest.fn().mockResolvedValue(true),
    });
    const svc = new RespondentsService(makeRespRepo(), meRepo);
    const result = await svc.getIndividualAnswers("hr-user", "HR", "occ-1", "emp-3");

    expect(result.submitted).toBe(false);
    expect(result.answers).toEqual([]);
    expect(result.submittedAt).toBeNull();
    expect((meRepo.findMyAnswers as jest.Mock)).not.toHaveBeenCalled();
  });

  it("404s when the target never completed AND is not in the audience (no probing by id)", async () => {
    const meRepo = makeMeRepo({
      hasCompleted: jest.fn().mockResolvedValue(false),
      isAudienceMember: jest.fn().mockResolvedValue(false),
    });
    const svc = new RespondentsService(makeRespRepo(), meRepo);
    await expect(
      svc.getIndividualAnswers("hr-user", "HR", "occ-1", "ghost"),
    ).rejects.toThrow(SURVEY_ERROR_MESSAGES.OCCURRENCE_NOT_FOUND);
  });

  it("404s when the occurrence does not exist", async () => {
    const svc = new RespondentsService(
      makeRespRepo(),
      makeMeRepo({ findOccurrenceForMyAnswers: jest.fn().mockResolvedValue(null) }),
    );
    await expect(
      svc.getIndividualAnswers("hr-user", "HR", "missing", "emp-2"),
    ).rejects.toThrow(SURVEY_ERROR_MESSAGES.OCCURRENCE_NOT_FOUND);
  });
});
