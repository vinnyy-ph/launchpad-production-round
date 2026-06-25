import { PEOPLE_NAME_LANGUAGE_MESSAGE } from "@/modules/people/people-text";
import { validateEvaluationTextFields } from "@/modules/performance/evaluations/lib/evaluation-form-text";

describe("validateEvaluationTextFields", () => {
  const valid = {
    evaluation: "Maria delivered strong results this quarter.",
    recommendation: "Ready for a stretch project.",
    highlights: ["Shipped billing revamp early."],
    lowlights: ["Could improve test coverage."],
  };

  it("accepts clean text", () => {
    expect(validateEvaluationTextFields(valid)).toEqual({});
  });

  it("allows safe comparison operators in summary", () => {
    expect(
      validateEvaluationTextFields({
        ...valid,
        evaluation: "Handled more than 5 < 10 tickets per day.",
      }),
    ).toEqual({});
  });

  it("maps XSS in overall summary to a friendly message", () => {
    expect(
      validateEvaluationTextFields({
        ...valid,
        evaluation: "<script>alert(1)</script>",
      }),
    ).toEqual({
      summary: "Please enter a valid overall summary.",
    });
  });

  it("blocks profanity in highlights", () => {
    expect(
      validateEvaluationTextFields({
        ...valid,
        highlights: ["sh1t performance"],
      }),
    ).toEqual({
      highlights: PEOPLE_NAME_LANGUAGE_MESSAGE,
    });
  });

  it("blocks profanity in lowlights", () => {
    expect(
      validateEvaluationTextFields({
        ...valid,
        lowlights: ["test fuck test"],
      }),
    ).toEqual({
      lowlights: PEOPLE_NAME_LANGUAGE_MESSAGE,
    });
  });

  it("skips empty optional list items", () => {
    expect(
      validateEvaluationTextFields({
        ...valid,
        highlights: ["", "   "],
        lowlights: [""],
      }),
    ).toEqual({});
  });
});
