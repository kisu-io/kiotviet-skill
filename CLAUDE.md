# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Standalone SaaS product for Vietnamese SME shop owners on KiotViet POS. Provides AI-powered business intelligence, agentic workflows (smart restock, customer win-back, invoice reminders, price optimization), and omnichannel delivery (Zalo OA, Discord, Telegram, Email). Built with pure Node.js — zero external dependencies. Targeting a subscription model (Starter/Pro/Business tiers).

## Running Scripts

All scripts are standalone Node.js CLI tools. No build step, no `npm install`.

```bash
# Test authentication
node scripts/api_client.js

# Run any script with --key=value args
node scripts/get_sales_report.js --fromDate=2026-03-01 --toDate=2026-03-05
node scripts/get_low_stock.js --threshold=10
node scripts/get_inventory.js --branchId=1
```

There are no test suites, linters, or build commands configured.

## Required Environment Variables

```
KIOTVIET_CLIENT_ID
KIOTVIET_CLIENT_SECRET
KIOTVIET_RETAILER
```

These can be set via `.env` file (gitignored) or exported in shell.

## Architecture

### Current State (v2 — full product, dashboard + workflows + intelligence)

```
src/api/           — 9 API modules (invoices, products, customers, orders, suppliers, purchase-orders, branches, employees, promotions)
src/intelligence/  — demand-forecast, revenue-insights, customer-segments, pricing-advisor, anomaly-detector
src/workflows/     — daily-briefing, smart-restock, invoice-reminder, weekly-report, customer-winback
src/channels/      — Discord, Telegram, Zalo OA, router (src/channels/index.js)
src/config/        — Multi-tenant config loader + schema (shops/*.json)
scripts/           — 14 CLI scripts (kept for direct invocation + cron)
webhooks/          — Lightweight HTTP server for KiotViet webhooks (OrderCreated, LowStock)
dashboard/         — Next.js 15 app, password-protected, 7 pages wired to real KiotViet data
cron/jobs.json     — Scheduled job definitions
```

All dashboard pages fetch real KiotViet data via `dashboard/lib/backend.ts` bridge.

### API Client (`scripts/api_client.js`)
Central module used by all scripts. Handles OAuth 2.0 `client_credentials` flow against `https://id.kiotviet.vn/connect/token`. Caches tokens in `scripts/.token` (gitignored, 24h TTL). Exports `get(endpoint, params)` and `getToken()`. Base URL: `https://public.kiotapi.com`.

### Script Pattern
Every script in `scripts/` follows the same structure:
1. Parse `--key=value` CLI args into an object
2. Call `apiClient.get('/endpoint', params)`
3. Transform response data into a structured summary
4. Output JSON to stdout via `console.log(JSON.stringify(result, null, 2))`

### Key Files
- `PRODUCT_PLAN.md` — Roadmap and context. v1.0 done; current sprint is Zalo OA, anomaly detection, webhooks.
- `cron/jobs.json` — All scheduled job definitions (smart-restock, daily-briefing, invoice-reminder, weekly-report, anomaly-check, customer-winback).
- `dashboard/lib/backend.ts` — Bridge from Next.js API routes to `src/` Node.js modules.
- `shops/example-shop.json` — Reference config with all supported fields.

### Running the Dashboard
```bash
cd dashboard && npm run dev   # http://localhost:3000
```

### Running the Webhook Server
```bash
node webhooks/server.js --port=4000
# POST http://localhost:4000/webhook/:shopId
```

## Conventions

- **Zero dependencies**: Use only Node.js built-in modules (`https`, `http`, `fs`, `path`). No npm packages.
- **Output format**: All scripts output structured JSON to stdout. Errors go to stderr.
- **Vietnamese context**: Agent output should use Vietnamese when user writes in Vietnamese. Currency formatted as `1.000.000 VND` (dots as thousand separators). Dates as `DD/MM/YYYY`.
- **API target**: Retail only (`public.kiotapi.com`), not F&B (`publicfnb.kiotapi.com`).
- **Rate limit**: KiotViet API allows 5,000 requests/hour.
