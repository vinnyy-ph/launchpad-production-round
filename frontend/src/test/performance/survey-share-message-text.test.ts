import { PEOPLE_NAME_LANGUAGE_MESSAGE } from "@/modules/people/people-text";
import {
  surveyShareMessageChangeError,
  surveyShareMessageSubmitError,
} from "@/modules/performance/surveys/lib/survey-share-message-text";

describe("surveyShareMessageChangeError", () => {
  it("accepts clean professional text", () => {
    expect(
      surveyShareMessageChangeError("The team reported strong morale this quarter."),
    ).toBeUndefined();
  });

  it("maps XSS to a friendly message", () => {
    expect(surveyShareMessageChangeError("<script>alert(1)</script>")).toBe(
      "Please enter a valid message to the supervisor.",
    );
  });

  it("blocks profanity", () => {
    expect(surveyShareMessageChangeError("team morale is sh1t")).toBe(
      PEOPLE_NAME_LANGUAGE_MESSAGE,
    );
  });

  it("skips validation for whitespace-only input", () => {
    expect(surveyShareMessageChangeError("   ")).toBeUndefined();
  });
});

describe("surveyShareMessageSubmitError", () => {
  it("requires a non-empty note", () => {
    expect(surveyShareMessageSubmitError("   ")).toBe("A note for the supervisor is required.");
  });
});
