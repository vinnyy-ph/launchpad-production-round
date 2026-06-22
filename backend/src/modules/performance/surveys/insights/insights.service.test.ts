import { InsightsService } from "./insights.service";
import { SURVEY_ERROR_MESSAGES } from "../surveys.constants";
import type {
  CallerScope,
  InsightCaller,
  InsightGeneratorPort,
  InsightResponse,
  InsightSurveyInfo,
  InsightsRepositoryPort,
  RawInsight,
} from "./insights.types";

const SAMPLE: RawInsight = {
  oneLiner: "Team morale is steady but workload is a concern.",
  sentiment: { overall: "mixed", rationale: "Positive on culture, negative on hours." },
  themes: [{ label: "Workload", description: "Several mention long hours." }],
  quotes: ["I love the team but the hours are brutal."],
};

function survey(over: Partial<InsightSurveyInfo> = {}): InsightSurveyInfo {
  return {
    id: "sv1",
    name: "Q3 Pulse",
    isAnonymous: false,
    visibility: "EVERYONE",
    audienceConfigTeamIds: [],
    visibilityConfigTeamIds: [],
    openTextQuestions: [{ id: "q1", questionText: "How are you feeling?" }],
    ...over,
  };
}

function resp(text: string | null): InsightResponse {
  return { answers: [{ questionId: "q1", answerText: text }] };
}

class FakeRepo implements InsightsRepositoryPort {
  generateCalls = 0;
  lastScope: CallerScope | null | undefined;
  upserts: { responseCount: number; payload: RawInsight }[] = [];
  constructor(
    private opts: {
      survey?: InsightSurveyInfo | null;
      caller?: InsightCaller | null;
      downward?: string[];
      audience?: string[];
      responses?: InsightResponse[];
      cached?: { payload: RawInsight; responseCount: number; model: string } | null;
    } = {},
  ) {}
  async findSurveyForInsights() {
    return this.opts.survey === undefined ? survey() : this.opts.survey;
  }
  async findCaller() {
    return this.opts.caller ?? null;
  }
  async downwardChain() {
    return this.opts.downward ?? [];
  }
  async findAudienceEmployeeIds() {
    return this.opts.audience ?? [];
  }
  async findOpenTextResponses(_surveyId: string, scope: CallerScope | null) {
    this.lastScope = scope;
    return this.opts.responses ?? [resp("a"), resp("b"), resp("c")];
  }
  async getCachedInsight() {
    return this.opts.cached
      ? { ...this.opts.cached, generatedAt: new Date() }
      : null;
  }
  async upsertCachedInsight(args: Parameters<InsightsRepositoryPort["upsertCachedInsight"]>[0]) {
    this.upserts.push({ responseCount: args.responseCount, payload: args.payload });
  }
}

class FakeGenerator implements InsightGeneratorPort {
  readonly model = "gpt-4o-mini";
  calls = 0;
  constructor(private out: RawInsight = SAMPLE) {}
  async generate() {
    this.calls += 1;
    return JSON.parse(JSON.stringify(this.out)) as RawInsight;
  }
}

const HR = { surveyId: "sv1", userId: "u1", role: "HR" };

describe("InsightsService.generateInsights", () => {
  it("throws when the survey does not exist", async () => {
    const repo = new FakeRepo({ survey: null });
    const gen = new FakeGenerator();
    await expect(new InsightsService(repo, gen).generateInsights(HR)).rejects.toThrow(
      SURVEY_ERROR_MESSAGES.SURVEY_NOT_FOUND,
    );
    expect(gen.calls).toBe(0);
  });

  it("denies a non-HR viewer outside the survey's visibility (403), no LLM call", async () => {
    const repo = new FakeRepo({
      survey: survey({ visibility: "HR_ROOT_ONLY" }),
      caller: { id: "e9", supervisorId: "boss", teamIds: [] }, // not root
    });
    const gen = new FakeGenerator();
    await expect(
      new InsightsService(repo, gen).generateInsights({ ...HR, role: "EMPLOYEE", userId: "u9" }),
    ).rejects.toThrow(SURVEY_ERROR_MESSAGES.RESULTS_FORBIDDEN);
    expect(gen.calls).toBe(0);
  });

  it("returns available:false when the survey has no open-text questions", async () => {
    const repo = new FakeRepo({ survey: survey({ openTextQuestions: [] }) });
    const gen = new FakeGenerator();
    const out = await new InsightsService(repo, gen).generateInsights(HR);
    expect(out.available).toBe(false);
    expect(out.reason).toBe("no_open_text");
    expect(gen.calls).toBe(0);
  });

  it("returns available:false (no_responses) when no open-text answers exist", async () => {
    const repo = new FakeRepo({ responses: [resp(null), resp("   ")] });
    const gen = new FakeGenerator();
    const out = await new InsightsService(repo, gen).generateInsights(HR);
    expect(out.available).toBe(false);
    expect(out.reason).toBe("no_responses");
    expect(gen.calls).toBe(0);
  });

  it("suppresses anonymous surveys with fewer than 3 open-text responses, no LLM call", async () => {
    const repo = new FakeRepo({
      survey: survey({ isAnonymous: true }),
      responses: [resp("a"), resp("b")],
    });
    const gen = new FakeGenerator();
    const out = await new InsightsService(repo, gen).generateInsights(HR);
    expect(out.suppressed).toBe(true);
    expect(out.insight).toBeUndefined();
    expect(gen.calls).toBe(0);
  });

  it("strips verbatim quotes for anonymous surveys even when the model returns them", async () => {
    const repo = new FakeRepo({
      survey: survey({ isAnonymous: true }),
      responses: [resp("a"), resp("b"), resp("c")],
    });
    const gen = new FakeGenerator(); // SAMPLE has a quote
    const out = await new InsightsService(repo, gen).generateInsights(HR);
    expect(gen.calls).toBe(1);
    expect(out.insight?.quotes).toEqual([]);
    expect(repo.upserts[0].payload.quotes).toEqual([]); // cached without quotes
  });

  it("keeps quotes for non-anonymous surveys", async () => {
    const repo = new FakeRepo(); // non-anonymous default, 3 responses
    const gen = new FakeGenerator();
    const out = await new InsightsService(repo, gen).generateInsights(HR);
    expect(out.insight?.quotes.length).toBeGreaterThan(0);
  });

  it("returns the cached payload without an LLM call when responseCount is unchanged", async () => {
    const repo = new FakeRepo({
      responses: [resp("a"), resp("b"), resp("c")],
      cached: { payload: SAMPLE, responseCount: 3, model: "gpt-4o-mini" },
    });
    const gen = new FakeGenerator();
    const out = await new InsightsService(repo, gen).generateInsights(HR);
    expect(out.cached).toBe(true);
    expect(gen.calls).toBe(0);
  });

  it("strips quotes from a cache hit on an anonymous survey", async () => {
    const repo = new FakeRepo({
      survey: survey({ isAnonymous: true }),
      responses: [resp("a"), resp("b"), resp("c")],
      cached: { payload: SAMPLE, responseCount: 3, model: "gpt-4o-mini" }, // SAMPLE has a quote
    });
    const gen = new FakeGenerator();
    const out = await new InsightsService(repo, gen).generateInsights(HR);
    expect(out.cached).toBe(true);
    expect(gen.calls).toBe(0);
    expect(out.insight?.quotes).toEqual([]);
  });

  it("regenerates (ignores cache) when refresh is true", async () => {
    const repo = new FakeRepo({
      responses: [resp("a"), resp("b"), resp("c")],
      cached: { payload: SAMPLE, responseCount: 3, model: "gpt-4o-mini" },
    });
    const gen = new FakeGenerator();
    const out = await new InsightsService(repo, gen).generateInsights({ ...HR, refresh: true });
    expect(out.cached).toBe(false);
    expect(gen.calls).toBe(1);
  });

  it("scopes a SUPERVISOR_BASED non-HR viewer to their chain", async () => {
    const repo = new FakeRepo({
      survey: survey({ visibility: "SUPERVISOR_BASED" }),
      caller: { id: "mgr", supervisorId: "boss", teamIds: [] },
      downward: ["r1", "r2"],
      audience: ["r1"], // overlap → allowed
    });
    const gen = new FakeGenerator();
    await new InsightsService(repo, gen).generateInsights({ ...HR, role: "EMPLOYEE", userId: "umgr" });
    expect(repo.lastScope).toEqual({ kind: "supervisor", ids: ["mgr", "r1", "r2"] });
  });
});
