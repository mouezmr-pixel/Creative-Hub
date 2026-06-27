import type { Request, Response } from "express";
import { eq, inArray, sql } from "drizzle-orm";
import { db, usersTable, clientsTable, projectsTable, projectAssigneesTable } from "@workspace/db";

export type SessionUser = typeof usersTable.$inferSelect;

/** Extract userId from session; send 401 and return null if missing. */
export function getSessionUserId(req: Request, res: Response): number | null {
  const s = req.session as unknown as Record<string, unknown>;
  if (!s.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  return s.userId as number;
}

/** Fetch session user from DB; send 401/403 if not found. */
export async function getSessionUser(
  req: Request,
  res: Response,
): Promise<SessionUser | null> {
  if ((res.locals as any).user) return (res.locals as any).user as SessionUser;
  const userId = getSessionUserId(req, res);
  if (userId == null) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return null;
  }
  res.locals.user = user;
  return user;
}

/** Require authenticated admin; send 401/403 otherwise. */
export async function requireAdmin(
  req: Request,
  res: Response,
): Promise<SessionUser | null> {
  const user = await getSessionUser(req, res);
  if (!user) return null;
  if (user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return null;
  }
  return user;
}

/** Require role to be one of the listed values; send 401/403 otherwise. */
export async function requireRole(
  req: Request,
  res: Response,
  ...roles: string[]
): Promise<SessionUser | null> {
  const user = await getSessionUser(req, res);
  if (!user) return null;
  if (!roles.includes(user.role)) {
    res.status(403).json({ error: "Access denied" });
    return null;
  }
  return user;
}

/** Require admin OR canViewFinancials OR canViewAccounting. */
export async function requireFinancialAccess(
  req: Request,
  res: Response,
): Promise<SessionUser | null> {
  const user = await getSessionUser(req, res);
  if (!user) return null;
  if (user.role !== "admin" && !user.canViewFinancials && !user.canViewAccounting) {
    res.status(403).json({ error: "Financial access required" });
    return null;
  }
  return user;
}

/**
 * Unified access check: authenticate + verify role/permission.
 *
 * - Must be authenticated (401 if not).
 * - Admin always passes regardless of other options.
 * - If `allowedRoles` is set, user.role must be one of them.
 * - If `requiredPermissions` is set, user must have at least one truthy
 *   boolean field from the list (e.g. "canViewAccounting").
 * - Both can be combined: pass if EITHER role matches OR permission held.
 * - If neither option is set, any authenticated user passes (auth-only).
 */
export async function requireAccess(
  req: Request,
  res: Response,
  options: {
    allowedRoles?: string[];
    requiredPermissions?: Array<keyof SessionUser>;
    errorMessage?: string;
  } = {},
): Promise<SessionUser | null> {
  const user = await getSessionUser(req, res);
  if (!user) return null;

  if (user.role === "admin") return user;

  if (options.allowedRoles && options.allowedRoles.length > 0) {
    if (options.allowedRoles.includes(user.role)) return user;
  }

  if (options.requiredPermissions && options.requiredPermissions.length > 0) {
    const hasPermission = options.requiredPermissions.some(
      (perm) => !!(user as any)[perm],
    );
    if (hasPermission) return user;
  }

  const msg = options.errorMessage ?? "Access denied";
  res.status(403).json({ error: msg });
  return null;
}

/**
 * Check if the current user can access a specific project.
 * Returns the project record if allowed, null + sends 401/403/404 otherwise.
 */
export async function requireProjectAccess(
  req: Request,
  res: Response,
  projectId: number,
): Promise<(typeof projectsTable.$inferSelect) | null> {
  const user = await getSessionUser(req, res);
  if (!user) return null;

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return null;
  }

  // Admin or canManageAllProjects → full access
  if (user.role === "admin" || user.canManageAllProjects) return project;

  // Client → must own the project via clientsTable.userId
  if (user.role === "client") {
    const [clientRecord] = await db
      .select({ id: clientsTable.id })
      .from(clientsTable)
      .where(eq(clientsTable.userId, user.id));
    if (clientRecord && project.clientId === clientRecord.id) return project;
    res.status(403).json({ error: "Access denied" });
    return null;
  }

  // Photographer → own project or in assignees
  if (project.photographerId === user.id) return project;
  const assignedRows = await db
    .select({ projectId: projectAssigneesTable.projectId })
    .from(projectAssigneesTable)
    .where(eq(projectAssigneesTable.userId, user.id));
  const assignedIds = assignedRows.map((r) => r.projectId);
  if (assignedIds.includes(projectId)) return project;

  res.status(403).json({ error: "Access denied" });
  return null;
}

/**
 * Build Drizzle WHERE conditions that scope projects to what the current user
 * is allowed to see (same logic as GET /projects list).
 * Returns null if the user is not authenticated (401/403 already sent).
 */
export async function buildProjectScopeConditions(
  req: Request,
  res: Response,
): Promise<{ user: SessionUser; conditions: any[] } | null> {
  const user = await getSessionUser(req, res);
  if (!user) return null;

  const conditions: any[] = [];

  if (user.role === "admin" || user.canManageAllProjects) {
    return { user, conditions };
  }

  if (user.role === "client") {
    const [clientRecord] = await db
      .select({ id: clientsTable.id })
      .from(clientsTable)
      .where(eq(clientsTable.userId, user.id));
    conditions.push(
      clientRecord
        ? eq(projectsTable.clientId, clientRecord.id)
        : eq(projectsTable.id, -1),
    );
    return { user, conditions };
  }

  // Photographer without canManageAllProjects
  const assignedRows = await db
    .select({ projectId: projectAssigneesTable.projectId })
    .from(projectAssigneesTable)
    .where(eq(projectAssigneesTable.userId, user.id));
  const assignedIds = assignedRows.map((r) => r.projectId);

  conditions.push(
    assignedIds.length > 0
      ? sql`(${eq(projectsTable.photographerId, user.id)} OR ${inArray(projectsTable.id, assignedIds)})`
      : eq(projectsTable.photographerId, user.id),
  );

  return { user, conditions };
}
