import { PEOPLE_NAME_LANGUAGE_MESSAGE } from "@/modules/people/people-text";
import {
  surveyAnswerChangeError,
  validateSurveyAnswerText,
} from "@/modules/performance/surveys/lib/survey-answer-text";

describe("validateSurveyAnswerText", () => {
  it("accepts plain text answers", () => {
    expect(validateSurveyAnswerText("Team morale is good", "SHORT_ANSWER")).toBeUndefined();
    expect(validateSurveyAnswerText("a < b", "LONG_ANSWER")).toBeUndefined();
  });

  it("blocks profanity with a friendly message", () => {
    expect(validateSurveyAnswerText("this is fucking terrible", "LONG_ANSWER")).toBe(
      PEOPLE_NAME_LANGUAGE_MESSAGE,
    );
  });

  it("maps XSS failures to a friendly answer message", () => {
    expect(validateSurveyAnswerText("<script>alert(1)</script>", "SHORT_ANSWER")).toBe(
      "Please enter a valid answer using letters, numbers, spaces, and common punctuation only.",
    );
  });
});

describe("surveyAnswerChangeError", () => {
  it("does not nag empty fields while typing", () => {
    expect(surveyAnswerChangeError("", "SHORT_ANSWER")).toBeUndefined();
    expect(surveyAnswerChangeError("   ", "LONG_ANSWER")).toBeUndefined();
  });

  it("flags profanity as the user types", () => {
    expect(surveyAnswerChangeError("sh1t", "SHORT_ANSWER")).toBe(PEOPLE_NAME_LANGUAGE_MESSAGE);
  });
});
