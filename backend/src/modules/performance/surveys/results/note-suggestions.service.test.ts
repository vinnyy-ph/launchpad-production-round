import { NoteSuggestionsService, type NoteSuggestionGeneratorPort } from "./note-suggestions.service";
import { SURVEY_ERROR_MESSAGES } from "../surveys.constants";

jest.mock("../../../../core/database/prisma.service", () => ({
  prisma: { pulseSurvey: { findFirst: jest.fn() } },
}));
import { prisma } from "../../../../core/database/prisma.service";

const surveyMock = prisma.pulseSurvey.findFirst as jest.Mock;

const ANON_SURVEY = { id: "sv1", name: "Team Pulse", isAnonymous: true };
const OCCURRENCE = { id: "occ1", surveyId: "sv1" };
const SMALL_TEAM = {
  id: "t1",
  name: "Duo Pod",
  leaderId: "leader1",
  leader: { id: "leader1", firstName: "Lee", lastName: "Dre" },
  _count: { members: 2 },
};

// getResults output the service feeds into the aggregate. Anonymous → open text is already
// dropped to responses:[] upstream; the aggregate must still never emit individual text.
const AGGREGATE_RESULTS = {
  success: true as const,
  data: {
    surveyId: "sv1",
    isAnonymous: true,
    surveyName: "Team Pulse",
    deadline: "2026-01-01T00:00:00.000Z",
    isActive: false,
    occurrenceCount: 1,
    totalResponses: 2,
    recipientCount: 2,
    respondedCount: 2,
    filter: { teamId: "t1" },
    suppressed: false,
    questions: [
      {
        questionId: "q1",
        type: "LINEAR_SCALE" as const,
        questionText: "How is your workload?",
        responseCount: 2,
        average: 3.5,
        min: 3,
        max: 4,
        distribution: { "3": 1, "4": 1 },
      },
      {
        questionId: "q2",
        type: "LONG_ANSWER" as const,
        questionText: "Anything else?",
        responseCount: 2,
        responses: [],
      },
    ],
  },
};

function makeRepo(over: Record<string, unknown> = {}) {
  return {
    findOccurrence: jest.fn().mockResolvedValue(OCCURRENCE),
    findLatestOccurrence: jest.fn().mockResolvedValue(OCCURRENCE),
    findTeamForShare: jest.fn().mockResolvedValue(SMALL_TEAM),
    ...over,
  } as any;
}

function makeResultsService() {
  return { getResults: jest.fn().mockResolvedValue(AGGREGATE_RESULTS) } as any;
}

class FakeGenerator implements NoteSuggestionGeneratorPort {
  readonly model = "gpt-4o-mini";
  calls = 0;
  lastInput: Parameters<NoteSuggestionGeneratorPort["generate"]>[0] | null = null;
  constructor(private out: string[] | Error = ["A factual note.", "A warm note.", "An action note."]) {}
  async generate(input: Parameters<NoteSuggestionGeneratorPort["generate"]>[0]) {
    this.calls += 1;
    this.lastInput = input;
    if (this.out instanceof Error) throw this.out;
    return this.out;
  }
}

const ARGS = {
  surveyId: "sv1",
  occurrenceIdParam: null as string | null,
  teamId: "t1",
  userId: "hr-user",
  role: "HR",
};

describe("NoteSuggestionsService.suggest", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    surveyMock.mockResolvedValue(ANON_SURVEY);
  });

  it("throws SURVEY_NOT_FOUND and never calls the model", async () => {
    surveyMock.mockResolvedValue(null);
    const gen = new FakeGenerator();
    await expect(
      new NoteSuggestionsService(makeRepo(), makeResultsService(), gen).suggest(ARGS),
    ).rejects.toThrow(SURVEY_ERROR_MESSAGES.SURVEY_NOT_FOUND);
    expect(gen.calls).toBe(0);
  });

  it("rejects a non-anonymous survey, no model call", async () => {
    surveyMock.mockResolvedValue({ ...ANON_SURVEY, isAnonymous: false });
    const gen = new FakeGenerator();
    await expect(
      new NoteSuggestionsService(makeRepo(), makeResultsService(), gen).suggest(ARGS),
    ).rejects.toThrow(SURVEY_ERROR_MESSAGES.SHARE_NOT_ANONYMOUS);
    expect(gen.calls).toBe(0);
  });

  it("throws OCCURRENCE_NOT_FOUND when the latest occurrence is missing", async () => {
    const repo = makeRepo({ findLatestOccurrence: jest.fn().mockResolvedValue(null) });
    const gen = new FakeGenerator();
    await expect(
      new NoteSuggestionsService(repo, makeResultsService(), gen).suggest(ARGS),
    ).rejects.toThrow(SURVEY_ERROR_MESSAGES.OCCURRENCE_NOT_FOUND);
    expect(gen.calls).toBe(0);
  });

  it("rejects a team that is not small (>= 3 members), no model call", async () => {
    const repo = makeRepo({
      findTeamForShare: jest.fn().mockResolvedValue({ ...SMALL_TEAM, _count: { members: 4 } }),
    });
    const gen = new FakeGenerator();
    await expect(
      new NoteSuggestionsService(repo, makeResultsService(), gen).suggest(ARGS),
    ).rejects.toThrow(SURVEY_ERROR_MESSAGES.SHARE_NOT_SMALL_TEAM);
    expect(gen.calls).toBe(0);
  });

  it("rejects a team with no resolvable supervisor, no model call", async () => {
    const repo = makeRepo({
      findTeamForShare: jest.fn().mockResolvedValue({ ...SMALL_TEAM, leaderId: null, leader: null }),
    });
    const gen = new FakeGenerator();
    await expect(
      new NoteSuggestionsService(repo, makeResultsService(), gen).suggest(ARGS),
    ).rejects.toThrow(SURVEY_ERROR_MESSAGES.SHARE_NO_SUPERVISOR);
    expect(gen.calls).toBe(0);
  });

  it("returns the model's suggestions and feeds an identity-free aggregate (open text withheld)", async () => {
    const gen = new FakeGenerator();
    const out = await new NoteSuggestionsService(makeRepo(), makeResultsService(), gen).suggest(ARGS);

    expect(out).toEqual({
      success: true,
      data: { suggestions: ["A factual note.", "A warm note.", "An action note."] },
    });
    expect(gen.calls).toBe(1);
    // The aggregate summarises the scale question but never emits open-text content.
    expect(gen.lastInput?.aggregate).toContain("average 3.5");
    expect(gen.lastInput?.aggregate).toContain("individual text withheld for anonymity");
    expect(gen.lastInput?.respondedCount).toBe(2);
  });

  it("maps a model error to AI_UNAVAILABLE", async () => {
    const gen = new FakeGenerator(new Error("openai down"));
    await expect(
      new NoteSuggestionsService(makeRepo(), makeResultsService(), gen).suggest(ARGS),
    ).rejects.toThrow(SURVEY_ERROR_MESSAGES.AI_UNAVAILABLE);
  });

  it("maps an empty model response to AI_UNAVAILABLE", async () => {
    const gen = new FakeGenerator([]);
    await expect(
      new NoteSuggestionsService(makeRepo(), makeResultsService(), gen).suggest(ARGS),
    ).rejects.toThrow(SURVEY_ERROR_MESSAGES.AI_UNAVAILABLE);
  });
});
