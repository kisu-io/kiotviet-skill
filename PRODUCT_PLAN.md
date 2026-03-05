# Plan: KiotViet Shop Automation — Full Product

> **Status as of 2026-03-06**: v2.0 is actively in development. We have successfully migrated from a stateless architecture to a **Supabase-backed** system for Auth and User/Shop management. The Next.js dashboard is undergoing major refactoring to extract reusable UI components (Proposal 1 complete) and migrate to React Server Components (Proposal 2 in progress). See CHANGELOG.md for history.

---

## Context

The current kiotviet skill evolved from a read-only BI layer into a **sellable SaaS product** for Vietnamese SME shop owners on KiotViet. It delivers:

- **AI agentic workflows** that act autonomously (restock, win-back customers, chase invoices, optimize pricing)
- **Omnichannel delivery** (Discord, Telegram, Zalo OA planned)
- **Multi-tenant architecture** (now powered by Supabase `shops`, `profiles`, and `user_shops` tables)
- **Write operations** beyond read-only queries (create purchase orders, send messages, trigger promotions)

Market context: KiotViet has 150K+ merchants. Pain points are inventory cash flow, manual tracking, multi-channel chaos.

---

## Product Architecture (v2.0)

```
┌─────────────────────────────────────────────────────┐
│                  SHOP OWNER TOUCHPOINTS             │
│  Next.js Dashboard │ Discord │ Telegram │ Zalo OA   │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────┐
│              SUPABASE (AUTH & DB)                   │
│  Profiles │ Shops │ User_Shops │ Workflow_Logs      │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────┐
│              KIOTVIET-SKILL CODEBASE                │
│  dashboard/      — Next.js 16 App Router UI         │
│  src/api/        — Full API coverage (read + write) │
│  src/intelligence/ — AI analysis & recommendations  │
│  src/workflows/  — Autonomous agentic workflows     │
│  src/channels/   — Omnichannel delivery router      │
│  scripts/        — Standalone CLI scripts           │
│  webhooks/       — Real-time event listener         │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────┐
│           KIOTVIET PUBLIC API                       │
│  https://public.kiotapi.com  (retail)               │
└─────────────────────────────────────────────────────┘
```

---

## Repository Structure

```
kiotviet-skill/
├── dashboard/               # Next.js 16 Dashboard (App Router, Tailwind 4, shadcn/ui)
├── supabase/                # Supabase schema migrations
├── src/
│   ├── api/                 # 9 API modules (invoices, products, customes, etc)
│   ├── intelligence/        # 4 AI modules (forecast, segments, pricing, anomaly)
│   ├── workflows/           # 4 autonomous workflows
│   ├── channels/            # Discord, Telegram config
│   └── config/              # Feature flags
├── scripts/                 # CLI tools for manual testing
├── webhooks/                # HTTP server for KiotViet events
├── shops/                   # Local secrets & JSON shop fallbacks
├── cron/                    # Scheduled jobs
└── docs/                    # User setup docs
```

---

## Active Proposals & Roadmap

### Proposal 1: UI Component Extraction (✅ Completed)
Extracted inline chart and table logic from complex dashboard pages into shared `shadcn/ui` style components:
- `StatCard`
- `RevenueAreaChart`
- `TopProductsTable`

### Proposal 2: Next.js Server Components Migration (🚧 In Progress)
Converting all dashboard pages from heavy `"use client"` data fetching to Next.js React Server Components (RSC) to leverage direct backend module execution and eliminate unnecessary `/api/` proxy routes.

### Proposal 3: Backend TypeScript Conversion (⏳ Planned)
Moving `src/` out of the root into `dashboard/lib/backend/` and porting all pure Node.js JavaScript files to strict TypeScript to share types seamlessly with the Next.js frontend.

---

## Monetization Tiers

| Tier | Price | Features |
|------|-------|---------|
| **Starter** (free) | 0 VND | Daily brief + low stock via Discord/Telegram |
| **Pro** | ~500K VND/mo | All workflows + Zalo OA + invoice reminders |
| **Business** | ~2M VND/mo | Auto PO creation + price optimizer + email reports + SMS |

---

## Critical Files & Status

| File/Folder | Status | Note |
|------|--------|--------|
| `supabase/` | ✅ Active | SQL Migrations & RLS policies |
| `src/api/` | ✅ Active | 9 core API wrappers |
| `src/intelligence/` | ✅ Active | 4 analysis engines |
| `src/workflows/` | ✅ Active | 4 scheduled automations |
| `dashboard/` | 🚧 Refactoring | Moving to RSC, standardizing UI |

---

## Verification

1. `node src/api/client.js` — auth test
2. Dashboard builds without errors: `cd dashboard && npm run build`
3. Supabase tests: Ensure `NEXT_PUBLIC_SUPABASE_URL` is set and auth flows work.
