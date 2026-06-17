# RocketCash — Technical Specification

> A self-hosted, low-cost personal finance dashboard that emulates [Rocket Money](https://www.rocketmoney.com/) (net worth tracking, account aggregation, and a transaction feed) — built to run on free or near-free tiers.

**Goal:** Track net worth and transactions across all my bank accounts in one place, on web and mobile (PWA), while keeping monthly running costs as close to $0 as possible.

---

## Table of Contents

1. [Tech Stack Selection](#1-tech-stack-selection)
2. [Cost Strategy](#2-cost-strategy)
3. [Directory Structure](#3-directory-structure)
4. [Data Model](#4-data-model)
5. [Core Page Specifications](#5-core-page-specifications)
6. [API & Background Sync Strategy](#6-api--background-sync-strategy)
7. [Environment Variables](#7-environment-variables)
8. [Mobile Progressive Web App (PWA) Setup](#8-mobile-progressive-web-app-pwa-setup)
9. [Suggested Build Order](#9-suggested-build-order)

---

## 1. Tech Stack Selection

| Concern | Choice | Notes |
| --- | --- | --- |
| **Framework** | Next.js (App Router) | Co-locates frontend UI and backend API in one repo |
| **Database ORM** | Prisma *or* Drizzle | Type-safe DB access; Drizzle is lighter, Prisma has a gentler learning curve |
| **Database Engine** | PostgreSQL | Hosted on Supabase, Neon, or Vercel Postgres |
| **Authentication** | Auth.js (NextAuth) | Secure, cookie-based sessions |
| **Styling** | Tailwind CSS + shadcn/ui | Pre-built, accessible, responsive components |
| **Financial Data** | Plaid SDK | `plaid-node` (server) + `react-plaid-link` (client) |
| **Deployment** | Vercel | Enables Vercel Cron jobs for the daily background sync |

---

## 2. Cost Strategy

Since the entire point of RocketCash is to replicate Rocket Money *cheaply*, the architecture is deliberately serverless so there's no always-on server to pay for.

**Where the cost actually lives:**

- **Hosting, DB, and cron are effectively free** at this scale. Vercel's Hobby plan (including Cron Jobs), Neon/Supabase free Postgres tiers, and Auth.js all cost $0 for a single-user app.
- **Plaid is the one cost to watch.** Plaid offers a free sandbox for development and a limited free production allowance, but pricing and free-tier limits change frequently and are billed per connected account ("Item") — verify current terms at [plaid.com/pricing](https://plaid.com/pricing) before relying on it.

> **Recommendation:** Build against Plaid Sandbox first (free), confirm the full flow works, then decide between Plaid Production vs. SimpleFIN based on which institutions you actually need.

---

## 3. Directory Structure

With the Next.js App Router, frontend UI and backend API logic live in the same repository.

```text
src/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx           # Login/Signup page
│   ├── (main)/                      # Group for authenticated routes
│   │   ├── layout.tsx               # Responsive wrapper (Sidebar / Bottom Nav)
│   │   ├── dashboard/page.tsx       # Server Component: net worth & recent txns
│   │   ├── transactions/page.tsx    # Server Component: paginated feed via search params
│   │   └── settings/page.tsx        # Manage linked Plaid accounts
│   └── api/                         # Backend server logic
│       ├── auth/[...nextauth]/route.ts
│       └── plaid/
│           ├── create-link-token/route.ts
│           ├── exchange-public-token/route.ts
│           ├── webhook/route.ts     # Receives Plaid transaction-ready pings
│           └── sync/route.ts        # Triggered by Vercel Cron or webhook
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx              # Desktop left navigation
│   │   └── BottomNav.tsx            # Mobile bottom navigation
│   ├── plaid/
│   │   └── PlaidLinkButton.tsx      # Client Component: initializes Plaid SDK
│   └── transactions/
│       ├── TransactionList.tsx      # Client Component: interactive table/list
│       └── NetWorthChart.tsx        # Client Component: renders historical graph
└── lib/
    ├── db.ts                        # Prisma/Drizzle connection instance
    └── plaid.ts                     # Plaid API client configuration
```

---

## 4. Data Model

The sync logic references several tables, so here is the minimum schema to support net worth tracking and the transaction feed. (Shown ORM-agnostic; translate to your Prisma/Drizzle schema.)

| Table | Purpose | Key Columns |
| --- | --- | --- |
| `users` | App accounts (Auth.js) | `id`, `email`, `created_at` |
| `items` | One row per linked bank connection | `id`, `user_id`, `plaid_access_token` (encrypted), `plaid_item_id`, `sync_cursor`, `institution_name` |
| `accounts` | Individual accounts within an item | `id`, `item_id`, `plaid_account_id`, `name`, `type` (asset/liability), `subtype`, `current_balance`, `currency` |
| `transactions` | Synced transactions | `id`, `account_id`, `plaid_txn_id`, `date`, `merchant_name`, `category`, `amount`, `pending` |
| `historical_balances` | Daily snapshot for the net worth chart | `id`, `account_id`, `date`, `balance` |

**Notes:**

- Store `plaid_access_token` **encrypted at rest**, never in plain text — it is a long-lived credential to the user's bank.
- `items.sync_cursor` stores the cursor returned by Plaid's `/transactions/sync` so each run only fetches deltas.
- Net worth at any date = `SUM(asset balances) − SUM(liability balances)`, derived from `historical_balances`.

---

## 5. Core Page Specifications

### Dashboard (`/dashboard`)

- **Architecture:** React Server Component (RSC). Queries the database directly for accounts, current balances, and historical net worth, then passes raw data to client components for rendering.
- **Desktop UI:** A wide grid — a main net worth line chart spanning the top, an Asset vs. Liability account breakdown on the left, and recent transactions on the right.
- **Mobile UI:** Vertically stacked — a large net worth figure at the top, a horizontal swipeable list of account balances, then the chart and recent transactions.

### Transactions Feed (`/transactions`)

- **Architecture:** Uses Next.js URL search parameters for server-side filtering and pagination. Searching or changing a filter updates the URL (e.g. `?query=Starbucks&page=2`), which re-triggers the Server Component to fetch exactly the data needed — no heavy client-side state.
- **Desktop UI:** A data-dense table — `Date | Merchant | Category | Account | Amount`.
- **Mobile UI:** A vertical list of card-like rows — merchant name and amount bolded, date and category in smaller, muted text beneath.

### Settings & Bank Linking (`/settings`)

- **Architecture:** A mix of Server and Client components.
- **Flow:**
  1. The page loads and calls your internal `/api/plaid/create-link-token` route.
  2. The `PlaidLinkButton` Client Component takes that token and opens the Plaid UI.
  3. The user successfully logs into their bank.
  4. The component sends the resulting `public_token` to `/api/plaid/exchange-public-token`.
  5. The server exchanges it and securely saves the permanent `access_token` into PostgreSQL.

---

## 6. API & Background Sync Strategy

Because RocketCash uses no external background worker (e.g. Celery), the daily sync runs on serverless primitives.

- **Plaid Webhooks:** When an account connects, register a webhook URL pointing at your app (e.g. `https://yourapp.com/api/plaid/webhook`). Plaid pings this route whenever new transactions are ready, enabling near-real-time updates.
- **Vercel Cron Jobs:** Define a cron schedule in `vercel.json`. Once a day, Vercel hits `/api/plaid/sync` as a safety net in case a webhook is missed.

**Sync logic (`/api/plaid/sync`):**

1. Fetch all active items (bank connections) from the database.
2. Call Plaid's `/transactions/sync` endpoint using each item's saved `sync_cursor`.
3. Upsert new/modified transactions and remove any Plaid marks as deleted.
4. Persist the updated cursor back to the item.
5. Update current account balances and write a row into `historical_balances` for the net worth chart.

> **Security note:** Both `/sync` (cron) and `/webhook` routes should reject unauthenticated calls — verify Plaid's webhook signature, and protect the cron route with a secret header (e.g. `CRON_SECRET`) so it can't be triggered by the public internet.

---

## 7. Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Auth.js
AUTH_SECRET=            # generate with: openssl rand -base64 32
AUTH_URL=https://yourapp.com

# Plaid
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox       # sandbox | production
PLAID_WEBHOOK_URL=https://yourapp.com/api/plaid/webhook

# Cron protection
CRON_SECRET=            # any random string; checked in /api/plaid/sync

# Token encryption
ENCRYPTION_KEY=         # for encrypting Plaid access tokens at rest
```

---

## 8. Mobile Progressive Web App (PWA) Setup

To get RocketCash on a phone's home screen with a native feel, you only need two files in your `public/` folder:

- **`manifest.json`** — defines the app name, theme colors, and icons.
- **`icon-512x512.png`** — the home-screen app icon.

Update the root `layout.tsx` to include the PWA metadata:

```typescript
export const metadata = {
  title: 'RocketCash',
  manifest: '/manifest.json',
  themeColor: '#0a0a0a',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'RocketCash',
  },
};
```

---

## 9. Suggested Build Order

A pragmatic path from empty repo to working app:

1. **Scaffold** — Next.js + Tailwind + shadcn/ui, with the directory structure above.
2. **Database** — stand up Postgres (Neon/Supabase free tier), define the schema from §4 in Prisma/Drizzle, run the first migration.
3. **Auth** — wire up Auth.js so routes under `(main)/` are protected.
4. **Plaid in Sandbox** — implement `create-link-token` → `exchange-public-token`, store an encrypted access token. Confirm a test bank links end-to-end.
5. **Sync** — build `/api/plaid/sync`, run it manually, and verify transactions + balances populate.
6. **UI** — build the dashboard and transactions feed against real synced data.
7. **Automation** — add the Vercel Cron schedule and Plaid webhook handler.
8. **PWA** — add the manifest and icons; install it on your phone.
9. **Go live (optional)** — decide Plaid Production vs. SimpleFIN, swap `PLAID_ENV`, and ship.