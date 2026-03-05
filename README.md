# KiotViet Gateway — Shop Automation SaaS

AI-powered business intelligence and automation for Vietnamese SME shop owners on [KiotViet](https://www.kiotviet.vn/) POS. Real-time dashboard, automated workflows, and omnichannel notifications.

## Features

**Dashboard** — Real-time KiotViet data across 7 pages: overview KPIs, inventory, orders, customer RFM segments, workflows, channels, settings. Password-protected.

**4 Automated Workflows**
| Workflow | Schedule | What it does |
|----------|----------|-------------|
| Daily Briefing | 07:30 daily | Yesterday's revenue, WoW trends, low stock alerts |
| Smart Restock | 07:00 daily | 30-day demand forecast, auto-PO for critical items |
| Invoice Reminder | 09:00 daily | Overdue invoice tiers: 7d polite, 14d firm, 30d+ flag |
| Weekly Report | 09:00 Monday | Executive summary: revenue, top products, RFM, pricing |

**4 Intelligence Modules**
- Demand Forecast — stockout prediction + order quantity suggestions
- Revenue Insights — week-over-week and month-over-month analysis
- Customer Segments — RFM scoring (Champions, Loyal, At-Risk, Lost)
- Pricing Advisor — slow movers (discount) vs fast movers (hold/increase)

**9 API Modules**: invoices, products, customers, orders, suppliers, purchase-orders, branches, employees, promotions

**2 Notification Channels**: Discord webhook, Telegram Bot API

## Quick Start

```bash
# 1. Configure credentials
cp .env.example .env
# Edit .env with your KiotViet API credentials

# 2. Configure shop
cp shops/example-shop.json shops/my-shop.json
# Edit with your retailer name

# 3. Test connection
node src/api/client.js

# 4. Run your first report
node src/workflows/daily-briefing.js --shopId=my-shop

# 5. Start dashboard
cd dashboard && npm install && npm run dev
# Open http://localhost:3000
```

See [docs/SETUP.md](docs/SETUP.md) for detailed setup instructions.

## Architecture

```
src/api/           — 9 KiotViet API modules (invoices, products, customers, etc.)
src/intelligence/  — 4 AI analysis modules (demand forecast, RFM, pricing, revenue)
src/workflows/     — 4 automated workflows (daily briefing, restock, invoice, weekly)
src/channels/      — 2 notification channels (Discord, Telegram) + router
src/config/        — Multi-tenant config loader + schema validation
dashboard/         — Next.js 16 dashboard with 7 pages + API routes
shops/             — Per-shop JSON configuration
cron/              — Scheduled job definitions
docs/              — Setup, workflow, and channel documentation
scripts/           — 14 standalone CLI tools
```

## CLI Scripts

All scripts output JSON to stdout. No npm install required (pure Node.js).

```bash
node scripts/get_sales_report.js --fromDate=2026-03-01 --toDate=2026-03-05
node scripts/get_low_stock.js --threshold=10
node scripts/get_inventory.js --branchId=1
node scripts/get_invoices.js --fromDate=2026-03-01
node scripts/get_customers.js --orderBy=totalRevenue
node scripts/get_orders.js --status=Processing
```

## Documentation

- [docs/SETUP.md](docs/SETUP.md) — Step-by-step onboarding guide
- [docs/WORKFLOWS.md](docs/WORKFLOWS.md) — Workflow documentation with sample outputs
- [docs/CHANNELS.md](docs/CHANNELS.md) — Discord + Telegram setup

## Tech Stack

- **Backend**: Pure Node.js (zero npm dependencies)
- **Dashboard**: Next.js 16, React 19, Tailwind CSS 4, shadcn/ui
- **API**: KiotViet Public API (OAuth 2.0 client_credentials)
- **Rate limit**: 5,000 requests/hour with automatic retry on 429/5xx

## License

Private — All rights reserved.
