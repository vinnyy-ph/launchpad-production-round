import { AiQuestionsService } from "./ai-questions.service";
import { SURVEY_ERROR_MESSAGES } from "../surveys.constants";
import type { AiQuestionsGeneratorPort, GenerateQuestionsInput } from "./ai-questions.types";

const INPUT: GenerateQuestionsInput = { goal: "measure team morale", count: 2 };

const VALID = [
  { type: "SHORT_ANSWER", questionText: "What's going well?" },
  { type: "LINEAR_SCALE", questionText: "Rate morale", scaleMin: 1, scaleMax: 5 },
];
const INVALID = [{ type: "RATING", questionText: "bad type" }];

/** Fake port that returns a queued result per call and counts calls. */
class FakeGenerator implements AiQuestionsGeneratorPort {
  readonly model = "fake";
  calls = 0;
  received: { input: GenerateQuestionsInput; correction?: string }[] = [];
  constructor(private readonly outputs: (unknown[] | Error)[]) {}
  async generate(input: GenerateQuestionsInput, correction?: string): Promise<unknown[]> {
    this.received.push({ input, correction });
    const out = this.outputs[this.calls] ?? [];
    this.calls += 1;
    if (out instanceof Error) throw out;
    return out;
  }
}

describe("AiQuestionsService", () => {
  it("returns validated questions on a valid first response (one call)", async () => {
    const gen = new FakeGenerator([VALID]);
    const svc = new AiQuestionsService(gen);
    const out = await svc.generate(INPUT);
    expect(gen.calls).toBe(1);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ type: "SHORT_ANSWER", questionText: "What's going well?", isRequired: true });
    expect(gen.received[0].input).toEqual(INPUT);
  });

  it("retries once when the first response is invalid, then succeeds (two calls)", async () => {
    const gen = new FakeGenerator([INVALID, VALID]);
    const svc = new AiQuestionsService(gen);
    const out = await svc.generate(INPUT);
    expect(gen.calls).toBe(2);
    expect(out).toHaveLength(2);
    expect(gen.received[1].correction).toBeDefined();
  });

  it("throws AI_QUESTIONS_INVALID when both responses are invalid (two calls)", async () => {
    const gen = new FakeGenerator([INVALID, INVALID]);
    const svc = new AiQuestionsService(gen);
    await expect(svc.generate(INPUT)).rejects.toThrow(SURVEY_ERROR_MESSAGES.AI_QUESTIONS_INVALID);
    expect(gen.calls).toBe(2);
  });

  it("throws AI_UNAVAILABLE when the generator throws", async () => {
    const gen = new FakeGenerator([new Error("network down")]);
    const svc = new AiQuestionsService(gen);
    await expect(svc.generate(INPUT)).rejects.toThrow(SURVEY_ERROR_MESSAGES.AI_UNAVAILABLE);
  });

  it("throws AI_UNAVAILABLE when the generator throws on the retry call", async () => {
    const gen = new FakeGenerator([INVALID, new Error("network down on retry")]);
    const svc = new AiQuestionsService(gen);
    await expect(svc.generate(INPUT)).rejects.toThrow(SURVEY_ERROR_MESSAGES.AI_UNAVAILABLE);
    expect(gen.calls).toBe(2);
  });
});
