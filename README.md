# Demand Good QA Intelligence

Minimal, Vercel-ready Next.js App Router MVP for a quality and regulatory intelligence product.

## Run locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

Visit `http://localhost:3000`, then use **Member login** to create or sign in to a Clerk account. The dashboard is protected by Clerk authentication.

## Product boundaries

- The dashboard uses intentionally static mock data for the MVP.
- Dashboard data is stored per active Clerk organization in Supabase Postgres (`supabase/schema.sql`) and read through the validated server-side repository in `lib/dashboard-data.ts`. Use `/dashboard/data` to add or remove metrics, actions, suppliers, regulatory items, licenses, and digest records.
- **Foundation vs. Most Good content:** every authenticated DGQI user gets the core workspace. Most Good features are enabled by server-managed Clerk `publicMetadata.dgqiPlan` set to `most-good`; other users see the upgrade card.
- **Regulatory Watch (live feed):** `lib/regulatory-feed.ts` automatically pulls and parses public RSS/Atom feeds (1-hour cache) for the **FDA** (press releases + food safety recalls), **CDC**, **CMS**, **Federal DHS**, and **The Joint Commission** — no manual updates needed for these. Impact (High/Medium/Low) is assigned by a keyword heuristic (e.g. "recall"/"warning letter" → High), which is an approximation, not a formal regulatory determination. **ISO does not publish a general public RSS feed**, and **State Departments of Health / State Boards of Pharmacy** are run independently per state with no single federal feed — add the specific ones you need via the `REGULATORY_EXTRA_FEEDS` env var (see `.env.example` for the JSON format), configured in `lib/regulatory-sources.ts`. If every live source fails, the dashboard and export routes automatically fall back to the sample data in `data/dashboard.json`.
- **Exports (Most Good + Foundation):** every dashboard view includes "Export Excel" (`/api/dashboard/export/excel`, built with `exceljs`, gated by Clerk authentication) and "Export PDF" (`/dashboard/report`, a print-optimized page — use the browser's Print → Save as PDF). Excel/PDF exports include Supplier Risk and Regulatory Watch sheets/sections only for Most Good members.
- **Management and Quarterly Business Review generators (all subscriptions):** `/dashboard/management-review` creates a meeting-ready quality-management review with current scorecards, corrective actions, decision fields, and a print-to-PDF action. `/dashboard/quarterly-business-review` creates an executive QBR with quality performance, priority commitments, supplier trend data, and next-quarter planning fields. Both routes require a signed-in Clerk member.
- **Legal consent (Privacy Policy & Terms):** the site links to `courses.demandgoodqa.com/pages/terms` and `/pages/privacy`. `/login` gates the Clerk sign-in/sign-up widget behind a required "I agree to the Terms and Privacy Policy" checkbox (`app/login/legal-gate.tsx`). `/checkout` requires the same checkbox before submitting, and `/api/checkout` rejects the request server-side (400) if `agreedToTerms` isn't `"yes"`, recording `terms_accepted_at` in the Stripe Checkout Session metadata as an audit trail. The site footer also links to both pages.
- **Work instructions:** `/dashboard/guide` is a protected, tier-aware, printable page (linked from the sidebar as "How to use") that walks any subscriber through sign-in, the Overview dashboard, both review generators, and (Most Good) the license vault and regulatory watch feed. `docs/WORK-INSTRUCTIONS.md` is a static copy of the same instructions suitable for onboarding emails or a printed binder — give it directly to paid users; the in-app page is the source of truth if it drifts.
- **Most Good License Vault:** `/dashboard/licenses` provides a protected company license/certification register, with 30-, 60-, or 90-day renewal alerts displayed in the dashboard and included in the Excel/PDF exports. Most Good members can opt in to email alerts. Email delivery uses Resend (`RESEND_API_KEY` and `LICENSE_ALERT_FROM`), and Vercel Cron calls `/api/cron/license-alerts` daily with `CRON_SECRET`; the job sends once per alert-state change and stores the sent digest in Clerk private metadata. Records are entered through `/dashboard/data` and stored in the shared organization data store.
- **Supabase setup:** create a Supabase project, run `supabase/schema.sql` in the SQL editor, then add `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Vercel Production. The service-role key is server-only and must never be exposed to the browser.
- **Where customers buy:** the single purchase point is `/checkout` on Demand Good QA (Stripe).
- `/api/checkout` creates Stripe-hosted subscription Checkout Sessions from the configured recurring price IDs, tagged with the plan and (when signed in) the Clerk email/user id as metadata. Keep the Stripe secret and webhook signing secret server-side.
- `/api/webhooks/stripe` receives Stripe subscription events and sets Clerk `publicMetadata.dgqiPlan` to the purchased plan.
- Clerk protects `/dashboard` and supplies the portal identity. Add the two Clerk keys from the Clerk dashboard to the host environment; never commit `.env.local`.
- `/api/auth/demo` and `/api/auth/logout` are retained only as local legacy routes and are not used for dashboard protection.

## Phase 2: integration wiring

The app connects Clerk (auth) and Stripe (billing):

1. Customer subscribes on Demand Good QA via Stripe Checkout (`/checkout`).
2. The Stripe webhook sets that member's Clerk plan to Foundation or Most Good.
3. Customer signs in with Clerk on `/login`.
4. `/dashboard` requires a signed-in Clerk user.
5. Most Good-only features are controlled by server-managed DGQI plan metadata.

## Validation

```bash
npm run build
```
