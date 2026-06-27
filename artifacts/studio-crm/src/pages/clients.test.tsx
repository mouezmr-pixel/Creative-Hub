import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Clients from "../pages/clients";
import { useAuth } from "@/lib/auth";

vi.mock("@workspace/api-client-react", () => ({
  useListClients: vi.fn(() => ({
    data: [
      {
        id: 1,
        name: "Sarah Johnson",
        email: "sarah@example.com",
        phone: "0555123456",
        photographerName: "Alex Dupont",
        loginUsername: "client1",
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        name: "Omar Khalid",
        email: "omar@example.com",
        phone: "0666123456",
        photographerName: null,
        loginUsername: "client2",
        createdAt: new Date().toISOString(),
      },
    ],
    isLoading: false,
  })),
  useCreateClient: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 3, name: "New Client" }),
    isLoading: false,
  })),
  useDeleteClient: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isLoading: false,
  })),
  getListClientsQueryKey: vi.fn(() => ["listClients"]),
}));

function renderClients() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Clients />
    </QueryClientProvider>
  );
}

describe("Clients page", () => {
  it("renders client list", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, username: "admin", role: "admin", name: "Admin" } as any,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderClients();

    expect(screen.getByText("Sarah Johnson")).toBeInTheDocument();
    expect(screen.getByText("Omar Khalid")).toBeInTheDocument();
  });

  it("filters clients by search", async () => {
    const user = userEvent.setup();

    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, username: "admin", role: "admin", name: "Admin" } as any,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderClients();

    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, "Sarah");

    await waitFor(() => {
      expect(screen.getByText("Sarah Johnson")).toBeInTheDocument();
      expect(screen.queryByText("Omar Khalid")).not.toBeInTheDocument();
    });
  });

  it("shows create client dialog on button click", async () => {
    const user = userEvent.setup();

    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, username: "admin", role: "admin", name: "Admin" } as any,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderClients();

    const createButton = screen.getByText(/newClient|create client/i);
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /create|submit/i })).toBeInTheDocument();
    });
  });
});
