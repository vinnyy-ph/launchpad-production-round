// frontend/src/test/performance/visible-results-list.test.tsx
import { render, screen } from "@testing-library/react";
import { VisibleResultsList } from "@/modules/performance/surveys/components/visible-results-list";
import * as hook from "@/modules/performance/surveys/hooks/use-visible-result-surveys";

jest.mock("@/modules/performance/surveys/hooks/use-visible-result-surveys");
const mockHook = hook.useVisibleResultSurveys as jest.Mock;

describe("VisibleResultsList", () => {
  it("shows the empty state when there are no surveys", () => {
    mockHook.mockReturnValue({ data: [], isLoading: false, isError: false, refetch: jest.fn() });
    render(<VisibleResultsList />);
    expect(screen.getByText(/no results to view/i)).toBeInTheDocument();
  });

  it("renders a row per survey with a results link", () => {
    mockHook.mockReturnValue({
      data: [{ id: "s1", name: "Team pulse", isAnonymous: true, status: "active" }],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    render(<VisibleResultsList />);
    expect(screen.getByText("Team pulse")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/surveys/s1/results");
  });
});
