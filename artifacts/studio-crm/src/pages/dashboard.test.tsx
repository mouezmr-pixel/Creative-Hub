import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Dashboard from "../pages/dashboard";
import { useAuth } from "@/lib/auth";

vi.mock("@workspace/api-client-react", () => ({
  useGetAnalyticsSummary: vi.fn(() => ({
    data: {
      totalRevenue: 100000,
      totalCollected: 75000,
      projectsCount: 25,
      revenueByCurrency: { DZD: 100000 },
      collectedByCurrency: { DZD: 75000 },
    },
    isLoading: false,
  })),
  useListProjects: vi.fn(() => ({
    data: [
      {
        id: 1,
        title: "Test Project",
        clientName: "Test Client",
        photographerName: "Photographer",
        status: "in_progress",
        progress: 50,
        remainingDebt: 5000,
        currency: "DZD",
        createdAt: new Date().toISOString(),
      },
    ],
    isLoading: false,
  })),
  useListLeads: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
}));

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
}

describe("Dashboard page", () => {
  it("renders the dashboard with analytics data", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, username: "admin", role: "admin", name: "Admin" } as any,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderDashboard();

    expect(screen.getAllByText("projects").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Test Project")).toBeInTheDocument();
  });

  it("renders project tabs", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, username: "admin", role: "admin", name: "Admin" } as any,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderDashboard();

    expect(screen.getByText("all")).toBeInTheDocument();
    expect(screen.getByText("in_progress")).toBeInTheDocument();
    expect(screen.getByText("completed")).toBeInTheDocument();
  });
});
