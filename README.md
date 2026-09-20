# Demand Good QA Intelligence

Minimal, Vercel-ready Next.js App Router MVP for a quality and regulatory intelligence product.

## Run locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

Visit `http://localhost:3000`, then use **Member login** to create or sign in to a Clerk account. The dashboard is protected by Clerk authentication; DGQI is the app workspace. Thinkific is used for course content and marketing referrals, not app access.

## Product boundaries

- The dashboard uses intentionally static mock data for the MVP.
- Dashboard data now lives in `data/dashboard.json` and is read through the validated server-side repository in `lib/dashboard-data.ts`. Replace that reader with a database or API query when the hosted intelligence data source is ready.
- **Foundation vs. Most Good content:** every authenticated DGQI user gets the core workspace. Most Good features are enabled by server-managed Clerk `publicMetadata.dgqiPlan` set to `most-good`; other users see the upgrade card. Thinkific is not required to sign in or open the app. Metrics/actions/digest/supplier-risk are still mock data in `data/dashboard.json`; replace those fields with real per-tier data sources as they come online.
- **Regulatory Watch (live feed):** `lib/regulatory-feed.ts` automatically pulls and parses public RSS/Atom feeds (1-hour cache) for the **FDA** (press releases + food safety recalls), **CDC**, **CMS**, **Federal DHS**, and **The Joint Commission** — no manual updates needed for these. Impact (High/Medium/Low) is assigned by a keyword heuristic (e.g. "recall"/"warning letter" → High), which is an approximation, not a formal regulatory determination. **ISO does not publish a general public RSS feed**, and **State Departments of Health / State Boards of Pharmacy** are run independently per state with no single federal feed — add the specific ones you need via the `REGULATORY_EXTRA_FEEDS` env var (see `.env.example` for the JSON format), configured in `lib/regulatory-sources.ts`. If every live source fails, the dashboard and export routes automatically fall back to the sample data in `data/dashboard.json`.
- **Exports (Most Good + Foundation):** every dashboard view includes "Export Excel" (`/api/dashboard/export/excel`, built with `exceljs`, gated by the same Clerk + Thinkific entitlement check as the dashboard) and "Export PDF" (`/dashboard/report`, a print-optimized page — use the browser's Print → Save as PDF). Excel/PDF exports include Supplier Risk and Regulatory Watch sheets/sections only for Most Good members.
- **Management and Quarterly Business Review generators (all subscriptions):** `/dashboard/management-review` creates a meeting-ready quality-management review with current scorecards, corrective actions, decision fields, and a print-to-PDF action. `/dashboard/quarterly-business-review` creates an executive QBR with quality performance, priority commitments, supplier trend data, and next-quarter planning fields. Both routes are protected by the same Clerk + active Thinkific entitlement check as the dashboard.
- **Legal consent (Privacy Policy & Terms):** the site links to your existing Thinkific-hosted `courses.demandgoodqa.com/pages/terms` and `/pages/privacy` as the single source of truth (no duplicated legal text to keep in sync). `/login` gates the Clerk sign-in/sign-up widget behind a required "I agree to the Terms and Privacy Policy" checkbox (`app/login/legal-gate.tsx`). `/checkout` requires the same checkbox before submitting, and `/api/checkout` rejects the request server-side (400) if `agreedToTerms` isn't `"yes"`, recording `terms_accepted_at` in the Stripe Checkout Session metadata as an audit trail. The site footer also links to both pages. Update the Thinkific pages any time your policies change — the app always points at the live URLs.
- **Work instructions:** `/dashboard/guide` is a protected, tier-aware, printable page (linked from the sidebar as "How to use") that walks any subscriber through sign-in, the Overview dashboard, both review generators, and (Most Good) the license vault and regulatory watch feed. `docs/WORK-INSTRUCTIONS.md` is a static copy of the same instructions suitable for onboarding emails or a printed binder — give it directly to paid users; the in-app page is the source of truth if it drifts.
- **Most Good License Vault:** `/dashboard/licenses` provides a protected company license/certification register, with 30-, 60-, or 90-day renewal alerts displayed in the dashboard and included in the Excel/PDF exports. Most Good members can opt in to email alerts. Email delivery uses Resend (`RESEND_API_KEY` and `LICENSE_ALERT_FROM`), and Vercel Cron calls `/api/cron/license-alerts` daily with `CRON_SECRET`; the job sends once per alert-state change and stores the sent digest in Clerk private metadata. This MVP still reads validated sample records from `data/dashboard.json`; durable tenant-scoped document storage is required before accepting actual certificate uploads.
- **Where customers buy:** the single purchase point is `/checkout` on Demand Good QA (Stripe). Thinkific is not an app login or subscription-access gate; it is used for course content and marketing.
- **Cross-linking from Thinkific:** `courses.demandgoodqa.com` (Thinkific) hosts your courses; the subscription/intelligence product is a separate site. To advertise the subscription on Thinkific, add a banner/button in Thinkific's site editor that links out to your DGQI domain, e.g.:
  - `https://<your-dgqi-domain>/#pricing` — homepage pricing section
  - `https://<your-dgqi-domain>/checkout?plan=foundation&utm_source=thinkific&utm_campaign=courses_banner` — deep-links straight to a plan's checkout, tagged so Stripe metadata records the Thinkific referral for conversion tracking
  Clicking either link takes the visitor to the DGQI site to complete the Stripe purchase and use the actual intelligence dashboard there — Thinkific never hosts the subscription checkout or the dashboard.
- `/api/checkout` creates Stripe-hosted subscription Checkout Sessions from the configured recurring price IDs, tagged with the plan and (when signed in) the Clerk email/user id as metadata. Keep the Stripe secret and webhook signing secret server-side.
- `/api/webhooks/stripe` receives Stripe subscription events. DGQI app access is controlled by Clerk authentication; plan metadata should be set server-side after a successful Stripe subscription before exposing paid-tier features.
- Thinkific remains the membership/course content platform and marketing channel. DGQI is the subscription checkout, login, and dashboard; customers should use **Member login** on DGQI and do not need a Thinkific SSO handoff to use the app.
- Clerk protects `/dashboard` and supplies the portal identity. Add the two Clerk keys from the Clerk dashboard to `.env.local` and Vercel; never commit `.env.local`.
- Thinkific course IDs and the Admin API are optional for the DGQI app. They are not used to decide whether a signed-in user may open the dashboard.
- `/api/auth/demo` and `/api/auth/logout` are retained only as local legacy routes and are not used for dashboard protection.
- `.env.example` documents the Clerk, Stripe, and Thinkific variables. Never commit `.env.local`.
- Thinkific Admin API calls are limited to documented public paths: `GET /users`, `POST /users`, `GET /enrollments`, and `POST /enrollments`. No Thinkific data is deleted or mutated outside of creating the user/enrollment needed to fulfill a paid Stripe subscription.

## Phase 2: integration wiring

The MVP connects Clerk (auth), Stripe (billing), and Thinkific (optional course content) into one purchase + one login:

1. Customer subscribes once on Demand Good QA via Stripe Checkout (`/checkout`).
2. The Stripe webhook automatically creates/enrolls that same email in the matching Thinkific membership — no second purchase on Thinkific.
3. Customer signs in once with Clerk on `/login`.
4. `/dashboard` checks that the user is authenticated with Clerk before showing the workspace.
5. Most Good-only features are controlled by server-managed DGQI plan metadata.

Fulfillment (steps 1–2) is create/enroll-only. The entitlement check (step 4) is read-only. Customers must use the same email address across Stripe, Clerk, and Thinkific for the whole flow to resolve automatically.

## Validation

```bash
npm run build
```
