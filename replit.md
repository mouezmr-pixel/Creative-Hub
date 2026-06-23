# Creative Studio CRM

## Overview

A full-stack CRM application for a photography team with three user roles, project tracking, financial management, and multi-language support. Features a "SaaS 2.0" light aesthetic (Bloom.io-inspired) with a public landing page, clean split-panel login, and a collapsible white sidebar.

### Recent Major Features
- **Creatives System** (replaces "Photographers"): Users with `role=photographer` are now called Creatives. The `/photographers` page is the "Creatives" page. Each creative has a `profession` field (Photographer/Editor/Designer/Videographer/Retoucher/Custom) displayed as a badge.
- **Team Payments**: Each creative has a `paymentType` (`per_project` or `monthly_salary`) and optional `salaryAmount`. The "Add Creative" form includes a Payment Type dropdown; Monthly Salary shows a salary amount field. Each creative card shows a colored badge (amber=Per Project, indigo=Salary) with the monthly amount when salaried.
- **Per-Project Commission on Assignment**: When assigning a per-project creative to a new project, the form shows inline commission inputs (Flat Amount or % of Revenue). Commission data is stored in `project_assignees.commission_type` and `commission_value`.
- **Granular Permissions per Creative**: 6 toggle switches in a collapsible "Permissions" panel on each creative card (see Permissions section below for details).
- **Multi-Creative Project Assignment**: Projects have a `project_assignees` table for many-to-many assignment.
- **Dashboard Time-Range Filter**: Preset buttons (All Time, This Month, Last 2 Months, Last 6 Months) + Custom date range picker.
- **Services Catalog** (`/services`): Admin can create/delete service packages with name, description, price.
- **Professional Two-Tier Invoicing**: Project detail has three separate action buttons — "Pro-forma" (amber, فاتورة شكلية), "Final Invoice" (emerald, فاتورة نهائية), "Receipt" (blue, وصل استلام). Pro-forma has a "PRO-FORMA" diagonal watermark and is NOT counted as revenue. Final Invoice stamps a DB timestamp (`final_invoice_issued_at`) that gates analytics revenue. Payment Receipt shows Total → Paid → Balance with a signature area. All documents share via Print, WhatsApp (type-aware message), Email (type-aware).
- **Analytics Revenue Gating**: `GET /analytics/summary` only counts `finalCost` toward `totalRevenue` when `final_invoice_issued_at` is set on a project.
- **Payment History Ledger**: `payment_history` table records every payment separately (amount, currency, method, receipt #, date, notes, recordedBy). `projects.amount_paid` is kept in sync by the API: `POST /payments` and `DELETE /payments/:id` both recalculate the SUM of all payment_history rows for the project and write it back. Analytics `revenue.actual` is the sum of `payment_history.amount` (collected). Endpoints: `GET /payments`, `GET /payments/summary`, `GET /payments/project/:id`, `POST /payments`, `DELETE /payments/:id`, `POST /users/:id/unarchive`. Payment data surfaces in the Project Detail page (read-only amountPaid display driven by payment_history) and in the Accounting page through `/accounting` routes.
- **Leads Pipeline** (`/leads`): Full sales CRM pipeline (New → Won/Lost). "Convert" button creates Client+Project automatically. Requires `canViewLeads` permission or admin role.
- **Advanced Accounting** (`/accounting`): Expense CRUD, P&L summary, Recharts 6-month bar chart. Full monthly analytics: Month/Year navigator, per-month KPI cards (Gross Revenue, All Costs with team/expenses split, Net Profit), interactive Pie Chart of revenue by service, progress-bar service breakdown list with %, full transaction table, and a **Team Payouts section** showing Salaries vs Per-Project fees with individual breakdowns. Net Profit = Gross Revenue − Project Costs − Operating Expenses (salaries + general). Currency selector persists via localStorage.
- **Service-linked Projects**: Projects store `serviceId` (FK to services). The create form tracks the selected service and persists it. `serviceId` is updatable via `PATCH /projects/:id`. The monthly analytics engine groups completed-project revenue by service for the Pie Chart.
- **Workflow & Milestone System**: Admin-managed workflow templates, milestone checklist on project detail, auto-calculated progress, visual stepper in client portal.
- **Client Portal Authentication**: When creating a client with a password, a `User` record with `role='client'` is automatically created. Username is auto-generated from the client's name. Clients log in at `/login` and see only their own projects, milestone timeline, final proposal, and notes — with no access to Accounting or Leads.
- **AI Proposal Enhancer** (project-level): Inside **Project Detail** (`/projects/:id`), the Idea Workflow card has a 3-step pipeline: (1) Client's Original Idea, (2) AI Generated Suggestion (click "✨ Enhance with AI" → calls `/api/ai/enhance-proposal` → result saved to project immediately), (3) Final Proposed Idea (visible to client in portal). Language options: Algerian Darja, Arabic Standard, English, French. Falls back to a mock response if `ANTHROPIC_API_KEY` is absent. **This feature is not available in the "New Client" modal — it is strictly project-level.**
- **bcrypt Password Security**: All passwords are bcrypt-hashed. A startup migration auto-hashes any existing plaintext passwords.
- **Soft-Delete for Users**: `DELETE /users/:id` does NOT delete the row — it sets `archived_at = now()`. Archived users cannot log in (blocked in `/auth/login` and `/auth/me`). Their data and commission records are preserved for accounting integrity. The Creatives page shows an Archive button (not Delete) with an explanatory Arabic message, and a toggle to view/hide archived creatives.
- **FK Constraints**: All 11 reference columns have explicit `onDelete` strategies. Notable: `project_assignees.user_id` is RESTRICT (preventing hard-delete of assigned creatives — soft-archive is the intended path), and `notes.author_id` is SET NULL (note content preserved if user is ever hard-deleted).
- **Zod Validation**: `expectedCost`, `finalCost`, `amountPaid` require `min(0)`; `progress` requires `min(0).max(100)`.

## Design System

- **Theme**: Light SaaS — `#FAFAFA` page background (HSL `220 20% 98%`), pure white cards (`0 0% 100%`)
- **Primary color**: Indigo `#6366F1` (HSL `239 84% 67%`)
- **Fonts**: Inter (body), Montserrat (hero headings)
- **Radius**: `0.75rem` (12 px) for most components, `1rem`+ on landing
- **Shadows**: Layered soft shadows (`--shadow-sm` through `--shadow-xl`)
- **Landing page** at `/`: Hero + bento grid features + 3-tier pricing + CTA
- **Login page** at `/login`: Split-panel (indigo gradient left, white form right)
- **Sidebar**: White, collapsible (220 px ↔ 64 px), indigo active state, icon-only collapsed mode

## Architecture

pnpm workspace monorepo with TypeScript throughout.

### Artifacts
- **`artifacts/api-server`** — Express.js REST API server (port from `PORT` env, runs at `/api`)
- **`artifacts/studio-crm`** — React + Vite frontend (served at `/`)

### Libraries
- **`lib/api-spec`** — OpenAPI spec (`openapi.yaml`) + Orval codegen config
- **`lib/api-client-react`** — Generated React Query hooks + custom fetch
- **`lib/api-zod`** — Generated Zod schemas for validation
- **`lib/db`** — Drizzle ORM schema + migrations (PostgreSQL)

### Codegen

After changing `lib/api-spec/openapi.yaml`:
```bash
cd lib/api-spec && npx orval --config orval.config.ts
```

## Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS, shadcn/ui, Wouter (routing), React Query, Framer Motion
- **Backend**: Express.js, express-session, bcrypt
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Session-based (cookie), `SESSION_SECRET` env var
- **Codegen**: Orval (generates React Query hooks + Zod schemas from OpenAPI spec)

## User Roles

| Role | Access |
|------|--------|
| `admin` | Everything: all clients, projects, creatives, settings, financials |
| `photographer` | Own clients and projects only (unless permissions expanded); no settings/creatives pages |
| `client` | `/client-portal` only; no financial data shown |

## Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Photographer | `photographer1` | `photo123` |
| Client | `client1` | `client123` |

## Pages

- `/` — Public landing page
- `/login` — Login page (public); archived users get a 401
- `/dashboard` — Stats cards + project tabs (admin, photographer)
- `/clients` — Client list with search + create (admin, photographer)
- `/clients/:id` — Client detail with inline edit + projects list (admin, photographer)
- `/projects` — Project list with status tabs + create (admin, photographer)
- `/projects/:id` — Project detail: status, progress slider, WeTransfer link, financials, 3-step AI idea workflow, invoicing, notes, milestones
- `/photographers` — Creatives list with permissions toggles + archive (admin only)
- `/settings` — User management: create/archive users (admin only)
- `/services` — Service catalog: create/delete packages (admin only)
- `/leads` — Kanban pipeline: New → Won/Lost; requires `canViewLeads` or admin
- `/accounting` — Financial charts, P&L, expenses, team payouts
- `/workflow-templates` — Template editor (admin only)
- `/client-portal` — Client's project view with progress + notes + final proposal (client only)

## Permissions System

Admins always have all permissions. For `role=photographer` users, individual capabilities are gated by boolean flags. Toggles are in the Creatives page permission panel.

| Permission flag | Enforced at | What it grants |
|---|---|---|
| `canViewFinancials` | `GET /analytics/summary` (zeroes financials without it), `GET /analytics/debt-list`, `GET /analytics/by-status`, `GET /payments`, `GET /payments/summary` | Access to revenue figures, project costs, and debt data in the dashboard and payment history |
| `canManageClients` | UI-level (no backend route guard yet) | Intended to allow adding/editing client records; currently stored and returned by the API but not enforced server-side |
| `canManageAllProjects` | `requireProjectAccess` + `buildProjectScopeConditions` middleware | Bypasses project scoping — user sees and can edit all projects, not only their own or assigned |
| `canInvoice` | `POST /projects/:id/invoice`, `POST /payments` | Can issue pro-forma and final invoices, and record new payment entries |
| `canViewLeads` | `GET /leads` route guard (returns 403 without it) | Access to the Leads pipeline page |
| `canViewAccounting` | `GET /payments`, `GET /payments/summary`, `requireFinancialAccess` middleware | Access to detailed accounting and payment history data (combined with `canViewFinancials` in financial middleware) |

## Database Schema

### `users`
id, username, passwordHash, name, email, role (admin/photographer/client), profession, paymentType, salaryAmount, **archivedAt** (soft-delete timestamp), canViewFinancials, canManageClients, canManageAllProjects, canInvoice, canViewLeads, canViewAccounting

### `clients`
id, name, email, phone, userId (FK → users for client portal login), photographerId, originalIdea, proposedIdea, createdAt

### `projects`
id, title, clientId (FK RESTRICT), photographerId (FK SET NULL), serviceId (FK SET NULL), status, progress (0–100), startDate, deliveryDate, weTransferLink, expectedCost (≥0), finalCost (≥0), amountPaid (≥0, auto-synced), currency, originalClientIdea, aiGeneratedSuggestion, finalProposedIdea, proformaIssuedAt, finalInvoiceIssuedAt, createdAt

### `project_assignees`
projectId (FK CASCADE), userId (FK **RESTRICT**), commissionType, commissionValue

### `project_milestones`
id, projectId (FK CASCADE), title, completed, order

### `notes`
id, projectId (FK CASCADE), authorId (FK **SET NULL** — nullable; shows "مستخدم محذوف" if null), content, createdAt

### `services`
id, title, description, price

### `leads`
id, title, clientName, estimatedValue, currency, status, priority, notes, createdAt

### `expenses`
id, title, amount, currency, category, date, notes, createdAt

### `payment_history`
id, projectId (FK CASCADE), amount, currency, method, receiptNumber (unique), paymentDate, notes, recordedBy (FK SET NULL)

### `workflow_templates` + `workflow_template_steps`
Template definitions with ordered steps; applied to projects to auto-generate milestones

## API Routes

All prefixed with `/api`:

**Auth**: `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`

**Users**: `GET /users`, `POST /users`, `GET /users/:id`, `PATCH /users/:id`, `DELETE /users/:id` *(soft-archive — sets archivedAt)*

**Clients**: `GET /clients`, `POST /clients`, `GET /clients/:id`, `PUT /clients/:id`, `DELETE /clients/:id`

**Projects**: `GET /projects`, `POST /projects`, `GET /projects/:id`, `PATCH /projects/:id`, `DELETE /projects/:id`, `POST /projects/:id/invoice`

**Notes**: `GET /projects/:id/notes`, `POST /projects/:id/notes`, `DELETE /notes/:id`

**Analytics**: `GET /analytics/summary?startDate=&endDate=`, `GET /analytics/by-status`, `GET /analytics/debt-list`

**Accounting**: `GET /accounting/summary`, `GET /accounting/monthly?month=&year=`, `GET|POST|DELETE /accounting/expenses(/:id)`

**Payments**: `GET /payments`, `GET /payments/summary`, `GET /payments/project/:id`, `POST /payments`, `DELETE /payments/:id`, `POST /users/:id/unarchive` — payment data is displayed in **Project Detail** (read-only amountPaid driven by payment_history sum)

**Services**: `GET /services`, `POST /services`, `DELETE /services/:id`

**Leads**: `GET /leads`, `POST /leads`, `PATCH /leads/:id`, `DELETE /leads/:id`

**Workflow Templates**: `GET /workflow-templates`, `POST /workflow-templates`, `GET /workflow-templates/:id`, `DELETE /workflow-templates/:id`, `POST /projects/:id/milestones`, `PATCH /milestones/:id`, `DELETE /milestones/:id`

**AI**: `POST /ai/enhance-proposal` *(used by project-detail.tsx only)*

## Key Files

- `artifacts/studio-crm/src/App.tsx` — Router + protected routes
- `artifacts/studio-crm/src/lib/auth.tsx` — Auth context (session-based)
- `artifacts/studio-crm/src/lib/i18n.tsx` — Translations (EN, FR, AR + Darja)
- `artifacts/studio-crm/src/components/layout.tsx` — Sidebar + header + language switcher
- `artifacts/api-server/src/app.ts` — Express app setup, session, CORS
- `artifacts/api-server/src/middlewares/auth.ts` — requireAdmin, requireProjectAccess, requireFinancialAccess, buildProjectScopeConditions
- `lib/api-spec/openapi.yaml` — Single source of truth for all API types
- `lib/db/src/schema/` — All Drizzle table definitions

## User Preferences

- Arabic is the primary working language for confirmation dialogs and toast messages in the UI.
- Archive/soft-delete is preferred over hard delete for users — preserves accounting history.
- Permissions panel uses collapsible section to keep creative cards compact.
