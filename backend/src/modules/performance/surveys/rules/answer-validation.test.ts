import { validateAnswers, ANSWER_ERRORS, type ValidatableQuestion } from "./answer-validation";

const q = (
  over: Partial<ValidatableQuestion> & Pick<ValidatableQuestion, "id" | "type">,
): ValidatableQuestion => ({
  isRequired: true,
  options: null,
  scaleMin: null,
  scaleMax: null,
  ...over,
});

describe("validateAnswers", () => {
  it("accepts a valid answer of every question type", () => {
    const questions = [
      q({ id: "s", type: "SHORT_ANSWER" }),
      q({ id: "l", type: "LONG_ANSWER" }),
      q({ id: "sc", type: "LINEAR_SCALE", scaleMin: 1, scaleMax: 5 }),
      q({ id: "mc", type: "MULTIPLE_CHOICE", options: ["A", "B"] }),
      q({ id: "cb", type: "CHECKBOX", options: ["X", "Y"] }),
    ];
    expect(() =>
      validateAnswers(questions, [
        { questionId: "s", answerText: "hi" },
        { questionId: "l", answerText: "a longer answer" },
        { questionId: "sc", answerData: 3 },
        { questionId: "mc", answerData: "A" },
        { questionId: "cb", answerData: ["X", "Y"] },
      ]),
    ).not.toThrow();
  });

  it("rejects an answer to a question that is not on the survey", () => {
    expect(() =>
      validateAnswers([q({ id: "s", type: "SHORT_ANSWER" })], [{ questionId: "ghost", answerText: "x" }]),
    ).toThrow(ANSWER_ERRORS.UNKNOWN_QUESTION);
  });

  it("rejects a missing required question", () => {
    const questions = [
      q({ id: "s", type: "SHORT_ANSWER" }),
      q({ id: "o", type: "SHORT_ANSWER", isRequired: false }),
    ];
    expect(() => validateAnswers(questions, [{ questionId: "o", answerText: "x" }])).toThrow(
      ANSWER_ERRORS.MISSING_REQUIRED,
    );
  });

  it("allows an optional question to be skipped", () => {
    const questions = [q({ id: "o", type: "SHORT_ANSWER", isRequired: false })];
    expect(() => validateAnswers(questions, [])).not.toThrow();
  });

  it("rejects a blank required text answer", () => {
    const questions = [q({ id: "s", type: "SHORT_ANSWER" })];
    expect(() => validateAnswers(questions, [{ questionId: "s", answerText: "   " }])).toThrow(
      ANSWER_ERRORS.MISSING_REQUIRED,
    );
  });

  it("rejects a linear-scale value out of range", () => {
    const questions = [q({ id: "sc", type: "LINEAR_SCALE", scaleMin: 1, scaleMax: 5 })];
    expect(() => validateAnswers(questions, [{ questionId: "sc", answerData: 9 }])).toThrow(
      ANSWER_ERRORS.INVALID_SCALE,
    );
  });

  it("rejects a non-numeric linear-scale value", () => {
    const questions = [q({ id: "sc", type: "LINEAR_SCALE", scaleMin: 1, scaleMax: 5 })];
    expect(() => validateAnswers(questions, [{ questionId: "sc", answerData: "abc" }])).toThrow(
      ANSWER_ERRORS.INVALID_SCALE,
    );
  });

  it("rejects a multiple-choice answer outside the options", () => {
    const questions = [q({ id: "mc", type: "MULTIPLE_CHOICE", options: ["A", "B"] })];
    expect(() => validateAnswers(questions, [{ questionId: "mc", answerData: "C" }])).toThrow(
      ANSWER_ERRORS.INVALID_CHOICE,
    );
  });

  it("rejects a checkbox answer containing an unknown option", () => {
    const questions = [q({ id: "cb", type: "CHECKBOX", options: ["X", "Y"] })];
    expect(() => validateAnswers(questions, [{ questionId: "cb", answerData: ["X", "Z"] }])).toThrow(
      ANSWER_ERRORS.INVALID_CHECKBOX,
    );
  });

  it("rejects unsafe HTML in a short answer", () => {
    const questions = [q({ id: "s", type: "SHORT_ANSWER" })];
    expect(() =>
      validateAnswers(questions, [{ questionId: "s", answerText: "<script>alert(1)</script>" }]),
    ).toThrow(/must not contain HTML/);
  });

  it("allows safe comparison operators in a long answer", () => {
    const questions = [q({ id: "l", type: "LONG_ANSWER" })];
    expect(() =>
      validateAnswers(questions, [{ questionId: "l", answerText: "Score was 5 < 10 this quarter." }]),
    ).not.toThrow();
  });

  it("rejects a long answer over the max length", () => {
    const questions = [q({ id: "l", type: "LONG_ANSWER" })];
    expect(() =>
      validateAnswers(questions, [{ questionId: "l", answerText: "x".repeat(2001) }]),
    ).toThrow(/must be 2000 characters or fewer/);
  });
});
