import { eq, inArray, sql } from "drizzle-orm";
import { db, projectsTable, clientsTable, usersTable, projectAssigneesTable, servicesTable } from "@workspace/db";
import { computeDebt } from "./project-financials";
import type { DbClient } from "./db-client";

/**
 * ProjectPresenter — turns raw DB rows into the API response shape.
 * Extracted from routes/projects.ts.
 *
 * formatProject() is for single-project routes (POST/GET/PATCH/:id, invoice).
 * formatProjectsBatch() is for list routes — it loads client/photographer/
 * service names and assignees for the WHOLE list in ~4 queries total instead
 * of formatProject's 4 queries per project (the GET /projects N+1 fix).
 */

type AssigneeRow = {
  id: number;
  name: string;
  profession: string | null;
  role: string;
  paymentType: string | null;
  commissionType: string | null;
  commissionValue: string | null;
};

export function mapAssigneeRow(r: AssigneeRow) {
  return {
    id: r.id,
    name: r.name,
    profession: r.profession ?? null,
    role: r.role,
    paymentType: (r.paymentType ?? "per_project") as string,
    commissionType: (r.commissionType ?? null) as string | null,
    commissionValue: r.commissionValue != null ? parseFloat(r.commissionValue as string) : null,
  };
}

export async function getAssignees(client: DbClient, projectId: number) {
  const rows = await client
    .select({
      id: usersTable.id,
      name: usersTable.name,
      profession: usersTable.profession,
      role: usersTable.role,
      paymentType: sql<string>`${usersTable}.payment_type`,
      commissionType: sql<string | null>`${projectAssigneesTable}.commission_type`,
      commissionValue: sql<string | null>`${projectAssigneesTable}.commission_value`,
    })
    .from(projectAssigneesTable)
    .innerJoin(usersTable, eq(projectAssigneesTable.userId, usersTable.id))
    .where(eq(projectAssigneesTable.projectId, projectId));
  return rows.map(mapAssigneeRow);
}

export async function formatProject(project: typeof projectsTable.$inferSelect) {
  let clientName: string | null = null;
  let photographerName: string | null = null;
  let serviceName: string | null = null;

  if (project.clientId) {
    const [client] = await db
      .select({ name: clientsTable.name })
      .from(clientsTable)
      .where(eq(clientsTable.id, project.clientId));
    clientName = client?.name ?? null;
  }

  if (project.photographerId) {
    const [photographer] = await db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, project.photographerId));
    photographerName = photographer?.name ?? null;
  }

  const serviceId = project.serviceId ?? null;
  if (serviceId) {
    const [svc] = await db.select({ title: servicesTable.title }).from(servicesTable).where(eq(servicesTable.id, serviceId));
    serviceName = svc?.title ?? null;
  }

  const assignees = await getAssignees(db, project.id);

  const expectedCost = project.expectedCost ? parseFloat(project.expectedCost as unknown as string) : null;
  const finalCost = project.finalCost ? parseFloat(project.finalCost as unknown as string) : null;
  const amountPaid = project.amountPaid ? parseFloat(project.amountPaid as unknown as string) : null;
  const discount = project.discount ? parseFloat(project.discount as unknown as string) : 0;
  const remainingDebt = computeDebt(project);

  return {
    id: project.id,
    title: project.title,
    clientId: project.clientId,
    clientName,
    photographerId: project.photographerId,
    photographerName,
    serviceId,
    serviceName,
    assignees,
    status: project.status,
    progress: project.progress,
    startDate: project.startDate,
    deliveryDate: project.deliveryDate,
    weTransferLink: project.weTransferLink,
    expectedCost,
    finalCost,
    amountPaid,
    discount,
    remainingDebt,
    currency: project.currency ?? "DZD",
    originalClientIdea: project.originalClientIdea ?? null,
    aiGeneratedSuggestion: project.aiGeneratedSuggestion ?? null,
    finalProposedIdea: project.finalProposedIdea ?? null,
    proformaIssuedAt: project.proformaIssuedAt ? project.proformaIssuedAt.toISOString() : null,
    finalInvoiceIssuedAt: project.finalInvoiceIssuedAt ? project.finalInvoiceIssuedAt.toISOString() : null,
    createdAt: project.createdAt.toISOString(),
  };
}

// Batch version of formatProject for list endpoints. Loads client names,
// photographer names, service names, and assignees for ALL given projects in
// a fixed number of queries (independent of how many projects there are),
// instead of formatProject's 4 queries per project. GET /projects must use
// this — calling formatProject per project means N projects triggers up to
// 4N+1 SQL round trips, which was the main N+1 hotspot in this route.
export async function formatProjectsBatch(projectList: (typeof projectsTable.$inferSelect)[]) {
  if (projectList.length === 0) return [];

  const clientIds = [...new Set(projectList.map((p) => p.clientId).filter((id): id is number => id != null))];
  const photographerIds = [...new Set(projectList.map((p) => p.photographerId).filter((id): id is number => id != null))];
  const serviceIds = [...new Set(projectList.map((p) => p.serviceId).filter((id): id is number => id != null))];
  const projectIds = projectList.map((p) => p.id);

  const [clients, photographers, services, assigneeRows] = await Promise.all([
    clientIds.length
      ? db.select({ id: clientsTable.id, name: clientsTable.name }).from(clientsTable).where(inArray(clientsTable.id, clientIds))
      : Promise.resolve([] as { id: number; name: string }[]),
    photographerIds.length
      ? db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(inArray(usersTable.id, photographerIds))
      : Promise.resolve([] as { id: number; name: string }[]),
    serviceIds.length
      ? db.select({ id: servicesTable.id, title: servicesTable.title }).from(servicesTable).where(inArray(servicesTable.id, serviceIds))
      : Promise.resolve([] as { id: number; title: string }[]),
    db
      .select({
        projectId: projectAssigneesTable.projectId,
        id: usersTable.id,
        name: usersTable.name,
        profession: usersTable.profession,
        role: usersTable.role,
        paymentType: sql<string>`${usersTable}.payment_type`,
        commissionType: sql<string | null>`${projectAssigneesTable}.commission_type`,
        commissionValue: sql<string | null>`${projectAssigneesTable}.commission_value`,
      })
      .from(projectAssigneesTable)
      .innerJoin(usersTable, eq(projectAssigneesTable.userId, usersTable.id))
      .where(inArray(projectAssigneesTable.projectId, projectIds)),
  ]);

  const clientNameById = new Map(clients.map((c) => [c.id, c.name]));
  const photographerNameById = new Map(photographers.map((p) => [p.id, p.name]));
  const serviceTitleById = new Map(services.map((s) => [s.id, s.title]));

  const assigneesByProjectId = new Map<number, ReturnType<typeof mapAssigneeRow>[]>();
  for (const row of assigneeRows) {
    const list = assigneesByProjectId.get(row.projectId) ?? [];
    list.push(mapAssigneeRow(row));
    assigneesByProjectId.set(row.projectId, list);
  }

  return projectList.map((project) => {
    const serviceId = project.serviceId ?? null;
    const expectedCost = project.expectedCost ? parseFloat(project.expectedCost as unknown as string) : null;
    const finalCost = project.finalCost ? parseFloat(project.finalCost as unknown as string) : null;
    const amountPaid = project.amountPaid ? parseFloat(project.amountPaid as unknown as string) : null;
    const discount = project.discount ? parseFloat(project.discount as unknown as string) : 0;
    const remainingDebt = computeDebt(project);

    return {
      id: project.id,
      title: project.title,
      clientId: project.clientId,
      clientName: project.clientId != null ? clientNameById.get(project.clientId) ?? null : null,
      photographerId: project.photographerId,
      photographerName: project.photographerId != null ? photographerNameById.get(project.photographerId) ?? null : null,
      serviceId,
      serviceName: serviceId != null ? serviceTitleById.get(serviceId) ?? null : null,
      assignees: assigneesByProjectId.get(project.id) ?? [],
      status: project.status,
      progress: project.progress,
      startDate: project.startDate,
      deliveryDate: project.deliveryDate,
      weTransferLink: project.weTransferLink,
      expectedCost,
      finalCost,
      amountPaid,
      discount,
      remainingDebt,
      currency: project.currency ?? "DZD",
      originalClientIdea: project.originalClientIdea ?? null,
      aiGeneratedSuggestion: project.aiGeneratedSuggestion ?? null,
      finalProposedIdea: project.finalProposedIdea ?? null,
      proformaIssuedAt: project.proformaIssuedAt ? project.proformaIssuedAt.toISOString() : null,
      finalInvoiceIssuedAt: project.finalInvoiceIssuedAt ? project.finalInvoiceIssuedAt.toISOString() : null,
      createdAt: project.createdAt.toISOString(),
    };
  });
}
