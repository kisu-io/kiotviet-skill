# Plan: KiotViet Shop Automation — Full Product

## Context

The current kiotviet skill is a read-only BI layer (8 query scripts, 3 Discord cron jobs) running inside OpenClaw. The goal is to evolve it into a **sellable SaaS product** for Vietnamese SME shop owners on KiotViet, delivering:

- **AI agentic workflows** that act autonomously (restock, win-back customers, chase invoices, optimize pricing)
- **Omnichannel delivery** (Zalo OA first — Vietnam's dominant messaging app, then Discord, Telegram, Email)
- **Multi-tenant architecture** so the same codebase serves many shops
- **Write operations** beyond read-only queries (create purchase orders, send messages, trigger promotions)

Market context: KiotViet has 150K+ merchants, targeting 300K. Pain points are inventory cash flow, manual tracking, multi-channel chaos, and no customer retention automation. No comparable AI agent product exists in the Vietnamese SME market.

---

## Product Architecture

```
┌─────────────────────────────────────────────────────┐
│                  SHOP OWNER TOUCHPOINTS             │
│  Zalo OA  │  Discord  │  Telegram  │  Email  │ SMS │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────┐
│              OPENCLAW AGENT LAYER                   │
│  universal-team agent  │  Cron scheduler            │
│  Skill: kiotviet       │  Webhook listener          │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────┐
│              KIOTVIET-SKILL CODEBASE                │
│  src/api/        — Full API coverage (read + write) │
│  src/intelligence/ — AI analysis & recommendations  │
│  src/workflows/  — Autonomous agentic workflows     │
│  src/channels/   — Omnichannel delivery router      │
│  src/config/     — Per-tenant shop config           │
│  scripts/        — OpenClaw-compatible CLI scripts  │
│  webhooks/       — Real-time event listener         │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────┐
│           KIOTVIET PUBLIC API                       │
│  https://public.kiotapi.com  (retail)               │
│  https://publicfnb.kiotapi.com  (F&B)               │
│  Webhooks: OrderCreated, OrderUpdated, LowStock      │
└─────────────────────────────────────────────────────┘
```

---

## Repository Structure

Evolve `kisu-io/kiotviet-skill` to this layout:

```
kiotviet-skill/
├── src/
│   ├── api/
│   │   ├── client.js              # OAuth client (refactored from api_client.js)
│   │   ├── invoices.js            # Invoice queries + write
│   │   ├── products.js            # Product & inventory
│   │   ├── customers.js           # Customer CRUD
│   │   ├── orders.js              # Orders
│   │   ├── suppliers.js           # NEW: Supplier list
│   │   ├── purchase-orders.js     # NEW: GET + POST purchase receipts
│   │   ├── employees.js           # NEW: Staff management
│   │   ├── branches.js            # NEW: Branch data
│   │   └── promotions.js          # NEW: Promotions/discounts
│   ├── intelligence/
│   │   ├── demand-forecast.js     # Predict restock timing from sales velocity
│   │   ├── customer-segments.js   # RFM scoring (Recency/Frequency/Monetary)
│   │   ├── pricing-advisor.js     # Slow-mover detection + discount suggestions
│   │   ├── anomaly-detector.js    # Unusual sales spikes/drops
│   │   └── revenue-insights.js    # WoW/MoM comparison
│   ├── workflows/
│   │   ├── smart-restock.js       # Low stock → PO suggestion → notify owner
│   │   ├── customer-winback.js    # Churned customers → Zalo/SMS message
│   │   ├── invoice-reminder.js    # Overdue → reminder → escalate
│   │   ├── price-optimizer.js     # Slow movers → discount/promotion
│   │   ├── daily-briefing.js      # Morning AI brief with action items
│   │   └── weekly-report.js       # Executive weekly summary
│   ├── channels/
│   │   ├── zalo.js                # Zalo OA API (primary Vietnam channel)
│   │   ├── discord.js             # Discord webhooks (existing)
│   │   ├── telegram.js            # Telegram Bot API
│   │   ├── email.js               # SMTP nodemailer-free (raw SMTP)
│   │   └── index.js               # Route message to configured channel
│   └── config/
│       ├── schema.js              # Shop config structure + validation
│       └── loader.js              # Load from shops/*.json or env vars
├── scripts/                       # OpenClaw CLI scripts (existing pattern)
│   ├── api_client.js              # ← existing (keep for OpenClaw compat)
│   ├── get_sales_report.js        # ← existing
│   ├── get_top_products.js        # ← existing
│   ├── get_inventory.js           # ← existing
│   ├── get_low_stock.js           # ← existing
│   ├── get_orders.js              # ← existing
│   ├── get_invoices.js            # ← existing
│   ├── get_customers.js           # ← existing
│   ├── get_customer_summary.js    # ← existing
│   ├── get_suppliers.js           # NEW
│   ├── get_purchase_orders.js     # NEW
│   ├── create_purchase_order.js   # NEW (write operation)
│   ├── get_revenue_insights.js    # NEW (WoW/MoM AI analysis)
│   └── send_channel_message.js    # NEW (route to configured channel)
├── webhooks/
│   ├── server.js                  # Lightweight HTTP server (no Express)
│   └── handlers/
│       ├── order-created.js       # Trigger on new order
│       ├── low-stock.js           # Trigger on stock alert
│       └── payment-received.js    # Trigger on invoice paid
├── shops/
│   └── example-shop.json          # Per-tenant config template
├── cron/
│   └── jobs.json                  # Extended cron job templates
├── docs/
│   ├── SETUP.md                   # Onboarding guide for new shops
│   ├── WORKFLOWS.md               # Workflow documentation
│   └── CHANNELS.md                # How to configure each channel
├── SKILL.md                       # OpenClaw skill definition (updated)
├── package.json
└── README.md
```

---

## Phase 1 — API Completeness (New Endpoints)

Extend beyond current 8 scripts. New endpoints to cover from KiotViet API:

| Module | Endpoint | Operations |
|--------|----------|------------|
| `suppliers.js` | `/suppliers` | GET list, GET by ID |
| `purchase-orders.js` | `/purchase-receipts` | GET list, GET by ID, POST create |
| `employees.js` | `/users` | GET staff list |
| `branches.js` | `/branches` | GET all branches |
| `promotions.js` | `/promotions` | GET active promos |

**Write operations** (currently all read-only):
- `POST /purchase-receipts` — create restock order
- `POST /customers/{id}/loyalty` — award loyalty points
- Webhook registration via KiotViet admin (HMAC SHA-256 verified)

---

## Phase 2 — Intelligence Layer

Each module outputs structured JSON with `recommendations[]` array for the agent to act on.

### `demand-forecast.js`
- Input: 30-day sales velocity per product from `/invoicedetails`
- Output: Days-until-stockout per product, reorder priority score
- Logic: `daysRemaining = onHand / avgDailySales`

### `customer-segments.js`
- RFM scoring: Recency (last purchase), Frequency (order count), Monetary (total spend)
- Segments: Champions, Loyal, At-Risk, Lost
- Output: Customer list by segment with recommended action per segment

### `pricing-advisor.js`
- Slow movers: high stock + low sales velocity → suggest discount %
- Fast movers: low stock + high velocity → suggest price increase
- Output: Product list with price recommendations

### `anomaly-detector.js`
- Compare today's hourly revenue vs 4-week average for same day/hour
- Flag if >30% deviation
- Output: Alert with context (which products, which branch)

### `revenue-insights.js`
- WoW (week-over-week) and MoM (month-over-month) comparisons
- Category breakdown, branch breakdown
- Output: Structured insight with % changes and trend arrows

---

## Phase 3 — Agentic Workflows

Each workflow runs as an OpenClaw cron job. The agent reads the workflow script output and decides what actions to take.

### Workflow 1: Smart Restock (`smart-restock.js`)
```
Trigger: Daily 7 AM cron
1. get_low_stock.js --threshold=10
2. demand-forecast.js → days-until-stockout
3. get_suppliers.js → match supplier per product
4. Generate PO suggestion with quantities
5. Notify owner via primary channel
6. If auto-approve enabled: create_purchase_order.js
```

### Workflow 2: Customer Win-Back (`customer-winback.js`)
```
Trigger: Daily 10 AM cron
1. customer-segments.js → "At-Risk" and "Lost" segments
2. For each: generate personalized message (last purchase + product recs)
3. send_channel_message.js → Zalo OA customer message
4. Log outreach to avoid repeat within 14 days
```

### Workflow 3: Invoice Reminder (`invoice-reminder.js`)
```
Trigger: Daily 9 AM cron
1. get_invoices.js → filter isOverdue=true
2. For each overdue: check days overdue (7d / 14d / 30d tiers)
3. Tier 1 (7d): polite Zalo reminder to customer
4. Tier 2 (14d): firmer message + escalate to owner
5. Tier 3 (30d+): flag for manual follow-up, post to owner channel
```

### Workflow 4: Price Optimizer (`price-optimizer.js`)
```
Trigger: Weekly Monday 8 AM
1. pricing-advisor.js → slow movers list
2. Suggest discount % per product
3. Owner approves via channel reply
4. If approved: create promotion via KiotViet API
```

### Workflow 5: Daily Intelligence Brief (`daily-briefing.js`)
```
Trigger: Daily 7:30 AM
1. get_sales_report.js --fromDate=yesterday
2. revenue-insights.js → WoW comparison
3. get_low_stock.js → count of alerts
4. anomaly-detector.js → any flags
5. Compose prioritized action list
6. Deliver to owner's primary channel in Vietnamese
```

### Workflow 6: Weekly Executive Report (`weekly-report.js`)
```
Trigger: Monday 9 AM
1. get_sales_report.js → last 7 days
2. get_top_products.js → top 10
3. customer-segments.js → new vs returning
4. get_invoices.js → outstanding balance
5. revenue-insights.js → MoM view
6. Full executive summary → email + channel
```

---

## Phase 4 — Omnichannel Delivery

Priority order for Vietnam market:

| Channel | Use Case | API |
|---------|----------|-----|
| **Zalo OA** | Customer messages, owner alerts | Zalo Official Account API |
| **Discord** | Power user / developer owner (existing) | Webhook (existing) |
| **Telegram** | Fallback, international | Bot API |
| **Email** | Weekly reports, formal invoices | Raw SMTP |
| **SMS** | Urgent payment reminders | VNPT SMS / FPT SMS |

### `src/channels/index.js` — Channel Router
```js
// Route based on shop config
async function send(shopConfig, message) {
  const channel = shopConfig.channels.primary; // 'zalo' | 'discord' | 'telegram'
  return channels[channel].send(shopConfig, message);
}
```

### `src/channels/zalo.js`
- Uses Zalo OA API v3
- Supports: text messages, structured templates, image+caption
- Owner notifications + customer outreach (with consent)
- Env: `ZALO_OA_ACCESS_TOKEN`, `ZALO_OA_ID`

---

## Phase 5 — Multi-Tenant Config

### `shops/example-shop.json`
```json
{
  "shopId": "shop-abc",
  "name": "Cửa hàng ABC",
  "kiotviet": {
    "clientId": "",
    "clientSecret": "",
    "retailer": ""
  },
  "channels": {
    "primary": "zalo",
    "zaloOaAccessToken": "",
    "zaloOwnerId": "",
    "discordWebhook": "",
    "telegramBotToken": "",
    "telegramChatId": "",
    "email": ""
  },
  "thresholds": {
    "lowStock": 10,
    "overdueInvoiceDays": 7,
    "winbackDays": 30,
    "anomalyPercent": 30
  },
  "workflows": {
    "dailyBriefing": true,
    "smartRestock": true,
    "autoCreatePO": false,
    "customerWinback": true,
    "invoiceReminder": true,
    "priceOptimizer": false,
    "weeklyReport": true
  },
  "language": "vi",
  "timezone": "Asia/Ho_Chi_Minh",
  "currency": "VND"
}
```

### Runtime: Multi-shop support
Each cron job gets `--shopId=shop-abc` flag → `config/loader.js` reads `shops/shop-abc.json` → all scripts use that shop's credentials and channels.

---

## Scope Decisions (Confirmed)

- **Target**: Retail shops (fashion, electronics, grocery) — not F&B, so use `public.kiotapi.com` only
- **Channels v1**: Discord + Telegram (Zalo OA added later when onboarding other shops)
- **MVP workflows**: Daily AI Briefing + Smart Restock — best demo value + direct ROI for retail
- **Customer Win-Back**: Phase 2 after Zalo OA is integrated (requires messaging customers)

---

## Monetization Tiers

| Tier | Price | Features |
|------|-------|---------|
| **Starter** (free) | 0 VND | Daily brief + low stock via Discord/Telegram |
| **Pro** | ~500K VND/mo | All workflows + Zalo OA + invoice reminders + customer win-back |
| **Business** | ~2M VND/mo | Multi-branch + auto PO creation + price optimizer + email reports + SMS |

---

## Cron Jobs to Add (Extended)

Append to `cron/jobs.json`:

| Job ID | Schedule | Workflow |
|--------|----------|---------|
| `smart-restock` | `0 7 * * *` | Smart restock suggestion |
| `customer-winback` | `0 10 * * *` | Churn prevention messages |
| `invoice-reminder` | `0 9 * * *` | Overdue invoice chase |
| `daily-briefing` | `30 7 * * *` | Morning AI brief |
| `price-optimizer` | `0 8 * * 1` | Weekly slow-mover report |
| `anomaly-check` | `0 * * * *` | Hourly revenue anomaly scan |

---

## Critical Files

| File | Status | Action |
|------|--------|--------|
| `src/api/client.js` | New | Refactor from `scripts/api_client.js` |
| `src/api/suppliers.js` | New | Create |
| `src/api/purchase-orders.js` | New | Create (includes POST) |
| `src/api/promotions.js` | New | Create |
| `src/intelligence/demand-forecast.js` | New | Create |
| `src/intelligence/customer-segments.js` | New | Create |
| `src/intelligence/pricing-advisor.js` | New | Create |
| `src/intelligence/anomaly-detector.js` | New | Create |
| `src/intelligence/revenue-insights.js` | New | Create |
| `src/workflows/*.js` | New | Create all 6 workflows |
| `src/channels/zalo.js` | New | Create (Zalo OA API) |
| `src/channels/telegram.js` | New | Create |
| `src/channels/email.js` | New | Create |
| `src/channels/index.js` | New | Create router |
| `src/config/schema.js` | New | Create |
| `src/config/loader.js` | New | Create |
| `webhooks/server.js` | New | Create |
| `webhooks/handlers/*.js` | New | Create 3 handlers |
| `shops/example-shop.json` | New | Create |
| `scripts/get_suppliers.js` | New | Create (CLI compat) |
| `scripts/create_purchase_order.js` | New | Create (first write script) |
| `scripts/get_revenue_insights.js` | New | Create |
| `scripts/send_channel_message.js` | New | Create |
| `SKILL.md` | Modify | Update with new capabilities |
| `cron/jobs.json` | Modify | Add 6 new workflow jobs |
| `docs/SETUP.md` | New | Create onboarding guide |
| `README.md` | Modify | Product-facing readme |

---

## Implementation Order (MVP First)

### Sprint 1 — Foundation + MVP Demo (shippable to first customer)
1. **`src/config/`** — multi-tenant config loader + `shops/example-shop.json`
2. **`src/api/`** — suppliers + purchase-orders + branches (retail-only, no F&B)
3. **`src/intelligence/demand-forecast.js`** — sales velocity + days-until-stockout
4. **`src/intelligence/revenue-insights.js`** — WoW/MoM comparison
5. **`src/workflows/daily-briefing.js`** — Morning AI brief with action items
6. **`src/workflows/smart-restock.js`** — Low stock → PO suggestion
7. **`src/channels/discord.js`** + **`src/channels/telegram.js`** + router
8. **`scripts/`** — new CLI scripts (suppliers, POs, revenue insights, send message)
9. **`cron/jobs.json`** — add daily-briefing + smart-restock jobs

### Sprint 2 — Full Intelligence + More Workflows
10. **`src/intelligence/customer-segments.js`** — RFM scoring
11. **`src/intelligence/pricing-advisor.js`** — slow-mover detection
12. **`src/intelligence/anomaly-detector.js`** — hourly revenue anomaly
13. **`src/workflows/invoice-reminder.js`** — overdue chase
14. **`src/workflows/price-optimizer.js`** — slow-mover discount suggestions
15. **`src/channels/email.js`** — formal reports

### Sprint 3 — Write Operations + Zalo + Customer Outreach
16. **`src/api/purchase-orders.js`** POST — create POs automatically
17. **`src/channels/zalo.js`** — Zalo OA integration
18. **`src/workflows/customer-winback.js`** — Zalo customer messaging
19. **`webhooks/`** — real-time event server (OrderCreated, LowStock)
20. **`docs/`** + product **README.md** — sellable onboarding docs

---

## First Action After Approval

Push this plan as `PRODUCT_PLAN.md` to `kisu-io/kiotviet-skill` on GitHub so it's accessible from Mac for continued development.

---

## Verification

1. `node src/api/client.js` — auth test
2. `node scripts/get_suppliers.js` → supplier JSON
3. `node scripts/get_revenue_insights.js --fromDate=2026-02-01` → WoW analysis
4. `node scripts/send_channel_message.js --channel=telegram --msg="test"` → delivery test
5. `node src/workflows/daily-briefing.js --shopId=example-shop` → full briefing to configured channel
6. Enable `daily-briefing` cron in OpenClaw → verify morning message arrives on Zalo/Discord
7. Simulate low stock → `smart-restock` workflow → PO suggestion posted to owner channel
