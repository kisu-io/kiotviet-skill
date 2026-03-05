# Changelog

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
- **Login**: Password-protected access via `DASHBOARD_PASSWORD` env var
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

### v1.0 ships with
- 9 API modules: invoices, products, customers, orders, suppliers, purchase-orders, branches, employees, promotions
- 4 intelligence modules: demand-forecast, revenue-insights, customer-segments, pricing-advisor
- 4 workflows: daily-briefing, smart-restock, invoice-reminder, weekly-report
- 2 channels: Discord, Telegram + router
- Dashboard: 7 pages with real KiotViet data, password-protected
- Multi-tenant config: shops/*.json with env var overrides
- 14 CLI scripts + complete onboarding docs
