# Walkthrough Guide

Step-by-step guide to set up, configure, and run the KiotViet Shop Automation system.

---

## 1. Install

```bash
git clone <repo-url> && cd kiotviet-skill
npm install
```

This installs the only dependency: `dotenv`.

---

## 2. Configure your shop

### Option A: Quick start with environment variables

Copy the template and fill in your credentials:

```bash
cp .env.example .env
```

```env
KIOTVIET_CLIENT_ID=your_client_id
KIOTVIET_CLIENT_SECRET=your_client_secret
KIOTVIET_RETAILER=your_store_name
```

Get these from KiotViet admin: **Cai dat cua hang → Ket noi API**.

Then edit the shop config:

```bash
cp shops/example-shop.json shops/myshop.json
```

```json
{
  "shopId": "myshop",
  "retailer": "",
  "clientId": "",
  "clientSecret": ""
}
```

Leave `clientId`/`clientSecret`/`retailer` empty — they'll fall back to your `.env` values. Or fill them in directly for multi-tenant setups where each shop has different credentials.

### Option B: Multi-tenant (multiple shops)

Create a separate JSON file per shop in `shops/`:

```bash
cp shops/example-shop.json shops/shop-hanoi.json
cp shops/example-shop.json shops/shop-hcm.json
```

Each file has its own credentials, branch, channels, and workflow settings. Shop JSON files (except `example-shop.json`) are gitignored.

---

## 3. Test authentication

```bash
# New API client (multi-tenant)
node src/api/client.js

# Old API client (still works, uses env vars directly)
node scripts/api_client.js
```

Both should return `{ "success": true, "token_preview": "eyJ..." }`.

Tokens are cached separately:
- Old scripts: `scripts/.token`
- New system: `shops/.tokens/{shopId}.json`

---

## 4. Run CLI scripts

### Original scripts (unchanged, use env vars)

```bash
node scripts/get_sales_report.js --fromDate=2026-03-01 --toDate=2026-03-05
node scripts/get_low_stock.js --threshold=10
node scripts/get_inventory.js --branchId=1
node scripts/get_orders.js --status=Processing --limit=20
node scripts/get_invoices.js --fromDate=2026-03-01
node scripts/get_customers.js --orderBy=totalRevenue --limit=10
node scripts/get_customer_summary.js --id=12345
node scripts/get_top_products.js --fromDate=2026-03-01 --limit=10
```

### New scripts (use shop config)

All new scripts accept `--shopId=myshop` (defaults to `example-shop`).

**List suppliers:**
```bash
node scripts/get_suppliers.js --shopId=myshop
```

**List purchase orders:**
```bash
node scripts/get_purchase_orders.js --shopId=myshop --status=1
```

**Create a purchase order:**
```bash
node scripts/create_purchase_order.js \
  --shopId=myshop \
  --supplierId=123 \
  --branchId=1 \
  --products=456:50,789:30
```

The `--products` format is `productId:quantity` pairs, comma-separated.

**Revenue insights (WoW + MoM):**
```bash
node scripts/get_revenue_insights.js --shopId=myshop
```

Returns week-over-week and month-over-month comparison of revenue, invoice count, and average order value with trend indicators.

**Send a message to a channel:**
```bash
node scripts/send_channel_message.js --channel=discord --msg="Hello from KiotViet!"
node scripts/send_channel_message.js --channel=telegram --msg="Xin chao!"
```

---

## 5. Set up notification channels

### Discord

1. In your Discord server: **Server Settings → Integrations → Webhooks → New Webhook**
2. Copy the webhook URL
3. Add to your shop config or `.env`:

```json
{
  "channels": {
    "primary": "discord",
    "discord": {
      "webhookUrl": "https://discord.com/api/webhooks/..."
    }
  }
}
```

Or in `.env`:
```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

### Telegram

1. Message [@BotFather](https://t.me/BotFather) on Telegram → `/newbot` → copy the bot token
2. Start a chat with your bot, then get your chat ID from `https://api.telegram.org/bot<TOKEN>/getUpdates`
3. Add to shop config or `.env`:

```json
{
  "channels": {
    "primary": "telegram",
    "telegram": {
      "botToken": "123456:ABC...",
      "chatId": "987654321"
    }
  }
}
```

Test it:
```bash
node scripts/send_channel_message.js --channel=telegram --msg="Test tu KiotViet!"
```

---

## 6. Run workflows

### Daily Briefing

Sends a Vietnamese morning report: yesterday's sales, week-over-week revenue trend, and low stock alerts.

```bash
node src/workflows/daily-briefing.js --shopId=myshop
```

Sample output message:

```
☀ BAO CAO SANG — 05/03/2026

📊 Hom qua (2026-03-04):
  • So hoa don: 47
  • Doanh thu: 12.500.000 VND

📈 So voi tuan truoc: ▲ +15.3%
  • Doanh thu tuan: 85.000.000 VND
  • So don tuan: 312

⚠ Sap het hang: 3 san pham duoi 10 don vi
  • Giay Nike Air: con 2
  • Ao Polo XL: con 5
  • Tui xach da: con 8
```

Toggle off in config:
```json
{ "workflows": { "dailyBriefing": false } }
```

### Smart Restock

Analyzes 30-day sales velocity, predicts stockout dates, and suggests reorder quantities for 14-day cover.

```bash
node src/workflows/smart-restock.js --shopId=myshop
```

The output JSON includes:
- `recommendations[]` — sorted by urgency (critical → warning)
- `data.critical` / `data.warning` — counts
- `message` — Vietnamese summary sent to your channel

**Auto-create purchase orders** for critical items:
```json
{ "workflows": { "autoCreatePO": true } }
```

When enabled, the workflow automatically creates a PO in KiotViet for all products that will stock out within 3 days. Use with caution — review the forecast output first with `autoCreatePO: false`.

---

## 7. Schedule with cron

The file `cron/jobs.json` defines scheduled jobs:

| Job | Schedule | What it does |
|-----|----------|--------------|
| `smart-restock` | 7:00 AM daily | Demand forecast + restock alerts |
| `daily-briefing` | 7:30 AM daily | Morning sales + stock summary |
| `daily-sales` | 8:00 AM daily | Sales report (legacy) |
| `daily-inventory` | 9:00 AM daily | Low stock alert (legacy) |
| `weekly-report` | 9:00 AM Monday | Weekly summary (legacy) |

If using OpenClaw as the scheduler, copy `cron/jobs.json` into your OpenClaw cron directory. Otherwise, set up system cron:

```bash
# crontab -e
0  7 * * * cd /path/to/kiotviet-skill && node src/workflows/smart-restock.js --shopId=myshop
30 7 * * * cd /path/to/kiotviet-skill && node src/workflows/daily-briefing.js --shopId=myshop
```

---

## 8. Project structure

```
kiotviet-skill/
├── shops/                        # Per-tenant config (gitignored except example)
│   ├── example-shop.json
│   └── .tokens/                  # Cached OAuth tokens per shop
├── src/
│   ├── config/
│   │   ├── schema.js             # Config defaults + validation
│   │   └── loader.js             # loadShopConfig(), parseArgs(), dotenv
│   ├── api/
│   │   ├── client.js             # createClient(config) → { get, post, getToken }
│   │   ├── invoices.js           # getInvoices, getInvoiceDetails (paginated)
│   │   ├── products.js           # getProducts, getLowStock (paginated)
│   │   ├── customers.js          # getCustomers, getCustomerById (paginated)
│   │   ├── orders.js             # getOrders (paginated)
│   │   ├── suppliers.js          # getSuppliers, getSupplierById (paginated)
│   │   ├── purchase-orders.js    # getPurchaseOrders, createPurchaseOrder
│   │   └── branches.js           # getBranches
│   ├── intelligence/
│   │   ├── demand-forecast.js    # 30-day velocity → stockout prediction
│   │   └── revenue-insights.js   # WoW / MoM revenue comparison
│   ├── channels/
│   │   ├── discord.js            # Webhook delivery, 2000 char split
│   │   ├── telegram.js           # Bot API delivery, 4096 char split
│   │   └── index.js              # Channel router (send, sendToAll)
│   └── workflows/
│       ├── daily-briefing.js     # Morning report workflow
│       └── smart-restock.js      # Demand forecast → restock workflow
├── scripts/                      # CLI tools (old + new)
│   ├── api_client.js             # Original API client (env vars)
│   ├── get_sales_report.js       # (original)
│   ├── get_top_products.js       # (original)
│   ├── get_inventory.js          # (original)
│   ├── get_low_stock.js          # (original)
│   ├── get_orders.js             # (original)
│   ├── get_invoices.js           # (original)
│   ├── get_customers.js          # (original)
│   ├── get_customer_summary.js   # (original)
│   ├── get_suppliers.js          # NEW
│   ├── get_purchase_orders.js    # NEW
│   ├── create_purchase_order.js  # NEW
│   ├── get_revenue_insights.js   # NEW
│   └── send_channel_message.js   # NEW
└── cron/
    └── jobs.json                 # Scheduled job definitions
```

---

## 9. How the two systems coexist

| | Old scripts | New system |
|--|-------------|------------|
| **Config** | `process.env.*` directly | `shops/{shopId}.json` + env fallback |
| **API client** | `scripts/api_client.js` | `src/api/client.js` with `createClient()` |
| **Token storage** | `scripts/.token` | `shops/.tokens/{shopId}.json` |
| **Pagination** | Single page only | Up to 2000 items (20 pages) |
| **Output** | JSON to stdout | JSON to stdout + channel delivery |
| **Multi-tenant** | No | Yes — one config file per shop |

Old scripts are never modified. They continue working exactly as before.
