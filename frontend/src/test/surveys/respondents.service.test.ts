jest.mock("@/shared/lib/api-client", () => ({
  apiFetch: jest.fn(() => Promise.resolve({ success: true, message: "ok", data: {} })),
}));

import { apiFetch } from "@/shared/lib/api-client";
import {
  fetchOccurrenceRespondents,
  fetchRespondentAnswers,
} from "@/modules/performance/surveys/services/surveys.service";

const mockedApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe("fetchOccurrenceRespondents", () => {
  afterEach(() => jest.clearAllMocks());

  it("requests the authorized roster for the given occurrence", async () => {
    mockedApiFetch.mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: {
        occurrenceId: "occ-1",
        surveyId: "s1",
        surveyName: "Q3",
        occurrenceNumber: 1,
        isAnonymous: false,
        respondents: [{ employeeId: "emp-2", name: "Bea Cruz", submitted: true }],
      },
    });

    const result = await fetchOccurrenceRespondents("occ-1");

    expect(mockedApiFetch).toHaveBeenCalledWith(
      "/api/v1/pulse/surveys/occurrences/occ-1/respondents",
    );
    expect(result.respondents).toHaveLength(1);
  });
});

describe("fetchRespondentAnswers", () => {
  afterEach(() => jest.clearAllMocks());

  it("requests one respondent's answers and normalizes MC options", async () => {
    mockedApiFetch.mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: {
        occurrenceId: "occ-1",
        surveyId: "s1",
        surveyName: "Q3",
        occurrenceNumber: 1,
        respondent: { employeeId: "emp-2", name: "Bea Cruz" },
        submitted: true,
        submittedAt: "2026-06-20T10:00:00.000Z",
        answers: [
          {
            questionId: "q1",
            questionText: "Pick",
            type: "MULTIPLE_CHOICE",
            options: { choices: ["A", "B"] },
            scaleMin: null,
            scaleMax: null,
            scaleMinLabel: null,
            scaleMaxLabel: null,
            answerText: null,
            answerData: "A",
          },
        ],
      },
    });

    const result = await fetchRespondentAnswers("occ-1", "emp-2");

    expect(mockedApiFetch).toHaveBeenCalledWith(
      "/api/v1/pulse/surveys/occurrences/occ-1/respondents/emp-2",
    );
    expect(result.answers[0].options).toEqual(["A", "B"]); // {choices} → string[]
    expect(result.respondent.name).toBe("Bea Cruz");
  });
});
