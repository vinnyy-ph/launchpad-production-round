import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { AiQuestionGeneratorPanel } from "./ai-question-generator-panel";
import { ApiError } from "@/shared/lib/api-client";
import * as service from "../services/surveys.service";

jest.mock("../services/surveys.service");

function renderPanel(onGenerated = jest.fn()) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
  render(<AiQuestionGeneratorPanel onGenerated={onGenerated} />, { wrapper });
  return { onGenerated };
}

describe("AiQuestionGeneratorPanel", () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.restoreAllMocks());

  it("generates and calls onGenerated with the returned questions", async () => {
    const questions = [{ type: "SHORT_ANSWER", questionText: "Q?", isRequired: true }];
    jest.spyOn(service, "generateAiQuestions").mockResolvedValue(questions as never);
    const { onGenerated } = renderPanel();

    fireEvent.change(screen.getByLabelText(/survey goal/i), { target: { value: "team morale" } });
    fireEvent.click(screen.getByRole("button", { name: /generate questions/i }));

    await waitFor(() => expect(onGenerated).toHaveBeenCalledWith(questions));
  });

  it("does not generate when the goal is empty", () => {
    const spy = jest.spyOn(service, "generateAiQuestions");
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /generate questions/i }));
    expect(spy).not.toHaveBeenCalled();
  });

  it("shows the invalid-questions message on a 422", async () => {
    jest
      .spyOn(service, "generateAiQuestions")
      .mockRejectedValue(new ApiError("nope", 422, "AI_QUESTIONS_INVALID"));
    renderPanel();
    fireEvent.change(screen.getByLabelText(/survey goal/i), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: /generate questions/i }));
    await waitFor(() => expect(screen.getByText(/rephrasing your goal/i)).toBeInTheDocument());
  });

  it("shows the unavailable message on a 503", async () => {
    jest
      .spyOn(service, "generateAiQuestions")
      .mockRejectedValue(new ApiError("down", 503, "AI_UNAVAILABLE"));
    renderPanel();
    fireEvent.change(screen.getByLabelText(/survey goal/i), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: /generate questions/i }));
    await waitFor(() => expect(screen.getByText(/unavailable right now/i)).toBeInTheDocument());
  });
});
