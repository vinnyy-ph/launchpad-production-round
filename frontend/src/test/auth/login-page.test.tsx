import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "@/screens/auth/login.page";
import { signInWithGoogle } from "@/modules/auth/services/auth.service";
import { useAuthStore } from "@/modules/auth/stores/auth.store";

jest.mock("sonner", () => ({
  toast: {
    dismiss: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/modules/auth/services/auth.service", () => ({
  signInWithGoogle: jest.fn(),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ appUser: null, loading: false, authError: null });
  });

  it("shows the session error on the login form", () => {
    useAuthStore.setState({ authError: "Account deactivated" });

    render(<LoginPage />);

    expect(screen.getByRole("alert")).toHaveTextContent("Account deactivated");
  });

  it("signs in with session persistence when remember me is unchecked", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: /continue with google/i }));

    expect(signInWithGoogle).toHaveBeenCalledWith(false);
  });

  it("signs in with local persistence when remember me is checked", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole("checkbox", { name: /remember me/i }));
    await user.click(screen.getByRole("button", { name: /continue with google/i }));

    expect(signInWithGoogle).toHaveBeenCalledWith(true);
  });
});
