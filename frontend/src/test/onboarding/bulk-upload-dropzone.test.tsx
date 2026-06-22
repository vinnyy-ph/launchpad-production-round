import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  BulkUploadDropzone,
  fieldLabel,
  normalizeSpreadsheetRow,
  REQUIRED_COLUMNS,
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

function renderDropzone(preview: BulkOnboardingPreviewResult) {
  mutatePreview.mockImplementation((_rows, options) => {
    options.onSuccess(preview);
  });

  render(<BulkUploadDropzone open onOpenChange={jest.fn()} />);
  const input = document.querySelector("input[type='file']") as HTMLInputElement;
  const file = new File(["content"], "bulk.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  Object.defineProperty(file, "arrayBuffer", {
    value: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
  });

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

  it("maps supervisor email aliases from spreadsheets", () => {
    expect(
      normalizeSpreadsheetRow(
        {
          "Manager Email": "jane.manager@example.com",
          Email: "new.hire@example.com",
        },
        2,
      ),
    ).toMatchObject({
      rowNumber: 2,
      companyEmail: "new.hire@example.com",
      supervisorEmail: "jane.manager@example.com",
    });

    expect(
      normalizeSpreadsheetRow(
        {
          Supervisor: "jane.manager@example.com",
        },
        3,
      ),
    ).toMatchObject({
      rowNumber: 3,
      supervisorEmail: "jane.manager@example.com",
    });
  });

  it("labels supervisor errors as supervisor email", () => {
    expect(fieldLabel("supervisorEmail")).toBe("Supervisor email");
    expect(fieldLabel("supervisorId")).toBe("Supervisor email");
  });

  it("shows resolved supervisor name and email in the review table", async () => {
    renderDropzone({
      totalRows: 1,
      validRows: 1,
      invalidRows: 0,
      errors: [],
      rows: [
        {
          rowNumber: 2,
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
      expect(screen.getByText("Jane Manager")).toBeInTheDocument();
    });
    expect(screen.getByText("jane.manager@example.com")).toBeInTheDocument();
  });

  it("shows supervisor not found for unresolved supervisor emails", async () => {
    renderDropzone({
      totalRows: 1,
      validRows: 0,
      invalidRows: 1,
      errors: [
        {
          rowNumber: 2,
          field: "supervisorEmail",
          message: "Supervisor not found.",
        },
      ],
      rows: [
        {
          rowNumber: 2,
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
      expect(screen.getByText("Supervisor not found")).toBeInTheDocument();
    });
    expect(screen.getAllByText("jane.manager@example.com").length).toBeGreaterThan(0);
  });
});
