import {
  pulseParticipation,
  pulseSentiment,
  buildPulseCard,
} from "@/screens/supervisor/pulse-results.logic";
import type {
  SurveyResults,
  VisibleResultSurvey,
} from "@/modules/performance/surveys/types/surveys.types";

function results(over: Partial<SurveyResults> = {}): SurveyResults {
  return {
    surveyId: "s-1",
    isAnonymous: false,
    surveyName: "Q2 Pulse",
    deadline: "2026-06-30T00:00:00Z",
    isActive: true,
    occurrenceCount: 1,
    totalResponses: 0,
    recipientCount: 0,
    respondedCount: 0,
    filter: null,
    suppressed: false,
    questions: [],
    ...over,
  };
}

const survey: VisibleResultSurvey = { id: "s-1", name: "Q2 Pulse", isAnonymous: true, status: "active" };

describe("pulseParticipation", () => {
  it("computes responded/recipient and a rounded percent", () => {
    expect(pulseParticipation(results({ recipientCount: 8, respondedCount: 6 }))).toEqual({ responded: 6, recipient: 8, pct: 75 });
  });
  it("is null when there are no recipients", () => {
    expect(pulseParticipation(results({ recipientCount: 0, respondedCount: 0 }))).toBeNull();
  });
});

describe("pulseSentiment", () => {
  it("averages LINEAR_SCALE question averages and derives a scale max", () => {
    const out = pulseSentiment(
      results({
        questions: [
          { questionId: "q1", type: "LINEAR_SCALE", questionText: "A", responseCount: 5, average: 4.0, min: 2, max: 5, distribution: { "2": 1, "4": 2, "5": 2 } },
          { questionId: "q2", type: "LINEAR_SCALE", questionText: "B", responseCount: 5, average: 4.4, min: 3, max: 5, distribution: { "3": 1, "5": 4 } },
          { questionId: "q3", type: "SHORT_ANSWER", questionText: "C", responseCount: 5, responses: [] },
        ],
      }),
    );
    expect(out).toEqual({ avg: 4.2, scaleMax: 5 });
  });
  it("is null when suppressed", () => {
    expect(pulseSentiment(results({ suppressed: true, questions: [] }))).toBeNull();
  });
  it("is null when there are no scale questions", () => {
    expect(pulseSentiment(results({ questions: [{ questionId: "q", type: "SHORT_ANSWER", questionText: "x", responseCount: 1, responses: [] }] }))).toBeNull();
  });
  it("ignores scale questions with no responses, so a zero-response survey reports no sentiment", () => {
    expect(
      pulseSentiment(
        results({ questions: [{ questionId: "q1", type: "LINEAR_SCALE", questionText: "A", responseCount: 0, average: 0, min: 0, max: 0, distribution: {} }] }),
      ),
    ).toBeNull();
  });
});

describe("buildPulseCard", () => {
  it("maps a readable result into participation + sentiment", () => {
    const card = buildPulseCard(
      survey,
      results({ recipientCount: 4, respondedCount: 3, questions: [{ questionId: "q1", type: "LINEAR_SCALE", questionText: "A", responseCount: 3, average: 4.2, min: 3, max: 5, distribution: { "5": 2, "3": 1 } }] }),
      false,
    );
    expect(card).toMatchObject({ id: "s-1", name: "Q2 Pulse", isAnonymous: true, statusLabel: "Active", suppressed: false, forbidden: false });
    expect(card.participation).toEqual({ responded: 3, recipient: 4, pct: 75 });
    expect(card.sentiment).toEqual({ avg: 4.2, scaleMax: 5 });
  });
  it("shows participation but no sentiment when suppressed", () => {
    const card = buildPulseCard(survey, results({ recipientCount: 4, respondedCount: 2, suppressed: true, questions: [] }), false);
    expect(card.participation).toEqual({ responded: 2, recipient: 4, pct: 50 });
    expect(card.sentiment).toBeNull();
    expect(card.suppressed).toBe(true);
  });
  it("marks forbidden with no participation or sentiment when results are null", () => {
    const card = buildPulseCard(survey, null, true);
    expect(card).toMatchObject({ forbidden: true, suppressed: false });
    expect(card.participation).toBeNull();
    expect(card.sentiment).toBeNull();
  });
});
