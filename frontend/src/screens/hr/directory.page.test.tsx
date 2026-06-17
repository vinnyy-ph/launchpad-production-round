import { render, screen } from "@testing-library/react";
import type { EmployeeListItem } from "@/modules/people/employees/types/employees.types";

const mockUseEmployees = jest.fn();
jest.mock("@/modules/people/employees/hooks/use-employees", () => ({
  useEmployees: () => mockUseEmployees(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => "/hr/directory",
  useParams: () => ({}),
}));

import DirectoryPage from "./directory.page";

const sample: EmployeeListItem[] = [
  {
    id: "1",
    firstName: "Ada",
    lastName: "Lovelace",
    companyEmail: "ada@acme.test",
    jobTitle: "Engineer",
    departmentName: "R&D",
    supervisorName: "Charles",
    employeeStatus: "ACTIVE",
  },
];

function renderPage() {
  return render(<DirectoryPage />);
}

describe("DirectoryPage", () => {
  afterEach(() => jest.clearAllMocks());

  it("renders employee rows from the hook", () => {
    mockUseEmployees.mockReturnValue({ employees: sample, loading: false, error: null, reload: jest.fn() });
    renderPage();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@acme.test")).toBeInTheDocument();
    expect(screen.getByText("Engineer")).toBeInTheDocument();
    expect(screen.getByText("Charles")).toBeInTheDocument();
  });

  it("shows the empty state when there are no employees", () => {
    mockUseEmployees.mockReturnValue({ employees: [], loading: false, error: null, reload: jest.fn() });
    renderPage();
    expect(screen.getByText("No employees yet")).toBeInTheDocument();
  });

  it("shows the error state when the query fails", () => {
    mockUseEmployees.mockReturnValue({ employees: [], loading: false, error: "Boom", reload: jest.fn() });
    renderPage();
    expect(screen.getByText("Boom")).toBeInTheDocument();
  });
});
