import { SurveysValidation } from "../surveys.validation";
import { SURVEY_ERROR_MESSAGES } from "../surveys.constants";

const v = new SurveysValidation();

describe("SurveysValidation.validateGeneratedQuestions", () => {
  it("accepts each of the five valid types and strips orderIndex", () => {
    const out = v.validateGeneratedQuestions([
      { type: "SHORT_ANSWER", questionText: "Name?" },
      { type: "LONG_ANSWER", questionText: "Tell us more" },
      { type: "LINEAR_SCALE", questionText: "Rate it", scaleMin: 1, scaleMax: 5 },
      { type: "MULTIPLE_CHOICE", questionText: "Pick one", options: ["A", "B"] },
      { type: "CHECKBOX", questionText: "Pick many", options: ["A", "B"] },
    ]);
    expect(out).toHaveLength(5);
    expect(out[0]).not.toHaveProperty("orderIndex");
    expect(out[0]).toEqual({ type: "SHORT_ANSWER", questionText: "Name?", isRequired: true });
  });

  it("rejects an unknown question type", () => {
    expect(() => v.validateGeneratedQuestions([{ type: "RATING", questionText: "x" }])).toThrow(
      SURVEY_ERROR_MESSAGES.INVALID_QUESTION_TYPE,
    );
  });

  it("rejects choice types without options", () => {
    expect(() => v.validateGeneratedQuestions([{ type: "MULTIPLE_CHOICE", questionText: "x" }])).toThrow(
      SURVEY_ERROR_MESSAGES.OPTIONS_REQUIRED,
    );
  });

  it("rejects LINEAR_SCALE without bounds", () => {
    expect(() => v.validateGeneratedQuestions([{ type: "LINEAR_SCALE", questionText: "x" }])).toThrow(
      SURVEY_ERROR_MESSAGES.SCALE_BOUNDS_REQUIRED,
    );
  });

  it("rejects an empty array", () => {
    expect(() => v.validateGeneratedQuestions([])).toThrow(SURVEY_ERROR_MESSAGES.QUESTIONS_REQUIRED);
  });
});

describe("SurveysValidation.parseGenerateQuestionsBody", () => {
  it("accepts a valid goal and count", () => {
    expect(v.parseGenerateQuestionsBody({ goal: "team morale", count: 5 })).toEqual({
      goal: "team morale",
      count: 5,
    });
  });

  it("rejects a missing or empty goal", () => {
    expect(() => v.parseGenerateQuestionsBody({ count: 5 })).toThrow();
    expect(() => v.parseGenerateQuestionsBody({ goal: "   ", count: 5 })).toThrow();
  });

  it("rejects an out-of-range or non-integer count", () => {
    expect(() => v.parseGenerateQuestionsBody({ goal: "x", count: 0 })).toThrow();
    expect(() => v.parseGenerateQuestionsBody({ goal: "x", count: 11 })).toThrow();
    expect(() => v.parseGenerateQuestionsBody({ goal: "x", count: 2.5 })).toThrow();
  });
});
