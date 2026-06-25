import { buildSystemPrompt, buildUserContent, parseQuestions } from "./ai-questions.prompt";

describe("ai-questions.prompt", () => {
  describe("buildSystemPrompt", () => {
    it("names all five valid question types", () => {
      const p = buildSystemPrompt();
      for (const t of ["SHORT_ANSWER", "LONG_ANSWER", "LINEAR_SCALE", "MULTIPLE_CHOICE", "CHECKBOX"]) {
        expect(p).toContain(t);
      }
    });
  });

  describe("buildUserContent", () => {
    it("includes the goal and the count", () => {
      const c = buildUserContent("measure onboarding satisfaction", 6);
      expect(c).toContain("measure onboarding satisfaction");
      expect(c).toContain("6");
    });
  });

  describe("parseQuestions", () => {
    it("extracts the array from a { questions: [...] } envelope", () => {
      const out = parseQuestions(JSON.stringify({ questions: [{ type: "SHORT_ANSWER" }] }));
      expect(out).toEqual([{ type: "SHORT_ANSWER" }]);
    });

    it("tolerates a bare array", () => {
      const out = parseQuestions(JSON.stringify([{ type: "LONG_ANSWER" }]));
      expect(out).toEqual([{ type: "LONG_ANSWER" }]);
    });

    it("returns [] for junk or non-array payloads", () => {
      expect(parseQuestions("not json")).toEqual([]);
      expect(parseQuestions(JSON.stringify({ questions: "nope" }))).toEqual([]);
      expect(parseQuestions(JSON.stringify({ other: 1 }))).toEqual([]);
    });
  });
});
