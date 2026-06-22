import type { InsightSentiment, RawInsight } from "./insights.types";

const SENTIMENTS: InsightSentiment[] = ["positive", "neutral", "negative", "mixed"];

export function buildSystemPrompt(allowQuotes: boolean): string {
  return [
    "You are an HR analyst summarizing employees' open-text pulse survey responses.",
    "Return ONLY a valid JSON object, no prose, matching exactly this shape:",
    `{"oneLiner": string, "sentiment": {"overall": "positive"|"neutral"|"negative"|"mixed", "rationale": string}, "themes": [{"label": string, "description": string}], "quotes": [string]}`,
    "oneLiner: a single sentence, at most 140 characters, capturing the overall takeaway.",
    "themes: 3 to 5 key recurring themes; label is 1-3 words, description is one sentence.",
    "sentiment.overall reflects the balance of all responses.",
    allowQuotes
      ? "quotes: up to 3 short, representative notable quotes, verbatim from the responses."
      : "This survey is ANONYMOUS. Do NOT include any verbatim quotes — a quote could identify a respondent. Return quotes as an empty array.",
  ].join("\n");
}

export function buildUserContent(
  questions: { questionText: string; answers: string[] }[],
): string {
  return questions
    .map(
      (q, i) =>
        `Question ${i + 1}: ${q.questionText}\n` +
        q.answers.map((a) => `- ${a.replace(/\s+/g, " ").trim()}`).join("\n"),
    )
    .join("\n\n");
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function parseInsight(text: string, allowQuotes: boolean): RawInsight {
  let obj: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") obj = parsed as Record<string, unknown>;
  } catch {
    // fall through to defaults
  }

  const s = (obj.sentiment ?? {}) as Record<string, unknown>;
  const overall = SENTIMENTS.includes(s.overall as InsightSentiment)
    ? (s.overall as InsightSentiment)
    : "neutral";

  const themes = Array.isArray(obj.themes)
    ? (obj.themes as unknown[])
        .map((t) => {
          const r = (t ?? {}) as Record<string, unknown>;
          return { label: asString(r.label), description: asString(r.description) };
        })
        .filter((t) => t.label !== "")
    : [];

  const quotes =
    allowQuotes && Array.isArray(obj.quotes)
      ? (obj.quotes as unknown[]).map(asString).filter((q) => q !== "")
      : [];

  return {
    oneLiner: asString(obj.oneLiner).slice(0, 240),
    sentiment: { overall, rationale: asString(s.rationale) },
    themes,
    quotes,
  };
}
