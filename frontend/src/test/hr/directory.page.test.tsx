import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EmployeeListItem } from "@/modules/people/employees/types/employees.types";

const mockUseEmployees = jest.fn();
jest.mock("@/modules/people/employees/hooks/use-employees", () => ({
  useEmployees: (filters: unknown) => mockUseEmployees(filters),
}));

const mockUseTeams = jest.fn();
jest.mock("@/modules/people/teams/hooks/use-teams", () => ({
  useTeams: (filters: unknown) => mockUseTeams(filters),
}));

jest.mock("@/shared/hooks/use-debounce", () => ({
  useDebounce: <T,>(value: T) => value,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => "/hr/directory",
  useParams: () => ({}),
}));

import DirectoryPage from "@/screens/hr/directory.page";

const sample: EmployeeListItem[] = [
  {
    id: "1",
    userId: "user-1",
    firstName: "Ada",
    middleName: "Byron",
    lastName: "Lovelace",
    fullName: "Ada Byron Lovelace",
    companyEmail: "ada@acme.test",
    jobTitle: "Engineer",
    department: "R&D",
    teams: [
      { id: "team-1", name: "Platform" },
      { id: "team-2", name: "Research" },
      { id: "team-3", name: "Analytics" },
    ],
    supervisor: {
      id: "2",
      firstName: "Charles",
      lastName: "Babbage",
      fullName: "Charles Babbage",
      companyEmail: "charles@acme.test",
      jobTitle: "Engineering Manager",
    },
    status: "active",
  },
];

function renderPage() {
  return render(<DirectoryPage />);
}

function employeeHookResult(overrides: Record<string, unknown> = {}) {
  return {
    employees: sample,
    meta: { page: 1, limit: 10, total: 11, totalPages: 2 },
    loading: false,
    error: null,
    reload: jest.fn(),
    ...overrides,
  };
}

describe("DirectoryPage", () => {
  beforeEach(() => {
    mockUseTeams.mockReturnValue({
      teams: [
        { id: "team-1", name: "Platform" },
        { id: "team-2", name: "Research" },
      ],
      meta: { page: 1, limit: 100, total: 2, totalPages: 1 },
      loading: false,
      error: null,
      reload: jest.fn(),
    });
  });

  afterEach(() => jest.clearAllMocks());

  it("renders employee rows from the hook", () => {
    mockUseEmployees.mockReturnValue(employeeHookResult());
    renderPage();
    expect(screen.getByText("Ada Byron Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@acme.test")).toBeInTheDocument();
    expect(screen.getByText("Engineer")).toBeInTheDocument();
    expect(screen.getByText("R&D")).toBeInTheDocument();
    expect(screen.getByText("Charles Babbage")).toBeInTheDocument();
    expect(screen.getByText("Platform")).toBeInTheDocument();
    expect(screen.getByText("3+")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View Ada Byron Lovelace" })).not.toBeInTheDocument();
  });

  it("lists all teams in the team tooltip", async () => {
    mockUseEmployees.mockReturnValue(employeeHookResult());
    renderPage();

    await userEvent.hover(screen.getByText("Platform"));

    expect((await screen.findAllByText("Research")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Analytics").length).toBeGreaterThan(0);
  });

  it("passes search, team, and status filters to the employee hook", async () => {
    mockUseEmployees.mockReturnValue(employeeHookResult());
    renderPage();

    await userEvent.type(screen.getByLabelText("Search employees"), "ada");
    await userEvent.click(screen.getByLabelText("Filter by team"));
    await userEvent.click(screen.getByRole("option", { name: "Platform" }));
    await userEvent.click(screen.getByLabelText("Filter by status"));
    await userEvent.click(screen.getByRole("option", { name: "Active" }));

    expect(mockUseEmployees).toHaveBeenLastCalledWith({
      search: "ada",
      teamId: "team-1",
      status: "active",
      sortBy: "employeeName",
      sortDirection: "asc",
      page: 1,
      limit: 10,
    });
  });

  it("loads team options for the team filter", () => {
    mockUseEmployees.mockReturnValue(employeeHookResult());
    renderPage();

    expect(mockUseTeams).toHaveBeenCalledWith({ page: 1, limit: 100 });
    expect(screen.getByLabelText("Filter by team")).toHaveTextContent("All teams");
  });

  it("requests the next page from the pagination footer", async () => {
    mockUseEmployees.mockReturnValue(employeeHookResult());
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(mockUseEmployees).toHaveBeenLastCalledWith({
      search: undefined,
      teamId: undefined,
      status: undefined,
      sortBy: "employeeName",
      sortDirection: "asc",
      page: 2,
      limit: 10,
    });
  });

  it("requests descending sort when a sorted column header is clicked", async () => {
    mockUseEmployees.mockReturnValue(employeeHookResult());
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: /sort by employee name descending/i }));

    expect(mockUseEmployees).toHaveBeenLastCalledWith({
      search: undefined,
      teamId: undefined,
      status: undefined,
      sortBy: "employeeName",
      sortDirection: "desc",
      page: 1,
      limit: 10,
    });
  });

  it("shows the empty state when there are no employees", () => {
    mockUseEmployees.mockReturnValue(employeeHookResult({
      employees: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    }));
    renderPage();
    expect(screen.getByText("No employees yet")).toBeInTheDocument();
  });

  it("shows the error state when the query fails", () => {
    mockUseEmployees.mockReturnValue(employeeHookResult({ employees: [], error: "Boom" }));
    renderPage();
    expect(screen.getByText("Boom")).toBeInTheDocument();
  });
});
