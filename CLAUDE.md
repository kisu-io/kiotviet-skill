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

### Current State (v1 — read-only CLI scripts)
All code lives in `scripts/`. Each script is a standalone CLI tool that queries one KiotViet API endpoint.

### Planned Structure (see `PRODUCT_PLAN.md`)
```
src/api/           — Full API coverage (read + write), refactored from scripts/api_client.js
src/intelligence/  — AI analysis (demand forecast, RFM segments, pricing advisor, anomaly detection)
src/workflows/     — Autonomous agentic workflows (smart-restock, customer-winback, invoice-reminder)
src/channels/      — Omnichannel delivery router (Zalo OA, Discord, Telegram, Email)
src/config/        — Per-tenant shop config (multi-shop support via shops/*.json)
scripts/           — CLI scripts (kept for backward compat + direct invocation)
webhooks/          — Real-time KiotViet event listener (OrderCreated, LowStock)
```

### API Client (`scripts/api_client.js`)
Central module used by all scripts. Handles OAuth 2.0 `client_credentials` flow against `https://id.kiotviet.vn/connect/token`. Caches tokens in `scripts/.token` (gitignored, 24h TTL). Exports `get(endpoint, params)` and `getToken()`. Base URL: `https://public.kiotapi.com`.

### Script Pattern
Every script in `scripts/` follows the same structure:
1. Parse `--key=value` CLI args into an object
2. Call `apiClient.get('/endpoint', params)`
3. Transform response data into a structured summary
4. Output JSON to stdout via `console.log(JSON.stringify(result, null, 2))`

### Key Files
- `PRODUCT_PLAN.md` — Detailed roadmap covering: API completeness (Phase 1), intelligence layer with demand forecasting and RFM segmentation (Phase 2), agentic workflows (Phase 3), omnichannel delivery (Phase 4), and multi-tenant config (Phase 5).
- `cron/jobs.json` — Scheduled job definitions (daily sales, inventory alerts, weekly reports). Will be extended with workflow jobs (smart-restock, daily-briefing, etc.).
- `SKILL.md` and `_meta.json` — Legacy OpenClaw skill metadata. To be replaced/removed as the product becomes standalone.

## Conventions

- **Zero dependencies**: Use only Node.js built-in modules (`https`, `http`, `fs`, `path`). No npm packages.
- **Output format**: All scripts output structured JSON to stdout. Errors go to stderr.
- **Vietnamese context**: Agent output should use Vietnamese when user writes in Vietnamese. Currency formatted as `1.000.000 VND` (dots as thousand separators). Dates as `DD/MM/YYYY`.
- **API target**: Retail only (`public.kiotapi.com`), not F&B (`publicfnb.kiotapi.com`).
- **Rate limit**: KiotViet API allows 5,000 requests/hour.
