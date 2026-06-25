import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  BulkUploadDropzone,
  fieldLabel,
  normalizeSpreadsheetRow,
  OPTIONAL_COLUMNS,
  REQUIRED_COLUMNS,
  TEMPLATE_SAMPLE_ROWS,
  TEMPLATE_COLUMNS,
} from "@/modules/people/onboarding/components/bulk/bulk-upload-dropzone";
import type { BulkOnboardingPreviewResult } from "@/modules/people/onboarding/types/onboarding.types";

const mutatePreview = jest.fn();
const mutateCommit = jest.fn();

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock("@/modules/people/employees/hooks/use-employees", () => ({
  useAllEmployees: () => ({
    employees: [
      {
        id: "supervisor-1",
        userId: "user-1",
        firstName: "Jane",
        middleName: null,
        lastName: "Manager",
        fullName: "Jane Manager",
        companyEmail: "jane.manager@example.com",
        avatarUrl: null,
        jobTitle: "Engineering Manager",
        department: "Engineering",
        address: null,
        emergencyContact: null,
        teams: [],
        supervisor: null,
        status: "active",
      },
    ],
    loading: false,
    error: null,
    reload: jest.fn(),
  }),
}));

jest.mock("@/modules/people/departments/hooks/use-departments", () => ({
  useDepartments: () => ({
    departments: [{ id: "dept-1", name: "Engineering" }],
    loading: false,
    error: null,
    reload: jest.fn(),
  }),
}));

jest.mock("xlsx", () => ({
  read: jest.fn(() => ({ SheetNames: ["Bulk onboarding"], Sheets: { "Bulk onboarding": {} } })),
  utils: {
    sheet_to_json: jest.fn(() => [
      {
        companyEmail: "new.hire@example.com",
        firstName: "New",
        lastName: "Hire",
        jobTitle: "Engineer",
        department: "Engineering",
        supervisorEmail: "jane.manager@example.com",
      },
    ]),
    json_to_sheet: jest.fn(() => ({})),
    book_new: jest.fn(() => ({})),
    book_append_sheet: jest.fn(),
  },
  writeFile: jest.fn(),
}));

jest.mock("@/modules/people/onboarding/hooks/use-bulk-upload", () => ({
  useBulkOnboardingPreview: () => ({
    mutate: mutatePreview,
    isPending: false,
  }),
  useBulkOnboardingCommit: () => ({
    mutate: mutateCommit,
    isPending: false,
  }),
}));

function xlsxTestFile(): File {
  const bytes = new Uint8Array(128);
  bytes[0] = 0x50;
  bytes[1] = 0x4b;
  bytes[2] = 0x03;
  bytes[3] = 0x04;
  const marker = "[Content_Types].xml";
  for (let index = 0; index < marker.length; index += 1) {
    bytes[30 + index] = marker.charCodeAt(index);
  }

  const file = new File([bytes], "bulk.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  Object.defineProperty(file, "arrayBuffer", {
    value: jest.fn().mockResolvedValue(bytes.buffer),
  });
  Object.defineProperty(file, "slice", {
    value: (_start?: number, _end?: number) => file,
  });

  return file;
}

function renderDropzone(preview: BulkOnboardingPreviewResult) {
  mutatePreview.mockImplementation((_rows, options) => {
    options.onSuccess(preview);
  });

  render(<BulkUploadDropzone open onOpenChange={jest.fn()} />);
  const input = document.querySelector("input[type='file']") as HTMLInputElement;
  const file = xlsxTestFile();

  fireEvent.change(input, { target: { files: [file] } });

  return input;
}

describe("BulkUploadDropzone supervisor email flow", () => {
  beforeEach(() => {
    mutatePreview.mockReset();
    mutateCommit.mockReset();
  });

  it("uses supervisorEmail in the generated template columns", () => {
    expect(REQUIRED_COLUMNS).toContain("supervisorEmail");
    expect(TEMPLATE_COLUMNS).toContain("supervisorEmail");
    expect(TEMPLATE_COLUMNS).not.toContain("supervisorId");
  });

  it("leaves optional personal fields blank in template sample rows", () => {
    for (const row of TEMPLATE_SAMPLE_ROWS) {
      for (const column of OPTIONAL_COLUMNS) {
        expect(row[column]).toBe("");
      }
    }
  });

  it("maps supervisor email aliases from spreadsheets", () => {
    expect(
      normalizeSpreadsheetRow(
        {
          "Manager Email": "jane.manager@example.com",
          Email: "new.hire@example.com",
        },
        1,
      ),
    ).toMatchObject({
      rowNumber: 1,
      companyEmail: "new.hire@example.com",
      supervisorEmail: "jane.manager@example.com",
    });

    expect(
      normalizeSpreadsheetRow(
        {
          Supervisor: "jane.manager@example.com",
        },
        2,
      ),
    ).toMatchObject({
      rowNumber: 2,
      supervisorEmail: "jane.manager@example.com",
    });
  });

  it("labels supervisor errors as supervisor", () => {
    expect(fieldLabel("supervisorEmail")).toBe("Supervisor");
    expect(fieldLabel("supervisorId")).toBe("Supervisor");
  });

  it("shows the updated subtitle, check rows button, and primary CTA", () => {
    render(<BulkUploadDropzone open onOpenChange={jest.fn()} />);

    expect(
      screen.getByText(
        "Upload an .xlsx with one employee per row. Every row is checked before any records are created.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create and send invites" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("shows department and supervisor pickers in the review table", async () => {
    renderDropzone({
      totalRows: 1,
      validRows: 1,
      invalidRows: 0,
      errors: [],
      rows: [
        {
          rowNumber: 1,
          employeeName: "New Hire",
          companyEmail: "new.hire@example.com",
          jobTitle: "Engineer",
          department: "Engineering",
          supervisorEmail: "jane.manager@example.com",
          supervisorName: "Jane Manager",
          status: "valid",
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Row 1 department")).toBeInTheDocument();
    });
    expect(screen.getByRole("combobox", { name: "" })).toBeInTheDocument();
    expect(screen.queryByText("Start with the template")).not.toBeInTheDocument();
    expect(screen.getByText("bulk.xlsx")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check rows" })).toBeInTheDocument();
  });

  it("shows supervisor validation errors in the error panel", async () => {
    renderDropzone({
      totalRows: 1,
      validRows: 0,
      invalidRows: 1,
      errors: [
        {
          rowNumber: 1,
          field: "supervisorEmail",
          message: "Supervisor not found.",
        },
      ],
      rows: [
        {
          rowNumber: 1,
          employeeName: "New Hire",
          companyEmail: "new.hire@example.com",
          jobTitle: "Engineer",
          department: "Engineering",
          supervisorEmail: "jane.manager@example.com",
          supervisorName: null,
          status: "invalid",
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getAllByText("Supervisor not found.").length).toBeGreaterThan(0);
    });
  });

  it("removes the uploaded file when the chip remove button is clicked", async () => {
    renderDropzone({
      totalRows: 1,
      validRows: 1,
      invalidRows: 0,
      errors: [],
      rows: [
        {
          rowNumber: 1,
          employeeName: "New Hire",
          companyEmail: "new.hire@example.com",
          jobTitle: "Engineer",
          department: "Engineering",
          supervisorEmail: "jane.manager@example.com",
          supervisorName: "Jane Manager",
          status: "valid",
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByText("bulk.xlsx")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Remove bulk.xlsx" }));

    expect(screen.queryByText("bulk.xlsx")).not.toBeInTheDocument();
    expect(screen.getByText("Start with the template")).toBeInTheDocument();
  });

  it("shows Clear instead of Cancel after a file is uploaded", async () => {
    renderDropzone({
      totalRows: 1,
      validRows: 1,
      invalidRows: 0,
      errors: [],
      rows: [
        {
          rowNumber: 1,
          employeeName: "New Hire",
          companyEmail: "new.hire@example.com",
          jobTitle: "Engineer",
          department: "Engineering",
          supervisorEmail: "jane.manager@example.com",
          supervisorName: "Jane Manager",
          status: "valid",
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByText("Start with the template")).toBeInTheDocument();
  });

  it("marks rows stale on edit and re-checks only when Check rows is clicked", async () => {
    renderDropzone({
      totalRows: 1,
      validRows: 1,
      invalidRows: 0,
      errors: [],
      rows: [
        {
          rowNumber: 1,
          employeeName: "New Hire",
          companyEmail: "new.hire@example.com",
          jobTitle: "Engineer",
          department: "Engineering",
          supervisorEmail: "jane.manager@example.com",
          supervisorName: "Jane Manager",
          status: "valid",
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Row 1 first name")).toBeInTheDocument();
    });

    mutatePreview.mockClear();
    fireEvent.change(screen.getByLabelText("Row 1 first name"), {
      target: { value: "Updated" },
    });

    expect(mutatePreview).not.toHaveBeenCalled();
    expect(screen.getByText("Changes not checked yet")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Check rows" }));

    await waitFor(() => {
      expect(mutatePreview).toHaveBeenCalled();
    });
  });

  it("shows required, empty-space, unsafe text, and profanity errors live on edit", async () => {
    renderDropzone({
      totalRows: 1,
      validRows: 1,
      invalidRows: 0,
      errors: [],
      rows: [
        {
          rowNumber: 1,
          employeeName: "New Hire",
          companyEmail: "new.hire@example.com",
          jobTitle: "Engineer",
          department: "Engineering",
          supervisorEmail: "jane.manager@example.com",
          supervisorName: "Jane Manager",
          status: "valid",
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Row 1 first name")).toBeInTheDocument();
    });

    mutatePreview.mockClear();
    fireEvent.change(screen.getByLabelText("Row 1 first name"), { target: { value: "f*ck" } });
    fireEvent.change(screen.getByLabelText("Row 1 last name"), { target: { value: "   " } });
    fireEvent.change(screen.getByLabelText("Row 1 job title"), {
      target: { value: "<script>alert(1)</script>" },
    });
    fireEvent.change(screen.getByLabelText("Row 1 work email"), {
      target: { value: "" },
    });

    expect(mutatePreview).not.toHaveBeenCalled();
    expect(screen.getAllByText("Work email is required.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Last name cannot be empty spaces.").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(
        "Please enter a valid job title using letters, numbers, spaces, and common punctuation only.",
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Please remove any offensive or inappropriate language.").length,
    ).toBeGreaterThan(0);
  });

  it("highlights duplicate work email errors in the error panel", async () => {
    renderDropzone({
      totalRows: 1,
      validRows: 0,
      invalidRows: 1,
      errors: [
        {
          rowNumber: 1,
          field: "companyEmail",
          message: "An employee with this email already exists.",
        },
      ],
      rows: [
        {
          rowNumber: 1,
          employeeName: "New Hire",
          companyEmail: "new.hire@example.com",
          jobTitle: "Engineer",
          department: "Engineering",
          supervisorEmail: "jane.manager@example.com",
          supervisorName: "Jane Manager",
          status: "invalid",
        },
      ],
    });

    await waitFor(() => {
      expect(
        screen.getAllByText("An employee with this email already exists.").length,
      ).toBeGreaterThan(0);
    });
    expect(screen.getByLabelText("Row 1 work email")).toHaveAttribute("aria-invalid", "true");
  });

  it("maps invalid API field errors to friendly copy", async () => {
    renderDropzone({
      totalRows: 1,
      validRows: 0,
      invalidRows: 1,
      errors: [
        {
          rowNumber: 1,
          field: "companyEmail",
          message: "Invalid companyEmail",
        },
      ],
      rows: [
        {
          rowNumber: 1,
          employeeName: "New Hire",
          companyEmail: "new.hire",
          jobTitle: "Engineer",
          department: "Engineering",
          supervisorEmail: "jane.manager@example.com",
          supervisorName: "Jane Manager",
          status: "invalid",
        },
      ],
    });

    await waitFor(() => {
      expect(
        screen.getAllByText("Please enter a valid work email address.").length,
      ).toBeGreaterThan(0);
    });
    expect(screen.queryByText("Invalid companyEmail")).not.toBeInTheDocument();
  });

  it("shows required, unsafe text, and profanity row messages", async () => {
    renderDropzone({
      totalRows: 1,
      validRows: 0,
      invalidRows: 1,
      errors: [
        {
          rowNumber: 1,
          field: "firstName",
          message: "First name is required.",
        },
        {
          rowNumber: 1,
          field: "lastName",
          message: "Last name cannot be empty spaces.",
        },
        {
          rowNumber: 1,
          field: "jobTitle",
          message: "Job title must not contain HTML or control characters",
        },
        {
          rowNumber: 1,
          field: "department",
          message: "Please remove any offensive or inappropriate language.",
        },
      ],
      rows: [
        {
          rowNumber: 1,
          employeeName: "-",
          companyEmail: "new.hire@example.com",
          jobTitle: "<script>alert(1)</script>",
          department: "f*ck",
          supervisorEmail: "jane.manager@example.com",
          supervisorName: "Jane Manager",
          status: "invalid",
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getAllByText("First name is required.").length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("Last name cannot be empty spaces.").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(
        "Please enter a valid job title using letters, numbers, spaces, and common punctuation only.",
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Please remove any offensive or inappropriate language.").length,
    ).toBeGreaterThan(0);
  });
});
