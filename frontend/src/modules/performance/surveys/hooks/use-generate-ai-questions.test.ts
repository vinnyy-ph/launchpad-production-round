import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createElement } from "react";
import { useGenerateAiQuestions } from "./use-generate-ai-questions";
import * as service from "../services/surveys.service";

jest.mock("../services/surveys.service");

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return createElement(QueryClientProvider, { client: qc }, children);
}

describe("useGenerateAiQuestions", () => {
  afterEach(() => jest.restoreAllMocks());

  it("returns generated questions on success", async () => {
    const questions = [{ type: "SHORT_ANSWER", questionText: "Q?", isRequired: true }];
    jest.spyOn(service, "generateAiQuestions").mockResolvedValue(questions as never);

    const { result } = renderHook(() => useGenerateAiQuestions(), { wrapper });
    result.current.mutate({ goal: "morale", count: 1 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(questions);
    expect(service.generateAiQuestions).toHaveBeenCalledWith({ goal: "morale", count: 1 });
  });

  it("surfaces an error on failure", async () => {
    jest.spyOn(service, "generateAiQuestions").mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useGenerateAiQuestions(), { wrapper });
    result.current.mutate({ goal: "morale", count: 1 });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
