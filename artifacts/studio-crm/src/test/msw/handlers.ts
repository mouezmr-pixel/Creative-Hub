import { http, HttpResponse } from "msw";
import type { User } from "@workspace/api-client-react";

export const mockAdminUser: User = {
  id: 1,
  username: "admin",
  name: "Studio Admin",
  email: "admin@creativestudio.com",
  role: "admin",
  profession: null,
  canViewFinancials: false,
  canManageClients: false,
  canManageAllProjects: false,
  canInvoice: false,
  canViewLeads: false,
  canViewAccounting: false,
  createdAt: new Date().toISOString(),
};

export const mockPhotographerUser: User = {
  id: 2,
  username: "photographer1",
  name: "Alex Dupont",
  email: "alex@creativestudio.com",
  role: "photographer",
  profession: "photographer",
  canViewFinancials: true,
  canManageClients: true,
  canManageAllProjects: true,
  canInvoice: true,
  canViewLeads: true,
  canViewAccounting: true,
  createdAt: new Date().toISOString(),
};

export const handlers = [
  http.get("http://localhost:8080/api/auth/me", () => {
    return HttpResponse.json(mockAdminUser);
  }),

  http.post("http://localhost:8080/api/auth/login", async ({ request }) => {
    const body = (await request.json()) as { username?: string; password?: string };
    if (body.username === "admin" && body.password === "admin123") {
      return HttpResponse.json({ user: mockAdminUser, message: "Logged in successfully" });
    }
    return HttpResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }),

  http.post("http://localhost:8080/api/auth/logout", () => {
    return HttpResponse.json({ message: "Logged out successfully" });
  }),

  http.get("http://localhost:8080/api/clients", () => {
    return HttpResponse.json([]);
  }),

  http.get("http://localhost:8080/api/analytics/summary", () => {
    return HttpResponse.json({
      totalRevenue: 0,
      totalCollected: 0,
      projectsCount: 0,
      revenueByCurrency: {},
      collectedByCurrency: {},
    });
  }),

  http.get("http://localhost:8080/api/projects", () => {
    return HttpResponse.json([]);
  }),

  http.get("http://localhost:8080/api/leads", () => {
    return HttpResponse.json([]);
  }),
];
