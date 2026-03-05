# KiotViet POS Integration Skill

Business intelligence layer on top of [KiotViet](https://www.kiotviet.vn/) POS. Query sales, inventory, orders, invoices, and customers via the KiotViet public API. Built with pure Node.js — zero external dependencies.

## Setup

### 1. Get API credentials

In KiotViet admin panel: **Cài đặt cửa hàng → Kết nối API**

Copy your `Client ID` and `Client Secret`.

### 2. Set environment variables

```bash
export KIOTVIET_CLIENT_ID="your_client_id"
export KIOTVIET_CLIENT_SECRET="your_client_secret"
export KIOTVIET_RETAILER="your_store_name"
```

Or create a `.env` file (never commit this):
```
KIOTVIET_CLIENT_ID=your_client_id
KIOTVIET_CLIENT_SECRET=your_client_secret
KIOTVIET_RETAILER=your_store_name
```

### 3. Test authentication

```bash
node scripts/api_client.js
# → { "success": true, "token_preview": "eyJhbGciOi..." }
```

## Scripts

| Script | Description | Example |
|--------|-------------|---------|
| `get_sales_report.js` | Revenue summary by date range | `node scripts/get_sales_report.js --fromDate=2026-03-01 --toDate=2026-03-05` |
| `get_top_products.js` | Best-selling products | `node scripts/get_top_products.js --fromDate=2026-03-01 --limit=10` |
| `get_inventory.js` | Current stock levels | `node scripts/get_inventory.js --branchId=1` |
| `get_low_stock.js` | Products below threshold | `node scripts/get_low_stock.js --threshold=10` |
| `get_orders.js` | Recent orders by status | `node scripts/get_orders.js --status=Processing --limit=20` |
| `get_invoices.js` | Invoices with overdue detection | `node scripts/get_invoices.js --fromDate=2026-03-01` |
| `get_customers.js` | Top customers by spend | `node scripts/get_customers.js --orderBy=totalRevenue --limit=10` |
| `get_customer_summary.js` | Full profile for one customer | `node scripts/get_customer_summary.js --id=12345` |

## Authentication

`api_client.js` handles OAuth 2.0 `client_credentials` flow automatically:
- Fetches token from `https://id.kiotviet.vn/connect/token`
- Caches token in `scripts/.token` for 24h (gitignored)
- Auto-refreshes on expiry
- Attaches `Authorization: Bearer` + `Retailer` headers to every request

## API Reference

Base URL: `https://public.kiotapi.com`
Rate limit: 5,000 requests/hour
Docs: https://developer.kiotviet.vn/

## OpenClaw Cron Jobs

Three pre-configured cron jobs are included in this repo (`cron/jobs.json`):

| Job | Schedule | Description |
|-----|----------|-------------|
| `daily-kiotviet-sales` | 8 AM daily | Sales report + top 5 products in Vietnamese |
| `daily-kiotviet-inventory` | 9 AM daily | Low stock alert (< 10 units) |
| `weekly-kiotviet-report` | 9 AM Monday | Weekly executive summary |

To activate, copy jobs into `/home/oc-kevin/.openclaw/cron/jobs.json` and set `"enabled": true`.
