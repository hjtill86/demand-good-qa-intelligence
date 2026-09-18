# Demand Good QA Intelligence

Minimal, Vercel-ready Next.js App Router MVP for a quality and regulatory intelligence product.

## Run locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

Visit `http://localhost:3000`, then use **Member login** to create or sign in to a Clerk account. The dashboard is protected by Clerk authentication; the Thinkific link remains a separate member-hub destination.

## Product boundaries

- The dashboard uses intentionally static mock data for the MVP.
- Dashboard data now lives in `data/dashboard.json` and is read through the validated server-side repository in `lib/dashboard-data.ts`. Replace that reader with a database or API query when the hosted intelligence data source is ready.
- **Foundation vs. Most Good content:** the dashboard is now tier-aware. Every member gets the quality score, quality trend, open actions, and weekly decision digest. Members on an active **Most Good** Thinkific enrollment additionally see a Supplier Risk Intelligence panel (per-vendor risk scoring/trend) and a live Regulatory Watch feed. Foundation-tier members instead see an "Unlock Most Good" upsell card linking to `/checkout?plan=most-good`. The tier is derived server-side from which Thinkific course id (`THINKIFIC_FOUNDATION_COURSE_ID` / `THINKIFIC_MOST_GOOD_COURSE_ID`) the customer's active enrollment matches — no separate plan database is needed. Metrics/actions/digest/supplier-risk are still mock data in `data/dashboard.json`; replace those fields with real per-tier data sources as they come online.
- **Regulatory Watch (live feed):** `lib/regulatory-feed.ts` automatically pulls and parses public RSS/Atom feeds (1-hour cache) for the **FDA** (press releases + food safety recalls), **CDC**, **CMS**, **Federal DHS**, and **The Joint Commission** — no manual updates needed for these. Impact (High/Medium/Low) is assigned by a keyword heuristic (e.g. "recall"/"warning letter" → High), which is an approximation, not a formal regulatory determination. **ISO does not publish a general public RSS feed**, and **State Departments of Health / State Boards of Pharmacy** are run independently per state with no single federal feed — add the specific ones you need via the `REGULATORY_EXTRA_FEEDS` env var (see `.env.example` for the JSON format), configured in `lib/regulatory-sources.ts`. If every live source fails, the dashboard and export routes automatically fall back to the sample data in `data/dashboard.json`.
- **Exports (Most Good + Foundation):** every dashboard view includes "Export Excel" (`/api/dashboard/export/excel`, built with `exceljs`, gated by the same Clerk + Thinkific entitlement check as the dashboard) and "Export PDF" (`/dashboard/report`, a print-optimized page — use the browser's Print → Save as PDF). Excel/PDF exports include Supplier Risk and Regulatory Watch sheets/sections only for Most Good members.
- **Where customers buy:** the single purchase point is `/checkout` on Demand Good QA (Stripe). There is no separate Thinkific purchase step for subscribers — paying for Foundation or Most Good automatically grants the matching Thinkific membership. Customers should not be sent to buy directly on Thinkific.
- **Cross-linking from Thinkific:** `courses.demandgoodqa.com` (Thinkific) hosts your courses; the subscription/intelligence product is a separate site. To advertise the subscription on Thinkific, add a banner/button in Thinkific's site editor that links out to your DGQI domain, e.g.:
  - `https://<your-dgqi-domain>/#pricing` — homepage pricing section
  - `https://<your-dgqi-domain>/checkout?plan=foundation&utm_source=thinkific&utm_campaign=courses_banner` — deep-links straight to a plan's checkout, tagged so Stripe metadata records the Thinkific referral for conversion tracking
  Clicking either link takes the visitor to the DGQI site to complete the Stripe purchase and use the actual intelligence dashboard there — Thinkific never hosts the subscription checkout or the dashboard.
- `/api/checkout` creates Stripe-hosted subscription Checkout Sessions from the configured recurring price IDs, tagged with the plan and (when signed in) the Clerk email/user id as metadata. Keep the Stripe secret and webhook signing secret server-side.
- `/api/webhooks/stripe` fulfills the purchase on `checkout.session.completed`: it reads the paid session's customer email and plan, maps the plan to a Thinkific course via `THINKIFIC_FOUNDATION_COURSE_ID` / `THINKIFIC_MOST_GOOD_COURSE_ID`, finds-or-creates the matching Thinkific user, and enrolls them — so the Stripe subscription is what unlocks Thinkific access, automatically.
- Thinkific is still the membership/course *content* platform and member-hub destination. `/api/auth/thinkific` performs a single-sign-on handoff: it reads the already-authenticated Clerk user's email/first/last name, signs a Thinkific JWT with that identity, and redirects to Thinkific. A customer who is signed in to Demand Good QA is not asked to log in again to reach the Thinkific member hub. If a visitor hits `/api/auth/thinkific` without a Clerk session, it redirects to `/login?redirect=/api/auth/thinkific` first.
- Clerk protects `/dashboard` and supplies the portal identity. Add the two Clerk keys from the Clerk dashboard to `.env.local` and Vercel; never commit `.env.local`.
- When `THINKIFIC_ADMIN_API_KEY` and `THINKIFIC_SUBDOMAIN` are configured, `/dashboard` verifies the Clerk user's email against Thinkific `/users` and `/enrollments` and requires an active, non-expired enrollment. Use the same email address in Clerk and Thinkific so the one-login flow (Stripe purchase → auto-enrollment → Clerk sign-in → dashboard, or Clerk sign-in → SSO handoff into Thinkific) works without a second manual purchase or login.
- `/api/auth/demo` and `/api/auth/logout` are retained only as local legacy routes and are not used for dashboard protection.
- `.env.example` documents the Clerk, Stripe, and Thinkific variables. Never commit `.env.local`.
- Thinkific Admin API calls are limited to documented public paths: `GET /users`, `POST /users`, `GET /enrollments`, and `POST /enrollments`. No Thinkific data is deleted or mutated outside of creating the user/enrollment needed to fulfill a paid Stripe subscription.

## Phase 2: integration wiring

The MVP connects Clerk (auth), Stripe (billing), and Thinkific (membership/course content) into one purchase + one login:

1. Customer subscribes once on Demand Good QA via Stripe Checkout (`/checkout`).
2. The Stripe webhook automatically creates/enrolls that same email in the matching Thinkific membership — no second purchase on Thinkific.
3. Customer signs in once with Clerk on `/login`.
4. `/dashboard` checks that Clerk email against Thinkific enrollment (server-side, read-only) before showing the workspace.
5. Clicking "Open Thinkific member hub" reuses the same Clerk identity to sign the customer into Thinkific via JWT SSO — no second login prompt.

Fulfillment (steps 1–2) is create/enroll-only. The entitlement check (step 4) is read-only. Customers must use the same email address across Stripe, Clerk, and Thinkific for the whole flow to resolve automatically.

## Validation

```bash
npm run build
```
