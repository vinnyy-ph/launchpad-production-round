import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EmployeeListItem } from "@/modules/people/employees/types/employees.types";

const mockUseEmployees = jest.fn();
jest.mock("@/modules/people/employees/hooks/use-employees", () => ({
  useEmployees: (filters: unknown) => mockUseEmployees(filters),
}));

const mockUseEmployeeProfile = jest.fn();
jest.mock("@/modules/people/employees/hooks/use-employee-profile", () => ({
  useEmployeeProfile: (employeeId: string | null) => mockUseEmployeeProfile(employeeId),
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
    address: {
      address: "12 Analytical Engine Lane",
      city: "London",
      province: "Greater London",
      country: "United Kingdom",
    },
    emergencyContact: {
      emergencyContactName: "Charles Babbage",
      emergencyContactNumber: "+44 20 5555 0100",
    },
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

const sampleProfile = {
  ...sample[0],
  user: { id: "user-1", email: "ada@acme.test", role: "EMPLOYEE", isActive: true },
  personalEmail: "ada.lovelace@example.test",
  birthday: "1815-12-10T00:00:00.000Z",
  ledTeams: [{ id: "team-4", name: "Mathematics" }],
  directReports: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-06-18T00:00:00.000Z",
};

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
    mockUseEmployeeProfile.mockReturnValue({
      employee: sampleProfile,
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

  it("opens the employee details modal when an employee row is clicked", async () => {
    mockUseEmployees.mockReturnValue(employeeHookResult());
    renderPage();

    await userEvent.click(screen.getByText("Ada Byron Lovelace"));

    expect(mockUseEmployeeProfile).toHaveBeenLastCalledWith("1");
    expect(screen.getAllByText("Ada Byron Lovelace").length).toBeGreaterThan(0);
    expect(screen.getByRole("tab", { name: "Personal Information" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Employment" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByRole("tab", { name: "Documents" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Activity" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Process offboarding" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download file/i })).toBeInTheDocument();
    expect(screen.getByText("Ada Byron Lovelace File")).toBeInTheDocument();
    expect(screen.getAllByText("Personal Information").length).toBeGreaterThan(0);
    expect(screen.getByText("Government & Compliance")).toBeInTheDocument();
    expect(screen.getByText("Company Email")).toBeInTheDocument();
    expect(screen.getByText("ada.lovelace@example.test")).toBeInTheDocument();
    expect(screen.getByText("12 Analytical Engine Lane, London, Greater London, United Kingdom")).toBeInTheDocument();
    expect(screen.getByText("Charles Babbage, +44 20 5555 0100")).toBeInTheDocument();
    expect(screen.queryByText("System Role")).not.toBeInTheDocument();
    expect(screen.queryByText("Created")).not.toBeInTheDocument();
    expect(screen.queryByText("Last Updated")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Employment" }));

    expect(screen.getByRole("tab", { name: "Employment" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Direct Manager")).toBeInTheDocument();
    expect(screen.getByText("Mathematics")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Activity" }));
    expect(screen.getByRole("tab", { name: "Activity" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("No activity history yet")).toBeInTheDocument();
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
