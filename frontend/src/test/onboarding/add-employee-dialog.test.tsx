import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddEmployeeDialog } from "@/modules/people/onboarding/components/add-employee-dialog";

const mockToastError = jest.fn();
const mockToastDismiss = jest.fn();

jest.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: jest.fn(),
    warning: jest.fn(),
    dismiss: (...args: unknown[]) => mockToastDismiss(...args),
  },
}));

jest.mock("@/modules/people/employees/hooks/use-employees", () => ({
  useEmployees: () => ({ employees: [], loading: false, error: null, reload: jest.fn() }),
  useAllEmployees: () => ({ employees: [], loading: false, error: null, reload: jest.fn() }),
}));

jest.mock("@/modules/people/departments/hooks/use-departments", () => ({
  useDepartments: () => ({ departments: [{ id: "dept-1", name: "People Operations" }], loading: false }),
}));

jest.mock("@/modules/people/onboarding/hooks/use-onboard-employee", () => ({
  useOnboardEmployee: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/modules/people/onboarding/hooks/use-document-configs", () => ({
  useDocumentConfigs: () => ({ documents: [], loading: false, error: null, reload: jest.fn() }),
}));

jest.mock("@/modules/people/onboarding/services/onboarding.service", () => ({
  sendInvitation: jest.fn(),
}));

function Harness() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Reopen dialog
      </button>
      <AddEmployeeDialog open={open} onOpenChange={setOpen} onStarted={jest.fn()} />
    </>
  );
}

describe("AddEmployeeDialog unsaved changes", () => {
  beforeEach(() => {
    mockToastError.mockClear();
    mockToastDismiss.mockClear();
  });

  it("closes with Cancel when the form is empty", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("blocks close and shows an add-specific warning when the form has data", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText(/first name/i), "Maria");
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "There are unsaved changes. Send the invite or discard them before closing.",
        expect.objectContaining({ position: "top-center" }),
      );
    });
  });

  it("shows Discard instead of Cancel when the form has data", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Discard" })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/first name/i), "Maria");

    expect(screen.getByRole("button", { name: "Discard" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("clears the form on Discard so the dialog can close", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const firstName = screen.getByLabelText(/first name/i);
    await user.type(firstName, "Maria");
    expect(firstName).toHaveValue("Maria");

    await user.click(screen.getByRole("button", { name: "Discard" }));

    await waitFor(() => {
      expect(firstName).toHaveValue("");
    });
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
