import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoleSwitcher } from "./role-switcher";
import { setView } from "@/modules/auth/stores/auth.store";

const pushMock = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock, refresh: jest.fn() }) }));

describe("RoleSwitcher", () => {
  beforeEach(() => { pushMock.mockClear(); setView("ADMIN"); });

  it("shows the active view and routes when switching to HR", async () => {
    render(<RoleSwitcher />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /viewing as/i }));
    await userEvent.click(screen.getByRole("menuitemradio", { name: "HR" }));
    expect(pushMock).toHaveBeenCalledWith("/hr/directory");
  });
});
