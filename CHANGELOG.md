# Changelog

## v2.0.0-alpha (2026-03-06)

### Architecture & Security (Major Focus)
- **Supabase Integration**: Transitioned from a stateless architecture to a persistent database model.
- **SQL Migration**: Added `supabase/migrations/001_initial_schema.sql` defining `profiles`, `shops`, `user_shops`, and logging tables.
- **Row Level Security (RLS)**: Implemented strict RLS matching Supabase Auth UUIDs to protect multi-tenant data.
- **Next.js Auth Flow**: Completely rewrote the authentication flow (`/login`, `/register`) to use `@supabase/ssr` cookies instead of hardcoded passwords.

### Dashboard Refactoring
- **React Server Components (RSC)**: Initiated migration from client-side `useEffect` proxy endpoints to server-side rendering for optimal speed.
- **Reusable UI Components**: Abstracted complex inline code from the Dashboard into shared `shadcn/ui` based components:
  - `StatCard` (Dashboard, Inventory, Revenue pages)
  - `RevenueAreaChart` (Recharts integration)
  - `TopProductsTable`

## v1.0.0 (2026-03-05)

### Dashboard (New)
- Real-time dashboard with 7 pages powered by live KiotViet data
- **Overview**: KPI cards (today/week/month revenue), 7-day revenue chart, recent orders, low stock alerts
- **Inventory**: Full product list with search, stock status badges, inventory value
- **Orders**: Invoice list with tabs (all/completed/pending), 7-day view
- **Customers**: RFM segmentation (Champions, Loyal, At-Risk, Lost) with 90-day analysis
- **Workflows**: View and configure all 4 automated workflows
- **Channels**: Channel status (Discord, Telegram) with configuration state
- **Settings**: Read/edit shop config, test connection, test channels, save settings
- 10 API routes bridging Next.js to Node.js backend modules

### Workflows (2 New)
- **Invoice Reminder** (`src/workflows/invoice-reminder.js`): Daily overdue invoice alerts, tiered by severity (7d/14d/30d+), Vietnamese messages
- **Weekly Report** (`src/workflows/weekly-report.js`): Monday executive summary with revenue, top products, customer RFM segments, pricing recommendations

### Intelligence (2 New)
- **Customer Segments** (`src/intelligence/customer-segments.js`): RFM analysis over 90 days, quintile scoring, 4 segment classification
- **Pricing Advisor** (`src/intelligence/pricing-advisor.js`): Slow movers (suggest discount %) and fast movers (hold/increase signal)

### API Modules (2 New)
- **Employees** (`src/api/employees.js`): GET /users (staff list)
- **Promotions** (`src/api/promotions.js`): GET /promotions (active promos)

### Improvements
- API client retry logic: 1 retry with 2s delay on 429/5xx errors
- Config schema updated with new workflow toggles and thresholds
- Weekly report upgraded with customer segment + pricing advisor sections
- Updated cron/jobs.json with invoice-reminder and weekly-report jobs

### Documentation
- `docs/SETUP.md`: Complete onboarding guide (Vietnamese)
- `docs/WORKFLOWS.md`: All 4 workflows documented with sample output
- `docs/CHANNELS.md`: Discord webhook + Telegram bot setup guide
- `README.md`: Product-facing overview with architecture and quick start
