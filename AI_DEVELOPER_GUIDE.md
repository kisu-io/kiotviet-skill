# KiotViet Gateway — AI Developer & Architecture Guide

## 1. System Overview
The KiotViet Gateway is a full-stack platform consisting of a high-performance **Node.js** backend engine, a **Supabase** backend-as-a-service, and a **Next.js (App Router)** Control Dashboard. It acts as middleware between KiotViet's Public API and external channels/automations, adding intelligent capabilities (AI-driven alerts, RFM segmentation, Win-back campaigns) while persisting tenant state and user sessions securely in Supabase.

## 2. Technology Stack
- **Frontend Dashboard:** Next.js 16+ (App Router), React 19, TypeScript, Tailwind CSS v4, `shadcn/ui`, Framer Motion, Recharts.
- **Backend Core:** Pure Node.js (No heavy frameworks like Express). Uses native `http`/`https` modules.
- **Auth & Database:** Supabase (PostgreSQL, Row Level Security, Auth Sessions).
- **Styling:** Premium aesthetic, Oklch colors, dual-theme (Light/Dark mode) with glassmorphism components.

## 3. Directory Structure
```text
kiotviet-skill/
├── dashboard/               # Next.js App Router (Control Panel UI)
│   ├── app/                 # Next.js Pages & RSC components
│   ├── components/ui/       # reusable shadcn/ui React components
│   └── lib/                 # Auth helpers (supabase) & Node.js bridge
├── supabase/                # SQL migrations & RLS configurations
│   └── migrations/          # 001_initial_schema.sql (Profiles, Shops, Logs)
├── src/                     # Core Business Logic (Pure Node.js)
│   ├── api/                 # KiotViet API Client wrappers & Token management
│   ├── channels/            # Outgoing message adapters (Discord, Telegram, Zalo OA)
│   ├── config/              # Feature flags & Thresholds
│   ├── intelligence/        # AI & Data analysis (Anomaly, RFM, Pricing)
│   └── workflows/           # Automated campaign scripts (Winback, Restock)
├── webhooks/                # Real-time Webhook Receiver
├── shops/                   # Local fallback config & API tokens
├── cron/                    # Scheduled job registry
└── scripts/                 # CLI entry points and E2E Test Runners
```

## 4. Core Modules & Extensibility

### Intelligence & AI (`src/intelligence/`)
- **Revenue Anomaly Detector:** Compares current hour's revenue to the historical average.
- **Customer Segmentation:** Computes RFM to categorize users (VIP, At-Risk, Lost).
- **Demand Forecast & Pricing:** Suggests price discounts based on stock velocity.
*How to Extend:* Create new `.js` modules here. They should accept the configured `api` client and return JSON insights.

### Outbound Channels (`src/channels/`)
- Supports **Discord**, **Telegram**, and **Zalo OA**.
*How to Extend:* Add a new file implementing `send(config, message)` and register in `index.js`.

### Automated Workflows (`src/workflows/`)
- Independent async scripts triggered manually via CLI or automated via Cron.
- Current campaigns: Daily Briefing, Invoice Reminders, Restock, Winback.

## 5. Next.js Frontend & Supabase Bridge
The `dashboard/` is migrating heavily towards React Server Components (RSC) to maximize performance and security.
1. Supabase SSR handles authentication (cookies/sessions).
2. The Dashboard loads initial data server-side via direct access to `src/api` wrappers (using `lib/backend.ts`).
3. Client components handle interactive UI (charts, tables) using data passed down as props.

**Mock Mode:** 
If credentials are not fully configured, `lib/backend.ts` can intercept `createApiClient()` and spawn a **Mock API Client** feeding realistic dummy data for offline UI development.

## 6. Development Rules for AI Agents
1. **Node Dependencies:** Avoid bringing heavy modules into `src/`. Rely on built-ins or lightweight utilities.
2. **Database State:** Use Supabase for persisting tenant configuration, user profiles, and event logs. Do not bypass RLS policies.
3. **shadcn/ui Integrity:** Use Tailwind v4 `@plugin` standards. Follow modern Next.js 15+ App Router patterns (Server Components by default).
4. **Data Fetching:** Prefer React Server Components over client-side `useEffect` data fetching wherever possible to reduce proxy API route sprawl.
