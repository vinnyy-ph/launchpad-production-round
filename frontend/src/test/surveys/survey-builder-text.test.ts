import { PEOPLE_NAME_LANGUAGE_MESSAGE } from "@/modules/people/people-text";
import {
  surveyNameChangeError,
  surveyNameSubmitError,
  surveyQuestionChangeError,
  surveyQuestionSubmitError,
} from "@/modules/performance/surveys/lib/survey-builder-text";

describe("survey-builder-text", () => {
  it("accepts valid survey names", () => {
    expect(surveyNameChangeError("Q3 engagement pulse")).toBeUndefined();
  });

  it("blocks profanity in survey names on change", () => {
    expect(surveyNameChangeError("fuck pulse")).toBe(PEOPLE_NAME_LANGUAGE_MESSAGE);
  });

  it("maps XSS in survey names to friendly copy", () => {
    expect(surveyNameChangeError("<script>alert(1)</script>")).toBe(
      "Please enter a valid survey name.",
    );
  });

  it("requires a survey name on submit", () => {
    expect(surveyNameSubmitError("   ")).toBe("Name is required.");
  });

  it("blocks profanity in question text on change", () => {
    expect(surveyQuestionChangeError("What the fuck?")).toBe(PEOPLE_NAME_LANGUAGE_MESSAGE);
  });

  it("prefixes question submit errors with the question number", () => {
    expect(surveyQuestionSubmitError("What the fuck?", 0)).toBe(
      `Question 1: ${PEOPLE_NAME_LANGUAGE_MESSAGE}`,
    );
  });
});
