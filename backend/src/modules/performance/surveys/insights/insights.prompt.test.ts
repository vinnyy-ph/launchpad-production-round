import { buildSystemPrompt, buildUserContent, parseInsight } from "./insights.prompt";

describe("insights.prompt", () => {
  it("system prompt forbids quotes when allowQuotes is false", () => {
    const p = buildSystemPrompt(false);
    expect(p.toLowerCase()).toContain("anonymous");
    expect(p).toMatch(/empty array/i);
  });

  it("system prompt permits quotes when allowQuotes is true", () => {
    expect(buildSystemPrompt(true).toLowerCase()).toContain("notable quotes");
  });

  it("user content includes the question text and answers", () => {
    const c = buildUserContent([{ questionText: "How are you?", answers: ["Good", "Tired"] }]);
    expect(c).toContain("How are you?");
    expect(c).toContain("Good");
    expect(c).toContain("Tired");
  });

  it("parseInsight coerces a valid JSON payload", () => {
    const out = parseInsight(
      JSON.stringify({
        oneLiner: "All good.",
        sentiment: { overall: "positive", rationale: "x" },
        themes: [{ label: "A", description: "b" }],
        quotes: ["q"],
      }),
      true,
    );
    expect(out.oneLiner).toBe("All good.");
    expect(out.themes[0].label).toBe("A");
    expect(out.quotes).toEqual(["q"]);
  });

  it("parseInsight forces quotes to [] when not allowed", () => {
    const out = parseInsight(JSON.stringify({ quotes: ["leak"] }), false);
    expect(out.quotes).toEqual([]);
  });

  it("parseInsight tolerates malformed output with safe defaults", () => {
    const out = parseInsight("not json", true);
    expect(out.oneLiner).toBe("");
    expect(out.sentiment.overall).toBe("neutral");
    expect(Array.isArray(out.themes)).toBe(true);
    expect(out.quotes).toEqual([]);
  });
});
