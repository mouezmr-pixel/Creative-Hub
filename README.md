# Creative Studio Suite — CRM

A full-stack CRM built for professional photography studios. Manages projects, clients, leads, accounting, AI-powered creative proposals, and a professional two-tier invoicing system.

---

## Features

### Project Management
- Create and track photography projects from lead to delivery
- Assign photographers and team members with commission structures
- Progress tracking (0–100%) with visual milestones and workflow templates
- WeTransfer link delivery integration
- Per-project currency selection (DZD / USD / EUR)

### Creative Idea Workflow (3-Step AI Pipeline)
The full workflow lives inside **Project Detail** (`/projects/:id`):

1. **Step 1 — Client's Original Idea**: Record what the client described (`original_client_idea`)
2. **Step 2 — AI Generated Suggestion**: Enhance the idea via Claude AI (`ai_generated_suggestion`). Language options: Algerian Darja, Arabic Standard, English, French. Admins click "✨ Enhance with AI" and the result is saved immediately to the project.
3. **Step 3 — Final Proposed Idea**: The polished proposal (`final_proposed_idea`) visible to the client in their portal

> **Note:** The AI Enhancer is a project-level feature. It is not available in the "New Client" modal.

### Professional Invoicing System
- **Pro-forma Invoice** (`فاتورة شكلية`): Estimate/quotation with a diagonal "PRO-FORMA" watermark — does **not** affect revenue
- **Final Invoice** (`فاتورة نهائية`): Official invoice — automatically counted in accounting dashboard revenue
- **Payment Receipt** (`وصل استلام مبلغ`): Partial payment / deposit receipt with signature area
- Print, WhatsApp-share, and Email-share for all document types
- Multi-currency breakdown: Total → Paid → Remaining Balance
- Invoice issuance timestamps tracked in database

### Payment History Ledger
- `payment_history` table records each payment separately (amount, currency, method, receipt number, date, notes, recorded by)
- `projects.amount_paid` is recomputed and written by the application (not a DB trigger) inside `POST /payments` and `DELETE /payments/:id`, each within a transaction with the payment write. `payments.ts` is the single authoritative path for this field — any other code that writes to `payment_history` directly must also update `projects.amount_paid` itself, or revenue figures will drift.
- Accounting revenue is the **sum of `payment_history.amount`** (cash collected), not invoiced amount

> **API-only — no dedicated frontend UI yet:** `GET /payments`, `GET /payments/summary`, `GET /payments/project/:id`, `POST /payments`, and `DELETE /payments/:id` are fully implemented in the backend. Data surfaces in the Accounting page via the `/accounting` routes, not via these endpoints directly. A dedicated Payments UI is planned (Package C).

### Financial Management & Accounting
- Revenue counted only on Final Invoice issuance (not on project creation)
- Partial payment / deposit tracking
- Debt list: projects with unpaid balances
- Expense tracking by category
- Cash flow overview
- Team Payouts section: Salaries vs Per-Project commission breakdowns
- Monthly analytics: revenue by service (pie chart), transaction table, per-month KPI cards

### Dashboard Analytics
- Date-range filtering: This Month / Last 2 Months / Last 6 Months / Custom Range
- KPI cards: Total Revenue, Collected, Debt, Project counts
- Multi-currency display toggle (DZD / USD / EUR)

### Leads Pipeline
- Kanban-style pipeline: New → Contacted → Proposal → Negotiation → Won/Lost
- Estimated value tracking with priority flags
- "Convert" button auto-creates Client + Project from a won lead

### Services Catalog
- Define service packages with titles, descriptions, and base prices
- Services auto-populate Expected Cost when selected during project creation
- Accounting page groups completed-project revenue by service for the Pie Chart

### Creatives (Team) Management
- Users with `role=photographer` are called "Creatives" in the UI
- Each creative has a `profession` field: Photographer / Editor / Designer / Videographer / Retoucher / Custom
- Payment types: `per_project` (commission per job) or `monthly_salary` (fixed monthly)
- Per-project commission stored in `project_assignees.commission_type` + `commission_value`
- Soft-delete: Deactivating a creative sets `archived_at` — the account cannot log in but all historical data and commission records are preserved for accounting

### Granular Permissions per Creative
Each creative (role=photographer) can be granted individual permissions via toggle switches in the Creatives page. Admins always have all permissions.

| Permission | Enforced at | Description |
|---|---|---|
| `canViewFinancials` | `GET /analytics/summary`, `/analytics/debt-list`, `/analytics/by-status`, `/payments` | Grants access to revenue figures, project costs, and debt data in the dashboard and accounting views. Non-admin photographers see zeroed-out financials without it. |
| `canManageClients` | UI-level hint (no route guard yet) | Intended to allow the creative to add and edit client records. Currently stored and returned in the API; backend route enforcement is planned. |
| `canManageAllProjects` | `requireProjectAccess`, `buildProjectScopeConditions` middleware | Bypasses project scoping so the creative can see and edit every project in the system, not only their assigned ones. |
| `canInvoice` | `POST /projects/:id/invoice`, `POST /payments` | Allows the creative to issue invoices (pro-forma or final) and record new payment entries. |
| `canViewLeads` | `GET /leads` route guard | Grants access to the Leads pipeline page. Without it, GET /leads returns 403. |
| `canViewAccounting` | `GET /payments`, `GET /payments/summary`, `requireFinancialAccess` | Grants access to detailed accounting/payment data (combined with `canViewFinancials` in `requireFinancialAccess`). Specifically covers the Accounting page and payment history. |

### Client Portal
- Separate login for clients (`/login` with role=client)
- Clients see only their own projects
- Read-only view of the Final Proposed Idea (Step 3) and milestone progress
- Invoice visibility
- When creating a client with a password, a `User` record with `role='client'` is auto-created

### User Roles
| Role | Capabilities |
|------|-------------|
| **Admin** | Full access: users, financials, invoicing, all projects, settings |
| **Photographer (Creative)** | Own projects, notes, milestones; optional financial visibility via permissions |
| **Client** | Own projects only; sees final proposal and delivery details |

### Multi-Language Support
- English, French, Arabic (RTL), Algerian Darja
- Language switcher in the navigation header
- AI proposal generation respects the chosen language

---

## Design System

- **Theme**: Light SaaS — `#FAFAFA` page background (`220 20% 98%`), pure white cards
- **Primary color**: Indigo `#6366F1` (HSL `239 84% 67%`)
- **Fonts**: Inter (body), Montserrat (hero headings)
- **Border radius**: `0.75rem` (12 px) for most components, `1rem`+ on landing
- **Shadows**: Layered soft shadows (`--shadow-sm` through `--shadow-xl`)
- **Landing page** at `/`: Hero + bento grid features + 3-tier pricing + CTA
- **Login page** at `/login`: Split-panel (indigo gradient left, white form right)
- **Sidebar**: White, collapsible (220 px ↔ 64 px), indigo active state

---

## Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Photographer | `photographer1` | `photo123` |
| Client | `client1` | `client123` |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Routing | Wouter |
| State | TanStack Query v5 |
| Backend | Express.js + TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Auth | Express sessions (connect-pg-simple) + bcrypt |
| AI | Anthropic Claude (`claude-haiku-4-5`) with language-specific mock fallback |
| API Codegen | Orval (OpenAPI → React Query hooks + Zod schemas) |
| Monorepo | pnpm workspaces |

---

## Project Structure

```
/
├── artifacts/
│   ├── api-server/          # Express REST API
│   │   └── src/
│   │       ├── app.ts       # Express app setup, session, CORS
│   │       ├── middlewares/
│   │       │   └── auth.ts  # requireAdmin, requireProjectAccess, requireFinancialAccess, buildProjectScopeConditions
│   │       └── routes/
│   │           ├── auth.ts                  # Login / logout / me; blocks archived users
│   │           ├── projects.ts              # CRUD + invoice issuance
│   │           ├── clients.ts               # Client management
│   │           ├── users.ts                 # User CRUD; DELETE = soft-archive (sets archived_at)
│   │           ├── notes.ts                 # Project notes; authorId nullable (deleted user → "مستخدم محذوف")
│   │           ├── analytics.ts             # Dashboard KPIs (date-range aware, financials gated)
│   │           ├── services.ts              # Service catalog
│   │           ├── leads.ts                 # Pipeline management (canViewLeads required)
│   │           ├── accounting.ts            # Expenses + cash flow + team payouts
│   │           ├── payments.ts              # Payment history CRUD (no frontend UI yet — see note above)
│   │           ├── ai.ts                    # Claude AI proposal enhancement
│   │           └── workflow-templates.ts    # Admin-managed workflow templates
│   │
│   └── studio-crm/          # React + Vite frontend
│       └── src/
│           ├── pages/
│           │   ├── landing.tsx              # Public landing page
│           │   ├── login.tsx                # Split-panel login
│           │   ├── dashboard.tsx            # KPI cards + date filter
│           │   ├── projects.tsx             # Project list + new project modal
│           │   ├── project-detail.tsx       # Full project view + 3-step AI workflow + invoicing
│           │   ├── clients.tsx              # Client list + create
│           │   ├── client-detail.tsx        # Client detail + inline edit
│           │   ├── photographers.tsx        # Creatives list + permissions + archive
│           │   ├── settings.tsx             # User management (admin only)
│           │   ├── services.tsx             # Service catalog
│           │   ├── leads.tsx                # Kanban pipeline
│           │   ├── accounting.tsx           # Financial charts + P&L + team payouts
│           │   ├── workflow-templates.tsx   # Template editor
│           │   └── client-portal.tsx        # Client-facing view
│           ├── lib/
│           │   ├── auth.tsx     # Auth context
│           │   ├── i18n.tsx     # Translations + language context
│           │   └── currency.ts  # Currency formatting (DZD/USD/EUR)
│           └── components/
│               └── ui/          # shadcn/ui components
│
├── lib/
│   ├── db/                  # Drizzle ORM schema + client
│   │   └── src/schema/
│   │       ├── projects.ts       # projects + project_assignees + project_milestones
│   │       ├── clients.ts        # clients table
│   │       ├── users.ts          # users table (incl. archived_at for soft-delete)
│   │       ├── services.ts       # services catalog
│   │       ├── leads.ts          # leads pipeline
│   │       ├── expenses.ts       # accounting expenses
│   │       ├── notes.ts          # project notes
│   │       ├── payment-history.ts # payment_history table
│   │       └── workflow-templates.ts
│   │
│   ├── api-spec/            # OpenAPI 3.1 spec + Orval config
│   │   └── openapi.yaml
│   ├── api-client-react/    # Generated React Query hooks (via Orval)
│   └── api-zod/             # Generated Zod validation schemas (via Orval)
│
└── README.md
```

---

## Database Schema — Key Tables

### `projects`
| Column | Type | Notes |
|--------|------|-------|
| `id` | serial | PK |
| `title` | text | |
| `client_id` | integer | FK → clients (RESTRICT on delete) |
| `photographer_id` | integer | FK → users (SET NULL on delete) |
| `service_id` | integer | FK → services (SET NULL on delete) |
| `status` | text | pending / in_progress / completed / archived |
| `progress` | integer | 0–100 |
| `expected_cost` | numeric | min 0; shown on Pro-forma |
| `final_cost` | numeric | min 0; shown on Final Invoice |
| `amount_paid` | numeric | min 0; recomputed in app code (see `payments.ts`) — not a DB trigger |
| `currency` | text | DZD / USD / EUR |
| `original_client_idea` | text | Step 1 of creative workflow |
| `ai_generated_suggestion` | text | Step 2 — AI output |
| `final_proposed_idea` | text | Step 3 — visible to client |
| `proforma_issued_at` | timestamptz | Set when Pro-forma is issued |
| `final_invoice_issued_at` | timestamptz | Set when Final Invoice is issued; gates revenue in analytics |

### `users`
| Column | Type | Notes |
|--------|------|-------|
| `id` | serial | PK |
| `username` | text | unique |
| `password_hash` | text | bcrypt |
| `name` | text | |
| `email` | text | |
| `role` | text | admin / photographer / client |
| `profession` | text | Photographer / Editor / Designer / Videographer / Retoucher / Custom |
| `payment_type` | text | per_project / monthly_salary |
| `salary_amount` | numeric | Monthly salary (null for per_project) |
| `archived_at` | timestamptz | **Soft-delete**: set by DELETE /users/:id; archived users cannot log in |
| `can_view_financials` | boolean | See Permissions table above |
| `can_manage_clients` | boolean | See Permissions table above |
| `can_manage_all_projects` | boolean | See Permissions table above |
| `can_invoice` | boolean | See Permissions table above |
| `can_view_leads` | boolean | See Permissions table above |
| `can_view_accounting` | boolean | See Permissions table above |

### `payment_history`
| Column | Type | Notes |
|--------|------|-------|
| `id` | serial | PK |
| `project_id` | integer | FK → projects (CASCADE) |
| `amount` | numeric | Must be > 0; receipt # must be unique |
| `currency` | text | DZD / USD / EUR |
| `method` | text | cash / bank_transfer / etc. |
| `receipt_number` | text | unique |
| `payment_date` | date | |
| `notes` | text | |
| `recorded_by` | integer | FK → users (SET NULL) |

### `project_assignees`
| Column | Type | Notes |
|--------|------|-------|
| `project_id` | integer | FK → projects (CASCADE) |
| `user_id` | integer | FK → users (**RESTRICT** — prevents hard-delete of assigned creatives; use soft-delete instead) |
| `commission_type` | text | flat / percentage |
| `commission_value` | numeric | Amount or % |

### `services`
| Column | Type | Notes |
|--------|------|-------|
| `id` | serial | PK |
| `title` | text | |
| `description` | text | |
| `price` | numeric | Base price |

---

## API Routes

### Authentication
- `POST /api/auth/login` — Login with username + password; returns 401 if user is archived
- `POST /api/auth/logout` — Clear session
- `GET  /api/auth/me` — Current user info; returns 401 if session user is now archived

### Users
- `GET    /api/users` — List all users (includes archived)
- `POST   /api/users` — Create user
- `GET    /api/users/:id` — Get single user
- `PATCH  /api/users/:id` — Update user fields (including permissions)
- `DELETE /api/users/:id` — **Soft-archive**: sets `archived_at = now()`, does NOT delete the row

### Projects
- `GET    /api/projects` — List (scoped by role / permissions)
- `POST   /api/projects` — Create project
- `GET    /api/projects/:id` — Get single project
- `PATCH  /api/projects/:id` — Update project fields (incl. `serviceId`)
- `POST   /api/projects/:id/invoice` — Issue invoice (`body: { type: "proforma" | "final" }`); requires admin or `canInvoice`
- `DELETE /api/projects/:id` — Delete project

### Notes
- `GET    /api/projects/:id/notes` — List notes (authorId nullable; deleted-user notes show "مستخدم محذوف")
- `POST   /api/projects/:id/notes` — Add note
- `DELETE /api/notes/:id` — Delete note (own note, or admin)

### Analytics
- `GET /api/analytics/summary?startDate=&endDate=` — KPI summary; financial fields zeroed for users without `canViewFinancials`
- `GET /api/analytics/projects-by-status` — Status breakdown; requires `canViewFinancials` or admin
- `GET /api/analytics/debt-list` — Projects with unpaid balances; requires `canViewFinancials` or admin

### Accounting
- `GET /api/accounting/summary` — Full P&L + team payouts
- `GET /api/accounting/monthly?month=&year=` — Monthly breakdown + service pie chart + transactions
- `GET /api/accounting/expenses`, `POST`, `DELETE /api/accounting/expenses/:id`

### Payments (backend-only — no dedicated frontend UI yet)
- `GET    /api/payments` — All payments; requires `canViewFinancials` or `canViewAccounting` or admin
- `GET    /api/payments/summary` — Aggregated totals; requires financial access
- `GET    /api/payments/project/:id` — Payments for a specific project; client can access their own
- `POST   /api/payments` — Record new payment; requires admin or `canInvoice`
- `DELETE /api/payments/:id` — Delete payment record; admin only

### Services
- `GET    /api/services` — List all services
- `POST   /api/services` — Create service
- `DELETE /api/services/:id` — Delete service

### Leads
- `GET    /api/leads` — List leads; requires admin or `canViewLeads`
- `POST   /api/leads` — Create lead
- `PATCH  /api/leads/:id` — Update lead
- `DELETE /api/leads/:id` — Delete lead

### AI
- `POST /api/ai/enhance-proposal` — Generate creative proposal (used by project-detail.tsx)
  - Body: `{ originalIdea: string, language: "algerian" | "arabic" | "english" | "french" }`
  - Uses Claude `claude-haiku-4-5` when `ANTHROPIC_API_KEY` is set; falls back to language-specific mock proposals

---

## AI Integration Logic

File: `artifacts/api-server/src/routes/ai.ts`

1. Validates session (must be authenticated)
2. Checks for `ANTHROPIC_API_KEY` environment variable
3. If available: calls `claude-haiku-4-5` with a strict system prompt enforcing the target language
4. If not: returns a realistic mock proposal matching the requested language
5. Language system prompts:
   - **Algerian Darja**: "أجاوب بالدارجة الجزائرية فقط"
   - **Arabic**: "أجب باللغة العربية الفصحى"
   - **English**: "Respond in English only"
   - **French**: "Réponds uniquement en français"

---

## Invoicing Logic

File: `artifacts/api-server/src/routes/projects.ts` → `POST /projects/:id/invoice`

```typescript
if (type === "proforma") updateData.proforma_issued_at = new Date();
if (type === "final")    updateData.final_invoice_issued_at = new Date();
```

File: `artifacts/api-server/src/routes/analytics.ts`

```typescript
// Revenue only counts when Final Invoice has been issued
const hasFinalInvoice = !!(project.finalInvoiceIssuedAt);
if (hasFinalInvoice) {
  totalRevenue += finalCost;
  totalCollected += amountPaid;
  totalDebt += debt;
}
```

---

## Foreign Key Constraints

All reference columns have explicit FK constraints with intentional `onDelete` strategies:

| Column | References | On Delete |
|--------|-----------|-----------|
| `projects.client_id` | clients | **RESTRICT** — cannot delete client with active projects |
| `project_assignees.user_id` | users | **RESTRICT** — use soft-archive instead of deleting assigned creatives |
| `project_assignees.project_id` | projects | CASCADE |
| `notes.project_id` | projects | CASCADE |
| `notes.author_id` | users | **SET NULL** — note preserved with null author if user is hard-deleted |
| `projects.photographer_id` | users | SET NULL |
| `projects.service_id` | services | SET NULL |
| `payment_history.project_id` | projects | CASCADE |
| `payment_history.recorded_by` | users | SET NULL |
| `project_milestones.project_id` | projects | CASCADE |

---

## Validation Rules (Zod)

- `expectedCost`, `finalCost`, `amountPaid`: `min(0)` — negative values rejected
- `progress`: `min(0).max(100)` — must be a valid percentage
- Payment `amount`: must be positive; `receipt_number` must be unique

---

## Installation & Local Development

### Prerequisites
- Node.js 18+
- pnpm 8+
- PostgreSQL database

### Setup

```bash
pnpm install
# DATABASE_URL=postgresql://...
# SESSION_SECRET=your-secret-here
# ANTHROPIC_API_KEY=sk-ant-... (optional, enables real AI)
pnpm --filter @workspace/db run db:push
pnpm run dev
```

### Individual Services

```bash
pnpm --filter @workspace/api-server run dev   # API server (port 8080)
pnpm --filter @workspace/studio-crm run dev    # Frontend CRM (port auto-assigned)
```

### Regenerating API Clients

Run after changing `lib/api-spec/openapi.yaml`:

```bash
cd lib/api-spec && npx orval --config orval.config.ts
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SESSION_SECRET` | ✅ | Express session encryption key |
| `ANTHROPIC_API_KEY` | ⬜ | Enables real Claude AI (falls back to mocks if absent) |

---

## Current Implementation Status

| Module | Status | Notes |
|--------|--------|-------|
| Authentication & Sessions | ✅ Complete | Archived users blocked at login and /me |
| User Management (soft-delete) | ✅ Complete | DELETE = sets archived_at; row preserved |
| Granular Permissions (6 flags) | ✅ Complete | Enforced at route level (see Permissions table) |
| Client Management | ✅ Complete | |
| Project CRUD & Assignment | ✅ Complete | serviceId updatable via PATCH |
| Services Catalog | ✅ Complete | |
| Leads Pipeline | ✅ Complete | Gated by canViewLeads |
| Expense / Accounting | ✅ Complete | |
| Workflow Templates & Milestones | ✅ Complete | |
| AI Idea Enhancement (4 languages) | ✅ Complete | Project-detail only |
| Creative Idea 3-Step Workflow | ✅ Complete | Project-detail only |
| Dashboard Date-Range Filtering | ✅ Complete | |
| Multi-Currency Support | ✅ Complete | |
| Pro-forma Invoice (with watermark) | ✅ Complete | |
| Final Invoice (affects revenue) | ✅ Complete | |
| Payment Receipt (وصل استلام) | ✅ Complete | |
| Payment History Ledger | ✅ Complete | Backend only — no dedicated UI |
| Analytics — Final Invoice Gating | ✅ Complete | |
| FK Constraints (all columns) | ✅ Complete | See FK table above |
| Zod Validation (cost, progress) | ✅ Complete | |
| Client Portal (read-only) | ✅ Complete | |
| RTL / Multi-language UI | ✅ Complete | |
| Payments Frontend UI | ⬜ Planned | Package C |

---

*Built with React + Vite, Express, PostgreSQL, Drizzle ORM, and Anthropic Claude.*
