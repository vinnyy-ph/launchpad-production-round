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

jest.mock("@/modules/people/employees/hooks/use-employee-activity-logs", () => ({
  useEmployeeActivityLogs: () => ({ logs: [], loading: false }),
}));

jest.mock("@/modules/people/employees/hooks/use-employee-documents", () => ({
  useEmployeeDocuments: () => ({ documents: [], loading: false }),
}));

// Onboarding hooks used by the shared AddEmployeeDialog (always mounted) and
// OnboardingCasesTable (rendered on the Onboarding tab).
const mockUseOnboardingRecords = jest.fn();
jest.mock("@/modules/people/onboarding/hooks/use-onboarding-records", () => ({
  useOnboardingRecords: () => mockUseOnboardingRecords(),
}));

jest.mock("@/modules/people/onboarding/hooks/use-onboard-employee", () => ({
  useOnboardEmployee: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/modules/people/onboarding/hooks/use-document-configs", () => ({
  useDocumentConfigs: () => ({ documents: [], loading: false, error: null, reload: jest.fn() }),
}));

const mockUpdateEmployee = jest.fn();
jest.mock("@/modules/people/employees/hooks/use-update-employee", () => ({
  useUpdateEmployee: () => ({
    update: mockUpdateEmployee,
    saving: false,
    error: null,
  }),
}));

const mockUseDepartments = jest.fn();
jest.mock("@/modules/people/departments/hooks/use-departments", () => ({
  useDepartments: () => mockUseDepartments(),
}));

const mockUseTeams = jest.fn();
jest.mock("@/modules/people/teams/hooks/use-teams", () => ({
  useTeams: (filters: unknown) => mockUseTeams(filters),
}));

jest.mock("@/shared/hooks/use-debounce", () => ({
  useDebounce: <T,>(value: T) => value,
}));

const mockReplace = jest.fn();
const mockSearchParamsGet = jest.fn((_key: string) => null as string | null);

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, prefetch: jest.fn() }),
  usePathname: () => "/hr/directory",
  useParams: () => ({}),
  useSearchParams: () => ({
    get: (key: string) => mockSearchParamsGet(key),
  }),
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
    avatarUrl: null,
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
    mockSearchParamsGet.mockImplementation((_key: string) => null);
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
    mockUseDepartments.mockReturnValue({
      departments: [
        { id: "dept-1", name: "R&D" },
        { id: "dept-2", name: "People Operations" },
      ],
      loading: false,
      error: null,
      reload: jest.fn(),
    });
    mockUseOnboardingRecords.mockReturnValue({
      employees: [],
      reviews: [],
      invitationStatusByEmployeeId: new Map(),
      statusByEmployeeId: new Map(),
      loading: false,
      error: null,
      reload: jest.fn(),
    });
    mockUpdateEmployee.mockResolvedValue({ data: sampleProfile });
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
    expect(screen.getByText("Research")).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View Ada Byron Lovelace" })).not.toBeInTheDocument();
  });

  it("opens the employee details modal when an employee row is clicked", async () => {
    mockUseEmployees.mockReturnValue(employeeHookResult());
    renderPage();

    await userEvent.click(screen.getByText("Ada Byron Lovelace"));

    expect(mockUseEmployeeProfile).toHaveBeenLastCalledWith("1");
    expect(screen.getAllByText("Ada Byron Lovelace").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("navigation", { name: "Employee details sections" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Personal Information" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Employment Details" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Teams" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Documents" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activity History" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Process offboarding" })).toBeInTheDocument();
    expect(screen.getAllByText("Employee details").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /save changes/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /discard/i })).not.toBeInTheDocument();
    expect(screen.getAllByText("Personal Information").length).toBeGreaterThan(0);
    expect(screen.queryByText("Government & Compliance")).not.toBeInTheDocument();
    expect(screen.getByLabelText("First name")).toHaveValue("Ada");
    expect(screen.getByLabelText("Middle name")).toHaveValue("Byron");
    expect(screen.getByLabelText("Last name")).toHaveValue("Lovelace");
    expect(screen.getByLabelText("Personal email")).toHaveValue("ada.lovelace@example.test");
    expect(screen.getByLabelText("Company email")).toHaveValue("ada@acme.test");
    // Country/Province/City are now dropdowns; stored values render as the selected label.
    expect(screen.getAllByText("United Kingdom").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Greater London").length).toBeGreaterThan(0);
    expect(screen.getAllByText("London").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Street address")).toHaveValue("12 Analytical Engine Lane");
    expect(screen.getByLabelText("Contact Name")).toHaveValue("Charles Babbage");
    expect(screen.getByLabelText("Contact Number")).toHaveValue("+44 20 5555 0100");
    expect(screen.queryByText("System Role")).not.toBeInTheDocument();
    expect(screen.queryByText("Created")).not.toBeInTheDocument();
    expect(screen.queryByText("Last Updated")).not.toBeInTheDocument();
    expect(screen.getAllByText("Supervisor").length).toBeGreaterThan(0);
    expect(screen.getByText("Assign supervisor")).toBeInTheDocument();
    expect(screen.getByText("Mathematics")).toBeInTheDocument();
    expect(screen.getByText("No documents yet")).toBeInTheDocument();
    expect(screen.getByText("Profile Field Changes")).toBeInTheDocument();
    expect(screen.getByText("No activity yet")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("First name"), "s");

    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /discard/i })).toBeInTheDocument();
  });

  it("lists overflow teams in the team tooltip", async () => {
    mockUseEmployees.mockReturnValue(employeeHookResult());
    renderPage();

    await userEvent.hover(screen.getByRole("button", { name: "1 more teams" }));

    expect((await screen.findAllByText("More Teams:")).length).toBeGreaterThan(0);
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

    expect(mockUseEmployees).toHaveBeenCalledWith({
      search: "ada",
      teamIds: ["team-1"],
      statuses: ["active"],
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

    expect(mockUseEmployees).toHaveBeenCalledWith({
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

    expect(mockUseEmployees).toHaveBeenCalledWith({
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

  it("renders onboarding cases when ?tab=onboarding is in the URL", () => {
    mockSearchParamsGet.mockImplementation((key: string) => (key === "tab" ? "onboarding" : null));
    mockUseEmployees.mockReturnValue(employeeHookResult());
    renderPage();

    expect(screen.getByLabelText("Search onboarding cases")).toBeInTheDocument();
    expect(screen.getByText("No one's onboarding right now")).toBeInTheDocument();
    expect(screen.queryByLabelText("Search employees")).not.toBeInTheDocument();
  });

  it("summarizes invite and onboarding progress on the onboarding tab", () => {
    const onboardingEmployee: EmployeeListItem = {
      ...sample[0],
      id: "onboarding-1",
      fullName: "Grace Hopper",
      firstName: "Grace",
      lastName: "Hopper",
      companyEmail: "grace@acme.test",
      status: "onboarding",
    };
    mockUseOnboardingRecords.mockReturnValue({
      employees: [onboardingEmployee],
      reviews: [],
      invitationStatusByEmployeeId: new Map([["onboarding-1", "accepted"]]),
      statusByEmployeeId: new Map([
        [
          "onboarding-1",
          {
            recordId: "record-1",
            isComplete: false,
            completedAt: null,
            invitationStatus: "accepted",
            profile: {
              firstName: "Grace",
              lastName: "Hopper",
              middleName: null,
              personalEmail: null,
              birthday: null,
              address: null,
              emergencyContact: null,
              jobTitle: "Engineer",
              department: "R&D",
            },
            documents: [
              {
                id: "doc-1",
                documentName: "ID",
                instructions: null,
                allowedFileTypes: "pdf",
                isRequired: true,
                latestSubmission: { id: "sub-1", fileUrl: "https://example.test/id.pdf", status: "approved", rejectionNote: null, submittedAt: "2026-06-01T00:00:00.000Z", reviewedAt: null },
              },
              {
                id: "doc-2",
                documentName: "Contract",
                instructions: null,
                allowedFileTypes: "pdf",
                isRequired: true,
                latestSubmission: null,
              },
            ],
            customFields: [
              { id: "field-1", fieldLabel: "Shirt size", isRequired: true, value: "M" },
            ],
          },
        ],
      ]),
      loading: false,
      error: null,
      reload: jest.fn(),
    });
    mockSearchParamsGet.mockImplementation((key: string) => (key === "tab" ? "onboarding" : null));
    mockUseEmployees.mockReturnValue(employeeHookResult());

    renderPage();

    expect(screen.getByText("Pending invites")).toBeInTheDocument();
    expect(screen.getByText("Invite issues")).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("Ready for review")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.getByText("Accepted")).toBeInTheDocument();
    expect(screen.getByText("1/2 approved")).toBeInTheDocument();
    expect(screen.getByText("1/1 filled")).toBeInTheDocument();
    expect(screen.getByText("Documents pending")).toBeInTheDocument();
  });
});
