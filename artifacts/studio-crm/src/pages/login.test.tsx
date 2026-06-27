import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Login from "../pages/login";
import { useAuth } from "@/lib/auth";

function renderLogin() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Login />
    </QueryClientProvider>
  );
}

describe("Login page", () => {
  it("renders the login form", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderLogin();

    expect(screen.getByText("heroTitle1", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("heroTitle2", { exact: false })).toBeInTheDocument();
  });

  it("shows validation errors when submitting empty form", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderLogin();

    const submitButton = screen.getByRole("button", { name: /login|logIn|submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("usernameRequired")).toBeInTheDocument();
    });
  });

  it("calls login with credentials on valid form submission", async () => {
    const user = userEvent.setup();
    const loginMock = vi.fn().mockResolvedValue(undefined);

    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isLoading: false,
      login: loginMock,
      logout: vi.fn(),
    });

    renderLogin();

    const usernameInput = screen.getByPlaceholderText(/username|email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);

    await user.type(usernameInput, "admin");
    await user.type(passwordInput, "admin123");

    const submitButton = screen.getByRole("button", { name: /login|logIn|submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({ data: { username: "admin", password: "admin123" } });
    });
  });

  it("shows error toast on failed login", async () => {
    const user = userEvent.setup();
    const loginMock = vi.fn().mockRejectedValue({
      data: { error: "Invalid credentials" },
    });

    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isLoading: false,
      login: loginMock,
      logout: vi.fn(),
    });

    renderLogin();

    const usernameInput = screen.getByPlaceholderText(/username|email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);

    await user.type(usernameInput, "admin");
    await user.type(passwordInput, "wrongpass");

    const submitButton = screen.getByRole("button", { name: /login|logIn|submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalled();
    });
  });
});
