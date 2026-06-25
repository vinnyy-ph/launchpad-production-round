jest.mock("@/shared/lib/api-client", () => ({
  apiFetch: jest.fn(() =>
    Promise.resolve({ success: true, message: "ok", data: { answers: [] } }),
  ),
}));

import { apiFetch } from "@/shared/lib/api-client";
import { fetchMyAnswers } from "@/modules/performance/surveys/services/surveys.service";

const mockedApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe("fetchMyAnswers", () => {
  afterEach(() => jest.clearAllMocks());

  it("requests the employee's own answers for the given occurrence", async () => {
    mockedApiFetch.mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: { occurrenceId: "occ-1", surveyId: "s1", surveyName: "Q3", occurrenceNumber: 1, isAnonymous: false, submitted: true, answers: [] },
    });

    await fetchMyAnswers("occ-1");

    expect(mockedApiFetch).toHaveBeenCalledWith("/api/v1/pulse/me/surveys/answered/occ-1");
  });

  it("normalizes MC options and leaves non-option answers' options null", async () => {
    mockedApiFetch.mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: {
        occurrenceId: "occ-1",
        surveyId: "s1",
        surveyName: "Q3",
        occurrenceNumber: 1,
        isAnonymous: false,
        submitted: true,
        answers: [
          { questionId: "q1", questionText: "Pick", type: "MULTIPLE_CHOICE", options: { choices: ["A", "B"] }, scaleMin: null, scaleMax: null, scaleMinLabel: null, scaleMaxLabel: null, answerText: null, answerData: "A" },
          { questionId: "q2", questionText: "Why", type: "SHORT_ANSWER", options: null, scaleMin: null, scaleMax: null, scaleMinLabel: null, scaleMaxLabel: null, answerText: "Because", answerData: null },
        ],
      },
    });

    const result = await fetchMyAnswers("occ-1");

    expect(result.answers[0].options).toEqual(["A", "B"]); // {choices} → string[]
    expect(result.answers[0].answerData).toBe("A");
    expect(result.answers[1].options).toBeNull(); // non-option types stay null
    expect(result.answers[1].answerText).toBe("Because");
  });
});
