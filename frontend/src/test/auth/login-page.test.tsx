import { render, screen } from "@testing-library/react";
import LoginPage from "@/screens/auth/login.page";
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
    useAuthStore.setState({ appUser: null, loading: false, authError: null });
  });

  it("shows the session error on the login form", () => {
    useAuthStore.setState({ authError: "Account deactivated" });

    render(<LoginPage />);

    expect(screen.getByRole("alert")).toHaveTextContent("Account deactivated");
  });
});
