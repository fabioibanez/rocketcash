# RocketCash

A self-hosted, low-cost personal finance dashboard — net worth tracking, account aggregation, and a transaction feed — built to run on free/near-free tiers. See [`SPEC.md`](./SPEC.md) for the full design.

## Stack

- **Next.js 16** (App Router, React Server Components) — UI + API in one repo
- **Prisma 6** + **PostgreSQL** (Supabase)
- **Auth.js (NextAuth v5)** with **Google** OAuth, database sessions
- **Plaid** (`plaid` + `react-plaid-link`) for bank linking & transactions
- **Tailwind CSS v4** + shadcn-style components, **Recharts** for the net-worth chart
- **Vercel** for hosting + Cron (daily sync safety net)

## Project layout

```text
src/
├── app/
│   ├── (auth)/login/            # Google sign-in
│   ├── (main)/                  # Authenticated app (layout guards the session)
│   │   ├── dashboard/           # Net worth, chart, accounts, recent txns
│   │   ├── transactions/        # Searchable, paginated feed (URL params)
│   │   └── settings/            # Link / unlink banks, manual sync
│   └── api/
│       ├── auth/[...nextauth]/  # Auth.js handlers
│       └── plaid/               # create-link-token, exchange-public-token,
│                                # webhook, sync, refresh, remove-item
├── components/                  # layout, plaid, dashboard, transactions, ui
└── lib/                         # db, plaid, crypto, sync, queries, webhook
prisma/schema.prisma             # Data model (§4 of the spec)
vercel.json                      # Daily cron → /api/plaid/sync
```

## Getting started

### 1. Install

```bash
npm install
```

### 2. Configure environment

```bash
cp env.example .env
```

Fill in `.env`:

- **Supabase** — create a project, then copy both connection strings from
  *Project Settings → Database*. Use the **pooled** string (port `6543`,
  add `?pgbouncer=true&connection_limit=1`) for `DATABASE_URL` and the
  **direct** string (port `5432`) for `DIRECT_URL`.
- **Auth.js** — `AUTH_SECRET=$(openssl rand -base64 32)`. Create a Google
  OAuth client (Google Cloud Console → Credentials) and set
  `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`. Authorized redirect URI:
  `http://localhost:3000/api/auth/callback/google` (and your prod URL).
- **Plaid** — grab `PLAID_CLIENT_ID` / `PLAID_SECRET` from the Plaid
  dashboard. Start with `PLAID_ENV=sandbox`.
- **CRON_SECRET** — `openssl rand -hex 32`.
- **ENCRYPTION_KEY** — `openssl rand -base64 32` (encrypts Plaid access
  tokens at rest).

### 3. Create the database schema

```bash
npm run db:generate   # generate Prisma client
npm run db:migrate    # create & apply the first migration (uses DIRECT_URL)
```

(For a quick start without migration history you can use `npm run db:push`.)

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000, sign in with Google, then go to **Settings →
Link a bank account**. In sandbox, use Plaid's test credentials
(`user_good` / `pass_good`). The dashboard populates after the initial sync.

## How sync works

- **On link**, `exchange-public-token` stores an encrypted access token and
  runs an initial `/transactions/sync`.
- **Plaid webhook** (`/api/plaid/webhook`) triggers an incremental sync when
  new transactions are ready. The route verifies Plaid's JWT signature.
- **Vercel Cron** hits `/api/plaid/sync` once a day as a safety net. The
  route requires `Authorization: Bearer $CRON_SECRET`.
- **Manual** — the *Sync now* button on Settings calls the authenticated
  `/api/plaid/refresh` for your own items.

Each sync upserts transaction deltas via the saved cursor, refreshes account
balances, and writes a daily `historical_balances` snapshot used for the
net-worth chart (`net worth = Σ assets − Σ liabilities`).

## Deploy (Vercel)

1. Push to GitHub and import the repo in Vercel.
2. Add all `.env` variables in the Vercel project settings. Set `AUTH_URL`
   to your deployed URL and `PLAID_WEBHOOK_URL` to
   `https://<your-app>/api/plaid/webhook`.
3. `vercel.json` registers the daily cron automatically. Vercel injects
   `CRON_SECRET` into the cron request's `Authorization` header.
4. Run `npm run db:deploy` (or let the build's `prisma generate` + a manual
   migration handle the schema).

## Notes

- **Cost:** hosting, Postgres, and cron are effectively free at single-user
  scale. Plaid is the cost to watch — verify current pricing at
  [plaid.com/pricing](https://plaid.com/pricing). Build in sandbox first.
- **PWA:** `public/manifest.json` + `public/icon.svg` make the app
  installable. For best iOS home-screen fidelity, add PNG icons
  (`icon-192x192.png`, `icon-512x512.png`) and reference them in the manifest.
```
