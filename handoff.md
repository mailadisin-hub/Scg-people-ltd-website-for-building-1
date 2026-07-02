# Westcote Place Finance Portal — Project Handoff

## What We're Building

A self-hosted web portal for **SCG People Limited**, the freeholder and managing agent of **Westcote Place** — a residential building in the UK containing 15 leased flats and 1 commercial unit on the ground floor.

### Two Surfaces

**Admin portal** (SCG People staff only)
- Manage two service charge schedules (A: whole building; B: flats only)
- Set annual budgets and management fee percentages
- Generate and send quarterly invoices to all 16 unit holders
- Record and reconcile payments
- Upload and manage shared documents

**Leaseholder portal** (one account per flat/unit)
- View their own invoices with status (paid, overdue, etc.)
- Download invoice PDFs
- View the annual budget breakdown and their share
- Access documents uploaded by the admin

---

## Brand & Design

**Company:** SCG People Limited  
**Building:** Westcote Place  
**Colour palette:**
- Primary (Royal Blue / Navy): `#1C3664` — sidebar, headers, nav, primary buttons
- Accent (Gold): `#C8962E` — headings, highlights, badges, active states, invoice totals
- Background: white `#FFFFFF` / light grey `#F8F9FA`
- Text: dark charcoal `#1A1A1A`

**Tailwind custom colours (`tailwind.config.ts`):**
```ts
colors: {
  brand: {
    blue: '#1C3664',
    gold: '#C8962E',
    'blue-light': '#2A4A82',
    'gold-light': '#E5B84D',
  }
}
```

**Design language:** Clean, professional, financial-sector aesthetic (banking portal feel). Sidebar is deep royal blue with gold active indicators. Invoice PDFs have a royal blue header bar, SCG People logo top-left, gold totals row. Status badges: green (PAID), amber (PARTIALLY_PAID), red (OVERDUE), grey (DRAFT), blue (SENT).

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 14.2.35 (App Router) + TypeScript | Full-stack, Server Actions, Server Components |
| Database | PostgreSQL via Neon (serverless) | Free tier, auto-scaling |
| ORM | Prisma v7 + `@prisma/adapter-pg` | Parameterised queries, type-safe |
| Auth | NextAuth.js v5 (beta) Credentials | JWT sessions, bcrypt password hashing |
| UI | Tailwind CSS + shadcn/ui (Radix primitives) | Accessible component library |
| PDF | `@react-pdf/renderer` | Server-side PDF generation |
| Email | Resend | API-key based, domain-friendly |
| Charts | Recharts | Budget vs actuals visualisation |
| Forms | react-hook-form + Zod | Type-safe validation |
| File storage | Local disk (`src/lib/storage.ts`) | Saves to `./uploads/` on the server |
| Hosting | Hostinger Business (Node.js web app) | `next start` on port from `PORT` env var |

---

## Hosting & Infrastructure

- **Host:** Hostinger Business plan (Dad's existing account)
- **Domain:** scgpeople.co.uk
- **Database:** Neon PostgreSQL (eu-west-2 region)
- **App runner:** Node.js web app on Hostinger, `npm run build && npm start`
- **Git branch deployed:** `claude/westcote-place-finance-portal-TnHha`
- **SSL:** Hostinger-managed (was stuck on "Installing" — contact Hostinger live chat to force-reinstall)
- **Email:** Hostinger business mailboxes @scgpeople.co.uk for actual email, Resend API for transactional invoice emails

---

## Environment Variables

```bash
# Database (Neon PostgreSQL — production)
DATABASE_URL="postgresql://neondb_owner:<password>@ep-red-bonus-ab11kzbi-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# NextAuth
NEXTAUTH_SECRET="<generate: openssl rand -base64 32>"
NEXTAUTH_URL="https://scgpeople.co.uk"    # use http:// temporarily if SSL not yet active

# One-time data import token
SETUP_TOKEN="setup2025"

# Resend (invoice emails)
RESEND_API_KEY="re_xxxx"
FROM_EMAIL="invoices@scgpeople.co.uk"

# File uploads (optional — defaults to ./uploads relative to project root)
UPLOAD_DIR="./uploads"
```

> **Security note:** The Neon connection string was shared in a chat message — rotate the database password in the Neon dashboard and update `DATABASE_URL` in Hostinger's environment variables panel.

---

## Folder Structure

```
/
├── prisma/
│   ├── schema.prisma          # Full Prisma schema (11 models)
│   └── seed.ts                # Seeds admin user + 16 units + 2025/2026 year
├── src/
│   ├── app/
│   │   ├── page.tsx           # Root redirect → /login
│   │   ├── layout.tsx         # Root HTML shell, fonts, globals
│   │   ├── globals.css        # Tailwind base + custom animations
│   │   ├── (admin)/           # Route group — Admin layout + all admin pages
│   │   │   ├── layout.tsx     # AdminSidebar + main content wrapper
│   │   │   └── admin/
│   │   │       ├── dashboard/
│   │   │       ├── invoices/
│   │   │       │   ├── generate/
│   │   │       │   └── [invoiceId]/
│   │   │       ├── units/
│   │   │       │   └── [unitId]/
│   │   │       ├── account/   # Password change for admin
│   │   │       ├── years/
│   │   │       ├── budget/
│   │   │       ├── leaseholders/
│   │   │       ├── payments/
│   │   │       ├── schedules/
│   │   │       └── documents/
│   │   │           └── upload/
│   │   ├── (auth)/
│   │   │   └── login/         # Credentials login form
│   │   ├── (leaseholder)/     # Route group — Leaseholder layout + portal pages
│   │   │   ├── layout.tsx
│   │   │   └── portal/
│   │   │       ├── page.tsx   # Dashboard
│   │   │       ├── invoices/
│   │   │       │   └── [invoiceId]/
│   │   │       ├── budget/
│   │   │       └── documents/
│   │   └── api/
│   │       ├── auth/[...nextauth]/  # NextAuth handler
│   │       ├── setup/              # One-time DB seed (SETUP_TOKEN protected)
│   │       ├── admin/import-2026/  # One-time 2026 data import (SETUP_TOKEN protected)
│   │       └── documents/[blobKey]/download/  # Authenticated file download
│   ├── components/
│   │   ├── admin/
│   │   │   └── AdminSidebar.tsx   # Nav sidebar with mobile hamburger drawer
│   │   ├── shared/
│   │   │   └── InvoicePDF.tsx     # @react-pdf/renderer invoice template
│   │   └── ui/                    # shadcn/ui components
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── select.tsx
│   │       └── skeleton.tsx
│   ├── lib/
│   │   ├── auth.config.ts          # Edge-safe NextAuth config (no Prisma import)
│   │   ├── auth.ts                 # Full NextAuth config with Prisma credential check
│   │   ├── prisma.ts               # Prisma client singleton (pg adapter for production)
│   │   ├── storage.ts              # Local disk file storage (save/read uploaded files)
│   │   ├── utils.ts                # cn() Tailwind class merger
│   │   ├── finance/
│   │   │   ├── apportionment.ts    # Pure apportionment calculation functions
│   │   │   ├── budgetReporting.ts  # Budget vs actuals aggregation
│   │   │   └── invoiceEngine.ts    # Invoice generation logic
│   │   ├── email/
│   │   │   └── sendInvoiceEmail.ts # Resend email with PDF attachment
│   │   └── pdf/
│   │       └── generateInvoicePdf.ts # Server-side PDF buffer generation
│   └── middleware.ts               # Route protection (session + role checks)
├── next.config.mjs                 # Security headers, webpack, external packages
├── tailwind.config.ts              # Brand colours, custom animations
├── package.json
└── .gitignore                      # Excludes .env, /uploads, *.db, /node_modules
```

---

## All Pages & Routes

### Admin (`/admin/*`) — requires `role: ADMIN`

| Route | File | Purpose |
|---|---|---|
| `/admin/dashboard` | `admin/dashboard/page.tsx` | KPI cards: total invoiced, collected, outstanding, overdue count |
| `/admin/invoices` | `admin/invoices/page.tsx` | All invoices with status filters |
| `/admin/invoices/generate` | `admin/invoices/generate/page.tsx` | Invoice generation wizard (select year + quarter) |
| `/admin/invoices/[invoiceId]` | `admin/invoices/[invoiceId]/page.tsx` | Invoice detail, PDF preview, send button |
| `/admin/units` | `admin/units/page.tsx` | List all 16 units with apportionment weights |
| `/admin/units/[unitId]` | `admin/units/[unitId]/page.tsx` | Unit ledger: invoices, payments, running balance |
| `/admin/account` | `admin/account/page.tsx` | Admin password change |
| `/admin/years` | `admin/years/page.tsx` | Service charge years management |
| `/admin/budget` | `admin/budget/page.tsx` | Budget line items, budget vs actuals chart |
| `/admin/leaseholders` | `admin/leaseholders/page.tsx` | Create/edit leaseholder accounts |
| `/admin/payments` | `admin/payments/page.tsx` | Record payments, reconciliation |
| `/admin/schedules` | `admin/schedules/page.tsx` | Schedule A/B detail, management fee %, expense items |
| `/admin/documents` | `admin/documents/page.tsx` | Document list, visibility management |
| `/admin/documents/upload` | `admin/documents/upload/page.tsx` | Upload new document |

### Leaseholder Portal (`/portal/*`) — requires `role: LEASEHOLDER`

| Route | File | Purpose |
|---|---|---|
| `/portal` | `portal/page.tsx` | Dashboard: next invoice amount, payment status summary |
| `/portal/invoices` | `portal/invoices/page.tsx` | Their invoices with status badges |
| `/portal/invoices/[invoiceId]` | `portal/invoices/[invoiceId]/page.tsx` | Invoice detail + PDF download |
| `/portal/budget` | `portal/budget/page.tsx` | Read-only budget view showing their unit's share |
| `/portal/documents` | `portal/documents/page.tsx` | Documents they have access to, download links |

### Auth

| Route | Purpose |
|---|---|
| `/login` | Credentials login form (email + password) |

### API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth handler |
| `/api/setup` | GET/POST | One-time DB seed (protected by `SETUP_TOKEN`) |
| `/api/admin/import-2026` | GET/POST | One-time 2026 financial data import (protected by `SETUP_TOKEN`) |
| `/api/documents/[blobKey]/download` | GET | Authenticated file download, streams file from disk |

---

## Data Model (Prisma)

```prisma
// 11 models in total

User              — email, passwordHash, name, role (ADMIN|LEASEHOLDER), failedLoginCount, lockedUntil
Leaseholder       — links User → Unit (1:1)
Unit              — unitRef, unitType (FLAT|COMMERCIAL), floorNumber, scheduleWeight
ServiceChargeYear — label ("2025/2026"), startDate, endDate, isCurrent
Schedule          — year, scheduleType (A|B), managementFeePercent
ExpenseCategory   — schedule, name, displayOrder
ExpenseItem       — category, description, amount, date, supplier, invoiceRef, receiptUrl
BudgetLineItem    — schedule, categoryName, budgetedAmount, displayOrder
Invoice           — unit, year, quarter (Q1-Q4), issueDate, dueDate, status, pdfUrl, sentAt
InvoiceLineItem   — invoice, scheduleType, annualScheduleTotal, quarterlyTotal, unitShareAmount,
                    managementFeeAmount, lineTotal, sharePercentage
Payment           — unit, invoice (nullable), amount, paymentDate, method, reference
Document          — title, fileUrl, fileName, visibility (ALL_LEASEHOLDERS|ADMIN_ONLY|SPECIFIC_UNITS)
DocumentUnitAccess — document, unitId (scoped access join table)
AuditLog          — userId, action, targetType, targetId, ipAddress, metadata
```

---

## Building & Units

**Westcote Place — 16 units:**

| Unit | Type | Schedule Weight | Sched A Share | Sched B Share |
|---|---|---|---|---|
| Flat 1 | Two-bed | 9 | ~9.85% | ~9.85% |
| Flat 2 | Two-bed | 9 | ~9.85% | ~9.85% |
| Flat 3 | One-bed | 7 | ~7.66% | ~7.66% |
| Flat 4 | One-bed | 7 | ~7.66% | ~7.66% |
| Flat 5 | One-bed | 7 | ~7.66% | ~7.66% |
| Flat 6 | One-bed | 7 | ~7.66% | ~7.66% |
| Flat 7 | One-bed | 7 | ~7.66% | ~7.66% |
| Flat 8 | One-bed | 7 | ~7.66% | ~7.66% |
| Flat 9 | Studio | 6 | ~6.57% | ~6.57% |
| Flat 10 | Studio | 6 | ~6.57% | ~6.57% |
| Flat 11 | Studio | 6 | ~6.57% | ~6.57% |
| Flat 12 | Studio | 6 | ~6.57% | ~6.57% |
| Flat 13 | Studio | 6 | ~6.57% | ~6.57% |
| Flat 14 | Studio | 6 | ~6.57% | ~6.57% |
| Flat 15 | Studio | 6 | ~6.57% | ~6.57% |
| Commercial | Commercial | — | **25% fixed** | Not charged |

- **Schedule A** (whole building): Commercial pays fixed 25%; flats share remaining 75% by weight
- **Schedule B** (flats only): All 15 flats share proportionally by weight; commercial excluded
- **Management fee:** 2% (applied to all unit charges)

---

## 2025/2026 Financial Data (Real Figures)

**Annual budgets:**
- Schedule A: £10,381.68 (Building Services £6,950.00 + Building Insurance £3,431.68)
- Schedule B: £7,300.00 (Flat Services £7,300.00)

**Q1 2025/2026 invoices (issue date: 1 Apr 2025, due date: 1 May 2025):**

| Unit | Annual A | Annual B | Q1 Credit | Net Q1 | Status |
|---|---|---|---|---|---|
| Flat 1 | £700.77 | £657.00 | −£228.81 | ~£90 | OVERDUE |
| Flat 2 | £700.77 | £657.00 | −£177.89 | ~£141 | PAID |
| Flat 3 | £545.04 | £511.00 | −£152.48 | ~£112 | OVERDUE |
| Flat 4 | £545.04 | £511.00 | −£152.48 | ~£112 | PAID |
| Flat 5 | £545.04 | £511.00 | −£152.48 | ~£112 | OVERDUE |
| Flat 6 | £545.04 | £511.00 | −£228.71 | ~£35 | OVERDUE |
| Flat 7 | £545.04 | £511.00 | −£177.89 | ~£86 | PAID |
| Flat 8 | £545.04 | £511.00 | −£152.48 | ~£112 | OVERDUE |
| Flat 9 | £467.18 | £438.00 | −£152.48 | ~£73 | OVERDUE |
| Flat 10 | £467.18 | £438.00 | −£152.48 | ~£73 | OVERDUE |
| Flat 11 | £467.18 | £438.00 | −£177.89 | ~£48 | OVERDUE |
| Flat 12 | £467.18 | £438.00 | −£177.89 | ~£48 | PAID |
| Flat 13 | £467.18 | £438.00 | −£152.48 | ~£73 | OVERDUE |
| Flat 14 | £467.18 | £438.00 | −£152.48 | ~£73 | OVERDUE |
| Flat 15 | £467.18 | £438.00 | −£152.48 | ~£73 | OVERDUE |
| Commercial | £2,595.42 | — | £0 | ~£649 | PAID |

Invoice numbers: `WP-2026-Q1-F01` through `WP-2026-Q1-F15` and `WP-2026-Q1-C01`

---

## Key Library Files

### `src/lib/finance/apportionment.ts`
Pure functions for calculating each unit's share of a schedule. Takes annual budget total, unit weight, total weight. Returns unit share amount and management fee.

### `src/lib/finance/invoiceEngine.ts`
Invoice generation logic: checks for existing invoices (idempotency), runs apportionment, creates Invoice + InvoiceLineItem records in the database. Excludes commercial from Schedule B.

### `src/lib/finance/budgetReporting.ts`
Aggregates budget line items vs actual expense items per schedule. Used by the budget page chart.

### `src/lib/pdf/generateInvoicePdf.ts`
Uses `@react-pdf/renderer`'s `renderToBuffer()` on the server. Returns a `Buffer` containing the PDF bytes.

### `src/lib/email/sendInvoiceEmail.ts`
Sends invoice email via Resend API with the PDF attached. Uses `FROM_EMAIL` env var as sender.

### `src/lib/storage.ts`
Local disk file storage. Replaces Netlify Blobs (which only works on Netlify). Saves files to `UPLOAD_DIR` (default `./uploads`). Prevents path traversal by using `path.basename()`.

### `src/lib/prisma.ts`
Singleton Prisma client. Uses `@prisma/adapter-pg` with pool size 3 for PostgreSQL (Neon). Falls back to `@prisma/adapter-better-sqlite3` for local `file:` URLs during development.

### `src/lib/auth.config.ts`
Edge-safe NextAuth config (no Prisma imports — safe for middleware). Has `trustHost: true` for Hostinger (non-Vercel host). JWT strategy, 8-hour session lifetime.

### `src/middleware.ts`
Route protection. Public routes (bypass auth): `/login`, `/api/auth/*`, `/api/setup`, `/api/admin/import-2026`. Admin routes require `role === "ADMIN"`. Leaseholder routes require any authenticated session.

---

## One-Time Setup Routes

After first deployment, run these URLs **once** in a browser (or via curl):

1. **Seed the database** (creates admin user + 16 units + 2025/2026 year):
   ```
   https://scgpeople.co.uk/api/setup?token=setup2025
   ```

2. **Load real 2026 financial data** (replaces placeholder invoices with real spreadsheet figures):
   ```
   https://scgpeople.co.uk/api/admin/import-2026?token=setup2025
   ```
   This route is idempotent — safe to re-run. It deletes existing Q1 2025/2026 invoices and recreates them with the correct amounts.

**Default admin login:**
- Email: `admin@scgpeople.co.uk`
- Password: `ChangeMe123!` ← **change this immediately via `/admin/account`**

---

## Security

- **Password hashing:** bcrypt with cost factor 12
- **Account lockout:** tracks `failedLoginCount`; locks account for 15 min after 5 failures
- **JWT sessions:** 8-hour lifetime, `HttpOnly`+`Secure`+`SameSite=Strict` cookies
- **Role enforcement:** middleware + server-side re-check in every Server Action
- **Leaseholder scoping:** all portal DB queries filter by `session.user.unitId` — no client-controlled unit selection
- **SQL injection:** structurally impossible (Prisma parameterised queries)
- **XSS:** structurally prevented (React escaping)
- **File uploads:** MIME validated server-side, stored outside web root, UUID filenames
- **Security headers:** CSP, HSTS, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy (configured in `next.config.mjs`)
- **Audit log:** sensitive admin actions written to `AuditLog` model (append-only)
- **Secrets:** all in `.env` — never committed (`.gitignore` enforced)

---

## Current Progress & Status

### Done
- [x] Full Prisma schema (11 models, PostgreSQL)
- [x] Seed script: admin user + 16 units + 2025/2026 service charge year
- [x] NextAuth v5 Credentials login with bcrypt + account lockout
- [x] Route protection middleware (role-based)
- [x] Admin layout with sidebar (mobile hamburger menu)
- [x] Admin dashboard with KPI cards
- [x] Unit list and unit detail/ledger pages
- [x] Leaseholder management (create/edit accounts)
- [x] Service charge years management
- [x] Schedule A/B pages with expense entry
- [x] Budget line item management with budget vs actuals chart (Recharts)
- [x] Invoice generation wizard (selects year + quarter, generates all unit invoices)
- [x] Invoice list with status filters
- [x] Invoice detail page with line items
- [x] PDF generation (`@react-pdf/renderer`, server-side)
- [x] Invoice sending via Resend email
- [x] Payment recording and reconciliation
- [x] Document upload (local disk storage)
- [x] Authenticated document download
- [x] Leaseholder portal: dashboard, invoices, invoice detail, budget view, documents
- [x] Admin password change page (`/admin/account`)
- [x] Loading skeletons (all major pages have `loading.tsx`)
- [x] Security headers in `next.config.mjs`
- [x] Switched from Netlify Blobs → local disk storage for Hostinger compatibility
- [x] One-time import route for real 2026 financial data
- [x] Deployed to Hostinger Business (Node.js web app, Neon PostgreSQL)
- [x] Brand colours (royal blue #1C3664, gold #C8962E) applied throughout

### Pending / Known Issues

- [ ] **SSL certificate stuck** — Hostinger dashboard shows "Installing" for 2+ days. Contact Hostinger live chat and ask them to force-reinstall the SSL certificate for scgpeople.co.uk. Until then, use `http://` (login works but is not encrypted).
- [ ] **Change admin password** — Default is `ChangeMe123!`, needs changing at `/admin/account` after first login.
- [ ] **Rotate Neon database password** — The connection string was shared in an insecure message. Go to Neon dashboard → project settings → connection string → reset password. Update `DATABASE_URL` in Hostinger env vars.
- [ ] **Run import route** — After deployment is confirmed running, open `http://scgpeople.co.uk/api/admin/import-2026?token=setup2025` to load the real 2026 invoice data.
- [ ] **Create leaseholder accounts** — No leaseholder user accounts have been created yet. Admin can create them at `/admin/leaseholders`.
- [ ] **Q2 invoices** — Q2 2025/2026 (due July 2025) not yet generated. Use the invoice generation wizard once Q1 situation is confirmed.
- [ ] **`@netlify/blobs` dependency** — Still in `package.json` but no longer used (replaced by `src/lib/storage.ts`). Can be removed: `npm uninstall @netlify/blobs`.

---

## Development Setup

```bash
# Clone and install
git clone <repo>
cd Scg-people-ltd-website-for-building-1
npm install

# Create local .env
cp .env.example .env
# Edit .env — for local dev, use: DATABASE_URL="file:./dev.db"

# Push schema + seed
npm run db:push
npm run db:seed

# Start dev server
npm run dev
```

For production (Hostinger), the build command is:
```bash
npm run build   # runs: prisma db push && next build
npm start       # runs: next start
```

---

## Git

- **Repo:** `mailadisin-hub/scg-people-ltd-website-for-building-1`
- **Working branch:** `claude/westcote-place-finance-portal-TnHha`
- **Hostinger deploys from:** this branch

---

*Last updated: June 2026*
