# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SaaS product for Vietnamese SME shop owners on KiotViet POS. Provides AI-powered business intelligence, agentic workflows (smart restock, customer win-back, invoice reminders, price optimization), and omnichannel delivery.
Powered by a **Next.js 16** dashboard, **Supabase** backend, and pure **Node.js** workflow engine.

## Required Environment Variables

To run the Next.js Dashboard and the Node.js workflows:

```env
# KiotViet Integration
KIOTVIET_CLIENT_ID=
KIOTVIET_CLIENT_SECRET=
KIOTVIET_RETAILER=

# Supabase Auth & DB
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Architecture (v2 — Full SaaS Platform)

```
supabase/          — SQL Schema (shops, profiles, user_shops, logs)
dashboard/         — Next.js 16 App Router UI (moving to Server Components)
src/api/           — Connectors for 9 KiotViet entities
src/intelligence/  — Deep-dive analysis functions (RFM, pricing, anomaly)
src/workflows/     — Cron-driven automation jobs
src/channels/      — Notification dispatch algorithms
src/config/        — Fallback system and schema parsing
scripts/           — CLI invocation tools
webhooks/          — Native HTTP server for real-time events
cron/jobs.json     — Master scheduler registry
```

### Running the Dashboard
```bash
cd dashboard && npm run dev   # http://localhost:3000
```
*Note: Dashboard uses Supabase SSR. Ensure your Supabase instance is running and has applied the migrations from `supabase/migrations/001_initial_schema.sql`.*

### Running Scripts
Scripts are standalone tools to manually invoke logic.
```bash
node scripts/api_client.js
node scripts/get_sales_report.js --fromDate=2026-03-01 --toDate=2026-03-05
node scripts/get_low_stock.js --threshold=10
```

### Key Files
- `PRODUCT_PLAN.md` — Roadmap and context. v2 active with Supabase integration.
- `cron/jobs.json` — All scheduled job definitions.
- `dashboard/lib/backend.ts` — Bridge from Next.js to Node.js modules.
- `dashboard/utils/supabase/server.ts` — Core Supabase SSR Client utility.

## Conventions

- **Server-Side Data:** In the Dashboard, prefer React Server Components over `useEffect` proxy fetches.
- **Node Backend:** In `src/`, stick to pure Node.js as much as possible to keep execution fast for edge deployment.
- **Vietnamese context**: Agent output should use Vietnamese when user writes in Vietnamese. Currency formatted as `1.000.000 VND`. Dates as `DD/MM/YYYY`.
- **API target**: Retail only (`public.kiotapi.com`), not F&B (`publicfnb.kiotapi.com`).
- **Rate limit**: KiotViet API allows 5,000 requests/hour. Build graceful retries on 429/5xx into `api_client.js`.
