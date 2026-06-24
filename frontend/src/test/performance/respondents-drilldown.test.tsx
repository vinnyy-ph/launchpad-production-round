// frontend/src/test/performance/respondents-drilldown.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RespondentsDrilldown } from "@/modules/performance/surveys/components/results/respondents-drilldown";
import * as rosterHook from "@/modules/performance/surveys/hooks/use-occurrence-respondents";
import * as answersHook from "@/modules/performance/surveys/hooks/use-respondent-answers";

jest.mock("@/modules/performance/surveys/hooks/use-occurrence-respondents");
jest.mock("@/modules/performance/surveys/hooks/use-respondent-answers");

const mockRoster = rosterHook.useOccurrenceRespondents as jest.Mock;
const mockAnswers = answersHook.useRespondentAnswers as jest.Mock;

function makeRoster(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    employeeId: `e${i}`,
    name: `Person ${String(i).padStart(2, "0")}`,
    submitted: true,
  }));
}

beforeEach(() => {
  mockAnswers.mockReturnValue({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() });
});

describe("RespondentsDrilldown pagination", () => {
  it("renders only the first 10 of a large roster", () => {
    mockRoster.mockReturnValue({ data: { respondents: makeRoster(25) } });
    render(<RespondentsDrilldown occurrenceId="occ1" isAnonymous={false} />);
    expect(screen.getByText("Person 00")).toBeInTheDocument();
    expect(screen.getByText("Person 09")).toBeInTheDocument();
    expect(screen.queryByText("Person 10")).not.toBeInTheDocument();
  });

  it("'Load more' reveals the next 10", async () => {
    const user = userEvent.setup();
    mockRoster.mockReturnValue({ data: { respondents: makeRoster(25) } });
    render(<RespondentsDrilldown occurrenceId="occ1" isAnonymous={false} />);
    await user.click(screen.getByRole("button", { name: /load more/i }));
    expect(screen.getByText("Person 10")).toBeInTheDocument();
    expect(screen.getByText("Person 19")).toBeInTheDocument();
    expect(screen.queryByText("Person 20")).not.toBeInTheDocument();
  });

  it("hides 'Load more' once the whole roster is shown", async () => {
    const user = userEvent.setup();
    mockRoster.mockReturnValue({ data: { respondents: makeRoster(15) } });
    render(<RespondentsDrilldown occurrenceId="occ1" isAnonymous={false} />);
    await user.click(screen.getByRole("button", { name: /load more/i }));
    expect(screen.getByText("Person 14")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
  });

  it("shows no 'Load more' when roster fits in one page", () => {
    mockRoster.mockReturnValue({ data: { respondents: makeRoster(8) } });
    render(<RespondentsDrilldown occurrenceId="occ1" isAnonymous={false} />);
    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
  });
});

describe("RespondentsDrilldown search", () => {
  it("filters the roster by name", async () => {
    const user = userEvent.setup();
    mockRoster.mockReturnValue({
      data: {
        respondents: [
          { employeeId: "a", name: "Alice Smith", submitted: true },
          { employeeId: "b", name: "Bob Jones", submitted: true },
        ],
      },
    });
    render(<RespondentsDrilldown occurrenceId="occ1" isAnonymous={false} />);
    await user.type(screen.getByLabelText(/search respondents by name/i), "alice");
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.queryByText("Bob Jones")).not.toBeInTheDocument();
  });

  it("shows a 'showing N of M' hint while filtering", async () => {
    const user = userEvent.setup();
    mockRoster.mockReturnValue({ data: { respondents: makeRoster(25) } });
    render(<RespondentsDrilldown occurrenceId="occ1" isAnonymous={false} />);
    await user.type(screen.getByLabelText(/search respondents by name/i), "Person 1");
    // padded names "Person 00".."Person 24"; substring "Person 1" matches "Person 10".."Person 19" => 10 of 25
    expect(screen.getByText(/showing 10 of 25/i)).toBeInTheDocument();
  });

  it("resets paging to the first page when the query changes", async () => {
    const user = userEvent.setup();
    mockRoster.mockReturnValue({ data: { respondents: makeRoster(25) } });
    render(<RespondentsDrilldown occurrenceId="occ1" isAnonymous={false} />);
    await user.click(screen.getByRole("button", { name: /load more/i }));
    expect(screen.getByText("Person 10")).toBeInTheDocument();
    // typing a broad query that still matches >10 should collapse back to first 10 matches
    await user.type(screen.getByLabelText(/search respondents by name/i), "Person");
    expect(screen.getByText("Person 00")).toBeInTheDocument();
    expect(screen.getByText("Person 09")).toBeInTheDocument();
    expect(screen.queryByText("Person 10")).not.toBeInTheDocument();
  });

  it("shows an empty-match line when nothing matches", async () => {
    const user = userEvent.setup();
    mockRoster.mockReturnValue({ data: { respondents: makeRoster(5) } });
    render(<RespondentsDrilldown occurrenceId="occ1" isAnonymous={false} />);
    await user.type(screen.getByLabelText(/search respondents by name/i), "zzzz");
    expect(screen.getByText(/no one matches/i)).toBeInTheDocument();
  });
});
